import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  async getOverview() {
    const [
      totalUsers,
      totalCreators,
      activeCreators,
      totalRevenue,
      totalPayouts,
      pendingPayouts,
      recentPayments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.creatorProfile.count(),
      this.prisma.creatorProfile.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountCents: true },
      }),
      this.prisma.payout.count(),
      this.prisma.payout.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          fan: {
            select: { email: true, displayName: true },
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        creators: totalCreators,
        activeCreators,
      },
      revenue: {
        totalCents: totalRevenue._sum.amountCents || 0,
        totalEur: (totalRevenue._sum.amountCents || 0) / 100,
      },
      payouts: {
        total: totalPayouts,
        pending: pendingPayouts,
      },
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        fanEmail: p.fan.email,
        fanName: p.fan.displayName,
      })),
    };
  }

  @Get('creators')
  async getCreators(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (page - 1) * limit;

    const [creators, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({
        skip,
        take: Number(limit),
        include: {
          user: {
            select: { email: true, displayName: true },
          },
          _count: {
            select: { subscribers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creatorProfile.count(),
    ]);

    return {
      creators: creators.map(c => ({
        id: c.id,
        username: c.username,
        displayName: c.user.displayName,
        email: c.user.email,
        status: c.status,
        subscriptionPriceCents: c.subscriptionPriceCents,
        subscriberCount: c._count.subscribers,
        createdAt: c.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('creators/:id/earnings')
  async getCreatorEarnings(@Query('creatorId') creatorId: string) {
    const earnings = await this.prisma.creatorEarning.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalGross = earnings.reduce((sum, e) => sum + e.grossCents, 0);
    const totalPlatformFee = earnings.reduce((sum, e) => sum + e.platformFeeCents, 0);
    const totalNet = earnings.reduce((sum, e) => sum + e.netCents, 0);

    return {
      earnings: earnings.map(e => ({
        id: e.id,
        grossCents: e.grossCents,
        platformFeeCents: e.platformFeeCents,
        netCents: e.netCents,
        currency: e.currency,
        status: e.status,
        availableAt: e.availableAt,
        createdAt: e.createdAt,
      })),
      summary: {
        totalGrossCents: totalGross,
        totalPlatformFeeCents: totalPlatformFee,
        totalNetCents: totalNet,
        totalGrossEur: totalGross / 100,
        totalNetEur: totalNet / 100,
      },
    };
  }

  @Get('payouts')
  async getPayouts(@Query('status') status?: string) {
    const where = status ? { status: status as any } : {};

    const payouts = await this.prisma.payout.findMany({
      where,
      include: {
        creator: {
          include: {
            user: {
              select: { email: true, displayName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      payouts: payouts.map(p => ({
        id: p.id,
        creatorId: p.creatorId,
        creatorName: p.creator.user.displayName,
        creatorEmail: p.creator.user.email,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        scheduledFor: p.scheduledFor,
        arrivalDate: p.arrivalDate,
        createdAt: p.createdAt,
      })),
    };
  }

  @Get('users')
  async getUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
        createdAt: u.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}