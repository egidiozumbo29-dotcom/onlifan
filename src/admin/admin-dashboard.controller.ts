import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async getStats() {
    const totalRevenue = await this.prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amountCents: true }
    });

    const totalUsers = await this.prisma.user.count();
    const totalCreators = await this.prisma.creatorProfile.count();

    return {
      totalRevenue: {
        totalCents: totalRevenue._sum?.amountCents || 0,
        totalEur: (totalRevenue._sum?.amountCents || 0) / 100
      },
      totalUsers,
      totalCreators,
      timestamp: new Date()
    };
  }

  @Get('recent-payments')
  async getRecentPayments() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      include: { fan: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return payments.map(p => ({
      id: p.id,
      fanEmail: p.fan?.email || 'Unknown',
      fanName: p.fan?.displayName || 'Unknown',
      amount: p.amountCents / 100,
      currency: p.currency,
      createdAt: p.createdAt
    }));
  }

  @Get('top-creators')
  async getTopCreators() {
    const creators = await this.prisma.creatorProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return creators.map(c => ({
      id: c.id,
      displayName: c.user?.displayName || 'Unknown',
      email: c.user?.email || 'Unknown',
      status: c.status,
      createdAt: c.createdAt
    }));
  }
}