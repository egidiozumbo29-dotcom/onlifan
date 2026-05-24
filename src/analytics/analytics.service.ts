import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(event: {
    creatorId?: string;
    userId?: string;
    event: string;
    entityType?: string;
    entityId?: string;
    amountCents?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.analyticsEvent.create({
      data: {
        ...event,
        metadata: event.metadata as object | undefined,
      },
    });
  }

  async creatorOverview(userId: string, days = 30) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return null;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [activeSubs, newSubsAll, totalRevenue, tipsTotal, ppvTotal, postCount, follower] =
      await Promise.all([
        this.prisma.subscription.count({
          where: { creatorId: creator.id, status: { in: ['ACTIVE', 'TRIALING'] } },
        }),
        this.prisma.subscription.count({
          where: { creatorId: creator.id, createdAt: { gte: since } },
        }),
        this.prisma.payment.aggregate({
          where: { creatorId: creator.id, status: 'SUCCEEDED', createdAt: { gte: since } },
          _sum: { creatorNetCents: true },
        }),
        this.prisma.tip.aggregate({
          where: { creatorId: creator.id, createdAt: { gte: since } },
          _sum: { creatorNetCents: true, amountCents: true },
          _count: true,
        }),
        this.prisma.messagePurchase.aggregate({
          where: {
            message: { conversation: { creatorId: creator.id } },
            createdAt: { gte: since },
          },
          _sum: { creatorNetCents: true },
          _count: true,
        }),
        this.prisma.post.count({ where: { creatorId: creator.id, createdAt: { gte: since } } }),
        this.prisma.follow.count({ where: { followingId: creator.userId } }),
      ]);

    return {
      windowDays: days,
      activeSubscribers: activeSubs,
      newSubscribers: newSubsAll,
      totalRevenueCents: totalRevenue._sum.creatorNetCents ?? 0,
      tips: {
        count: tipsTotal._count,
        netCents: tipsTotal._sum.creatorNetCents ?? 0,
        grossCents: tipsTotal._sum.amountCents ?? 0,
      },
      ppv: {
        count: ppvTotal._count,
        netCents: ppvTotal._sum.creatorNetCents ?? 0,
      },
      postCount,
      followers: follower,
    };
  }

  async revenueTimeseries(userId: string, days = 30) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<Array<{ day: Date; total: bigint }>>`
      SELECT date_trunc('day', "created_at") AS day, SUM("creator_net_cents") AS total
      FROM "payments"
      WHERE "creator_id" = ${creator.id}::uuid
        AND "status" = 'SUCCEEDED'
        AND "created_at" >= ${since}
      GROUP BY 1 ORDER BY 1 ASC
    `;
    return rows.map((r) => ({ day: r.day, totalCents: Number(r.total ?? 0) }));
  }
}
