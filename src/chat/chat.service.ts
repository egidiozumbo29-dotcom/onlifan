import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationStatus,
  MessageType,
  NotificationType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { MassDmAudience, MassDmDto } from './dto/mass-dm.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- Conversations ----------

  async startConversation(userId: string, dto: StartConversationDto) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: dto.creatorId },
    });
    if (!creator) throw new NotFoundException('Creator non trovato');

    if (creator.userId === userId) {
      throw new BadRequestException('Non puoi messaggiare te stesso');
    }

    await this.assertNotBlocked(userId, creator.userId);

    const existing = await this.prisma.conversation.findUnique({
      where: { fanId_creatorId: { fanId: userId, creatorId: creator.id } },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { fanId: userId, creatorId: creator.id },
    });
  }

  async listMyConversations(userId: string, role: 'fan' | 'creator') {
    if (role === 'creator') {
      const creator = await this.prisma.creatorProfile.findUnique({
        where: { userId },
      });
      if (!creator) return [];
      return this.prisma.conversation.findMany({
        where: { creatorId: creator.id, creatorArchivedAt: null },
        orderBy: [{ creatorPinned: 'desc' }, { lastMessageAt: 'desc' }],
        include: {
          fan: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        take: 100,
      });
    }

    return this.prisma.conversation.findMany({
      where: { fanId: userId, fanArchivedAt: null },
      orderBy: [{ fanPinned: 'desc' }, { lastMessageAt: 'desc' }],
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bannerUrl: true,
            user: { select: { avatarUrl: true } },
          },
        },
      },
      take: 100,
    });
  }

  // ---------- Messages ----------

  async sendMessage(userId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: { creator: true },
    });
    if (!conversation) throw new NotFoundException('Conversazione non trovata');

    const isCreator = conversation.creator.userId === userId;
    const isFan = conversation.fanId === userId;
    if (!isCreator && !isFan) throw new ForbiddenException('Non autorizzato');
    if (conversation.status === ConversationStatus.BLOCKED) {
      throw new ForbiddenException('Conversazione bloccata');
    }

    const otherUserId = isCreator ? conversation.fanId : conversation.creator.userId;
    await this.assertNotBlocked(userId, otherUserId);

    const isPpv = !!dto.priceCents && dto.priceCents > 0;
    if (isPpv && !isCreator) {
      throw new ForbiddenException('Solo i creator possono inviare messaggi PPV');
    }

    const type: MessageType =
      dto.type ?? (isPpv ? MessageType.PPV : dto.mediaIds?.length ? MessageType.MEDIA : MessageType.TEXT);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: userId,
          type,
          body: dto.body,
          priceCents: isPpv ? dto.priceCents : null,
          currency: isPpv ? conversation.creator.currency : null,
          isVanishing: dto.isVanishing ?? false,
          replyToId: dto.replyToId,
          media: dto.mediaIds?.length
            ? {
                create: dto.mediaIds.map((mediaId, idx) => ({ mediaId, sortOrder: idx })),
              }
            : undefined,
        },
        include: { media: { include: { media: true }, orderBy: { sortOrder: 'asc' } } },
      });

      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: {
          lastMessageAt: created.createdAt,
          lastMessagePreview: this.previewOf(created.body, type),
          fanUnreadCount: isCreator
            ? { increment: 1 }
            : conversation.fanUnreadCount,
          creatorUnreadCount: isFan
            ? { increment: 1 }
            : conversation.creatorUnreadCount,
        },
      });

      return created;
    });

    // Notify the other side
    await this.notifications.create({
      userId: otherUserId,
      actorId: userId,
      type: NotificationType.NEW_MESSAGE,
      title: isCreator ? 'Nuovo messaggio dal creator' : 'Nuovo messaggio',
      body: this.previewOf(dto.body ?? '', type) ?? null,
      data: { conversationId: dto.conversationId, messageId: message.id },
    });

    return message;
  }

  async listMessages(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = 50,
  ) {
    const conv = await this.assertParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: cursor ? { lt: new Date(cursor) } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
        purchases: { where: { buyerId: userId } },
        reactions: true,
      },
    });

    const items = messages.slice(0, limit);
    const nextCursor =
      messages.length > limit ? items[items.length - 1]?.createdAt.toISOString() ?? null : null;

    const decorated = items.map((m) => this.decorate(m, userId, conv));
    return { items: decorated, nextCursor };
  }

  async markRead(userId: string, conversationId: string) {
    const conv = await this.assertParticipant(userId, conversationId);
    const isCreator = conv.creator.userId === userId;

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isCreator ? { creatorUnreadCount: 0 } : { fanUnreadCount: 0 },
    });

    const unreadMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        reads: { none: { userId } },
      },
      select: { id: true },
      take: 500,
    });

    if (unreadMessages.length) {
      await this.prisma.messageRead.createMany({
        data: unreadMessages.map((m) => ({ messageId: m.id, userId })),
        skipDuplicates: true,
      });
    }

    return { read: unreadMessages.length };
  }

  async unlockPpv(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { creator: true } } },
    });
    if (!message || message.type !== MessageType.PPV) {
      throw new NotFoundException('Messaggio PPV non trovato');
    }
    if (!message.priceCents) throw new BadRequestException('Prezzo non valido');

    if (message.senderId === userId) {
      throw new BadRequestException('Non puoi acquistare il tuo stesso messaggio');
    }

    const existing = await this.prisma.messagePurchase.findUnique({
      where: { messageId_buyerId: { messageId, buyerId: userId } },
    });
    if (existing) return { alreadyOwned: true, purchase: existing };

    const platformFeePercent = Number(this.config.get('PLATFORM_FEE_PERCENT') ?? 20);
    const platformFeeCents = Math.round((message.priceCents * platformFeePercent) / 100);
    const creatorNetCents = message.priceCents - platformFeeCents;
    const currency = message.currency ?? message.conversation.creator.currency;

    const purchase = await this.prisma.messagePurchase.create({
      data: {
        messageId,
        buyerId: userId,
        amountCents: message.priceCents,
        platformFeeCents,
        creatorNetCents,
        currency,
      },
    });

    await this.notifications.create({
      userId: message.senderId,
      actorId: userId,
      type: NotificationType.PPV_PURCHASED,
      title: 'PPV acquistato',
      body: `Il tuo messaggio è stato acquistato a ${(message.priceCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
      data: { messageId, amountCents: message.priceCents },
    });

    return { alreadyOwned: false, purchase };
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException();
    if (message.senderId !== userId) throw new ForbiddenException();

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), body: null },
    });
    return { success: true };
  }

  async react(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { creator: true } } },
    });
    if (!message) throw new NotFoundException();
    if (
      message.conversation.fanId !== userId &&
      message.conversation.creator.userId !== userId
    ) {
      throw new ForbiddenException();
    }

    return this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      update: {},
      create: { messageId, userId, emoji },
    });
  }

  // ---------- Mass DM ----------

  async sendMassDm(userId: string, dto: MassDmDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Solo i creator possono inviare mass DM');

    let recipientFanIds: string[] = [];
    switch (dto.audience) {
      case MassDmAudience.ALL_SUBSCRIBERS:
      case MassDmAudience.ACTIVE_SUBSCRIBERS:
        recipientFanIds = (
          await this.prisma.subscription.findMany({
            where: {
              creatorId: creator.id,
              status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
            },
            select: { fanId: true },
          })
        ).map((s) => s.fanId);
        break;
      case MassDmAudience.EXPIRED_SUBSCRIBERS:
        recipientFanIds = (
          await this.prisma.subscription.findMany({
            where: {
              creatorId: creator.id,
              status: { in: [SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED] },
            },
            select: { fanId: true },
          })
        ).map((s) => s.fanId);
        break;
      case MassDmAudience.FOLLOWERS:
        recipientFanIds = (
          await this.prisma.follow.findMany({
            where: { followingId: userId },
            select: { followerId: true },
          })
        ).map((f) => f.followerId);
        break;
    }

    let sent = 0;
    for (const fanId of recipientFanIds) {
      try {
        const conv = await this.prisma.conversation.upsert({
          where: { fanId_creatorId: { fanId, creatorId: creator.id } },
          update: {},
          create: { fanId, creatorId: creator.id },
        });
        await this.sendMessage(userId, {
          conversationId: conv.id,
          body: dto.body,
          priceCents: dto.priceCents,
          mediaIds: dto.mediaIds,
          isVanishing: dto.isVanishing,
        });
        sent++;
      } catch {
        // continue
      }
    }
    return { recipients: recipientFanIds.length, sent };
  }

  // ---------- Helpers ----------

  private async assertParticipant(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { creator: true },
    });
    if (!conv) throw new NotFoundException();
    if (conv.fanId !== userId && conv.creator.userId !== userId) {
      throw new ForbiddenException();
    }
    return conv;
  }

  private async assertNotBlocked(a: string, b: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    if (block) throw new ForbiddenException('Utente bloccato');
  }

  private previewOf(body: string | null | undefined, type: MessageType): string | null {
    if (type === MessageType.PPV) return '🔒 Contenuto PPV';
    if (type === MessageType.MEDIA) return '📎 Allegato';
    if (type === MessageType.TIP) return '💸 Tip';
    if (!body) return null;
    return body.length > 120 ? body.slice(0, 117) + '...' : body;
  }

  private decorate(
    m: Prisma.MessageGetPayload<{
      include: {
        media: { include: { media: true } };
        purchases: true;
        reactions: true;
      };
    }>,
    userId: string,
    conv: Prisma.ConversationGetPayload<{ include: { creator: true } }>,
  ) {
    const isOwner = m.senderId === userId;
    const isLockedPpv = m.type === MessageType.PPV && !isOwner && m.purchases.length === 0;

    if (isLockedPpv) {
      return {
        ...m,
        body: m.body ? '🔒 Sblocca per leggere' : null,
        media: m.media.map((pm) => ({
          ...pm,
          media: { ...pm.media, objectKey: null, processedObjectKey: null, thumbnailObjectKey: null },
        })),
        locked: true,
      };
    }
    return { ...m, locked: false };
  }
}
