import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/exports')
@UseGuards(JwtAuthGuard)
export class AdminExportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('financial-report')
  async getFinancialReport(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [payments, payouts, refunds] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refund.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      period: { startDate, endDate },
      payments: {
        total: payments.length,
        totalCents: payments.reduce((sum, p) => sum + p.amountCents, 0),
        totalEur: payments.reduce((sum, p) => sum + p.amountCents, 0) / 100,
        details: payments.map(p => ({
          id: p.id,
          amountCents: p.amountCents,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt,
        })),
      },
      payouts: {
        total: payouts.length,
        totalCents: payouts.reduce((sum, p) => sum + p.amountCents, 0),
        totalEur: payouts.reduce((sum, p) => sum + p.amountCents, 0) / 100,
        details: payouts.map(p => ({
          id: p.id,
          amountCents: p.amountCents,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt,
        })),
      },
      refunds: {
        total: refunds.length,
        totalCents: refunds.reduce((sum, r) => sum + r.amountCents, 0),
        totalEur: refunds.reduce((sum, r) => sum + r.amountCents, 0) / 100,
        details: refunds.map(r => ({
          id: r.id,
          amountCents: r.amountCents,
          currency: r.currency,
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
    };
  }

  @Get('creator-earnings')
  async getCreatorEarningsReport(@Query('creatorId') creatorId: string) {
    const earnings = await this.prisma.creatorEarning.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      creatorId,
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
        totalGrossCents: earnings.reduce((sum, e) => sum + e.grossCents, 0),
        totalPlatformFeeCents: earnings.reduce((sum, e) => sum + e.platformFeeCents, 0),
        totalNetCents: earnings.reduce((sum, e) => sum + e.netCents, 0),
        totalGrossEur: earnings.reduce((sum, e) => sum + e.grossCents, 0) / 100,
        totalNetEur: earnings.reduce((sum, e) => sum + e.netCents, 0) / 100,
      },
    };
  }
}