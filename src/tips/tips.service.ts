import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OwnerHubService } from '../owner-hub/owner-hub.service';
import { CreateTipDto } from './dto/create-tip.dto';

@Injectable()
export class TipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly ownerHub: OwnerHubService,
  ) {}

  async create(fanId: string, dto: CreateTipDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: dto.creatorId } });
    if (!creator) throw new NotFoundException('Creator non trovato');
    if (creator.userId === fanId) throw new BadRequestException('Non puoi tippare te stesso');

    const platformFeePercent = Number(this.config.get('PLATFORM_FEE_PERCENT') ?? 20);
    const platformFeeCents = Math.round((dto.amountCents * platformFeePercent) / 100);
    const creatorNetCents = dto.amountCents - platformFeeCents;

    const tip = await this.prisma.tip.create({
      data: {
        fanId,
        creatorId: creator.id,
        postId: dto.postId,
        messageId: dto.messageId,
        liveStreamId: dto.liveStreamId,
        amountCents: dto.amountCents,
        platformFeeCents,
        creatorNetCents,
        currency: creator.currency,
        note: dto.note,
      },
    });

    await this.notifications.create({
      userId: creator.userId,
      actorId: fanId,
      type: NotificationType.NEW_TIP,
      title: 'Nuova mancia ricevuta',
      body: `Hai ricevuto ${(dto.amountCents / 100).toFixed(2)} ${creator.currency.toUpperCase()}${dto.note ? ': ' + dto.note : ''}`,
      data: { tipId: tip.id, amountCents: dto.amountCents },
    });

    const amountEur = tip.amountCents / 100;
    const platformFeeEur = tip.platformFeeCents / 100;
    this.ownerHub.send([
      {
        externalId: `tip_${tip.id}`,
        type: 'TIP',
        occurredAt: tip.createdAt.toISOString(),
        userId: fanId,
        amountEur,
        currency: tip.currency.toUpperCase(),
      },
      {
        externalId: `owner_revenue_tip_${tip.id}`,
        type: 'OWNER_REVENUE',
        occurredAt: tip.createdAt.toISOString(),
        amountEur: platformFeeEur,
        currency: tip.currency.toUpperCase(),
      },
    ]);

    return tip;
  }

  async listForCreator(userId: string, cursor?: string, limit = 50) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return { items: [], nextCursor: null };
    const items = await this.prisma.tip.findMany({
      where: {
        creatorId: creator.id,
        createdAt: cursor ? { lt: new Date(cursor) } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { fan: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    const slice = items.slice(0, limit);
    const nextCursor = items.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;
    return { items: slice, nextCursor };
  }

  async leaderboard(creatorId: string, limit = 10) {
    return this.prisma.tip.groupBy({
      by: ['fanId'],
      where: { creatorId },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: 'desc' } },
      take: limit,
    });
  }
}
