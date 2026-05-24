import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LiveStreamStatus, NotificationType, SubscriptionStatus } from '@prisma/client';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateStreamDto {
  title: string;
  description?: string;
  isPrivate?: boolean;
  priceCents?: number;
  scheduledFor?: string;
}

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateStreamDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();
    return this.prisma.liveStream.create({
      data: {
        creatorId: creator.id,
        title: dto.title,
        description: dto.description,
        isPrivate: dto.isPrivate ?? false,
        priceCents: dto.priceCents,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        roomName: `live-${randomUUID()}`,
        status: dto.scheduledFor ? LiveStreamStatus.SCHEDULED : LiveStreamStatus.LIVE,
        startedAt: dto.scheduledFor ? null : new Date(),
      },
    });
  }

  async start(userId: string, streamId: string) {
    const stream = await this.assertOwner(userId, streamId);
    const updated = await this.prisma.liveStream.update({
      where: { id: streamId },
      data: { status: LiveStreamStatus.LIVE, startedAt: new Date() },
    });

    // Notify all subscribers
    const subs = await this.prisma.subscription.findMany({
      where: {
        creatorId: stream.creatorId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      select: { fanId: true },
    });
    await Promise.all(
      subs.map((s) =>
        this.notifications.create({
          userId: s.fanId,
          type: NotificationType.LIVE_STARTED,
          title: 'Live in corso',
          body: stream.title,
          data: { streamId },
        }),
      ),
    );

    return updated;
  }

  async end(userId: string, streamId: string) {
    await this.assertOwner(userId, streamId);
    return this.prisma.liveStream.update({
      where: { id: streamId },
      data: { status: LiveStreamStatus.ENDED, endedAt: new Date() },
    });
  }

  async getViewerToken(userId: string, streamId: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: streamId },
      include: { creator: true },
    });
    if (!stream) throw new NotFoundException();
    if (stream.status !== LiveStreamStatus.LIVE) throw new ForbiddenException('Stream non attivo');

    // Access check: subscribers + paid private stream
    if (stream.isPrivate) {
      const sub = await this.prisma.subscription.findUnique({
        where: { fanId_creatorId: { fanId: userId, creatorId: stream.creatorId } },
      });
      const activeStatuses: SubscriptionStatus[] = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
      ];
      const active =
        !!sub && activeStatuses.includes(sub.status) && sub.currentPeriodEnd > new Date();
      if (!active) throw new ForbiddenException('Stream privato: serve abbonamento');
    }

    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      this.logger.warn('LiveKit not configured');
      return { token: null, url: null, roomName: stream.roomName, configured: false };
    }

    const token = new AccessToken(apiKey, apiSecret, { identity: userId, ttl: 60 * 60 });
    token.addGrant({
      room: stream.roomName,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
    });

    await this.prisma.liveStreamViewer.upsert({
      where: { streamId_userId: { streamId, userId } },
      update: { joinedAt: new Date(), leftAt: null },
      create: { streamId, userId },
    });

    return { token: await token.toJwt(), url: livekitUrl, roomName: stream.roomName, configured: true };
  }

  async getCreatorToken(userId: string, streamId: string) {
    const stream = await this.assertOwner(userId, streamId);
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      return { token: null, url: null, roomName: stream.roomName, configured: false };
    }

    const token = new AccessToken(apiKey, apiSecret, { identity: userId, ttl: 4 * 60 * 60 });
    token.addGrant({
      room: stream.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    return { token: await token.toJwt(), url: livekitUrl, roomName: stream.roomName, configured: true };
  }

  async listLive(limit = 20) {
    return this.prisma.liveStream.findMany({
      where: { status: LiveStreamStatus.LIVE },
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: { creator: { select: { username: true, displayName: true, bannerUrl: true } } },
    });
  }

  private async assertOwner(userId: string, streamId: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: streamId },
      include: { creator: true },
    });
    if (!stream) throw new NotFoundException();
    if (stream.creator.userId !== userId) throw new ForbiddenException();
    return stream;
  }
}
