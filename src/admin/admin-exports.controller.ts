import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/exports')
export class AdminExportsController {
  constructor(private prisma: PrismaService) {}

  @Get('revenue-report')
  async exportRevenueReport(@Res() res: Response) {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'COMPLETED' as any },
      include: {
        creator: {
          include: {
            user: true
          }
        },
        fan: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const csv = [
      ['Date', 'Creator', 'Fan', 'Amount', 'Currency', 'Status'].join(','),
      ...payments.map(p =>
        [
          p.createdAt.toISOString(),
          p.creator?.user?.displayName || 'Unknown',
          p.fan?.email || 'Unknown',
          (p.amountCents / 100).toFixed(2),
          p.currency,
          p.status
        ].join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue-report.csv"');
    res.send(csv);
  }

  @Get('creator-earnings')
  async exportCreatorEarnings(@Res() res: Response) {
    const creators = await this.prisma.creatorProfile.findMany({
      include: { user: true }
    });

    const csv = [
      ['Creator', 'Email', 'Status', 'Created At'].join(','),
      ...creators.map(c =>
        [
          c.user?.displayName || 'Unknown',
          c.user?.email || 'Unknown',
          c.status,
          c.createdAt.toISOString()
        ].join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="creator-earnings.csv"');
    res.send(csv);
  }
}