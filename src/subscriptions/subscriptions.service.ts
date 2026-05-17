import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatorStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createCheckout(fanId: string, creatorId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: creatorId } });

    if (!creator || creator.status !== CreatorStatus.ACTIVE) {
      throw new NotFoundException('Creator non disponibile');
    }

    return {
      message: 'Qui verrà creata una Stripe Checkout Session',
      fanId,
      creatorId,
      amountCents: creator.subscriptionPriceCents,
      currency: creator.currency,
    };
  }

  async hasActiveAccess(fanId: string, creatorId: string) {
    const cacheKey = `subscription_access:${fanId}:${creatorId}`;
    const cached = await this.redis.client.get(cacheKey);

    if (cached === 'true') {
      return { hasAccess: true, source: 'cache' };
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { fanId_creatorId: { fanId, creatorId } },
    });

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ];
    const hasAccess = Boolean(
      subscription &&
      activeStatuses.includes(subscription.status) &&
      subscription.currentPeriodEnd > new Date(),
    );

    if (hasAccess) {
      await this.redis.client.set(cacheKey, 'true', 'EX', 900);
    }

    return { hasAccess, source: 'database' };
  }
}
