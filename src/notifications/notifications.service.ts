import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

export interface CreateNotificationInput {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data,
      },
    });

    // Fire-and-forget push
    this.push
      .sendToUser(input.userId, { title: input.title, body: input.body ?? '', data: input.data })
      .catch((e) => this.logger.warn(`Push failed: ${(e as Error).message}`));

    return notification;
  }

  async list(userId: string, cursor?: string, limit = 30) {
    const items = await this.prisma.notification.findMany({
      where: { userId, createdAt: cursor ? { lt: new Date(cursor) } : undefined },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { actor: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    const slice = items.slice(0, limit);
    const nextCursor =
      items.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;
    return { items: slice, nextCursor };
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, ids: string[]) {
    if (!ids.length) {
      await this.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return { success: true };
    }
    await this.prisma.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
