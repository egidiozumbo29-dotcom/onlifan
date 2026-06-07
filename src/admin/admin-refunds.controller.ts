import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/refunds')
@UseGuards(JwtAuthGuard)
export class AdminRefundsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getRefunds(@Query('status') status?: string) {
    const refunds = await this.prisma.refund.findMany({
      include: { payment: { include: { fan: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return refunds.map(r => ({
      id: r.id,
      paymentId: r.paymentId,
      amount: r.amountCents / 100,
      currency: r.currency,
      reason: r.reason,
      status: r.status,
      fanEmail: r.payment?.fan?.email || 'Unknown',
      createdAt: r.createdAt
    }));
  }

  @Post()
  async createRefund(@Body() body: { paymentId: string; amountCents: number; currency: string; reason: string }) {
    const refund = await this.prisma.refund.create({
      data: {
        paymentId: body.paymentId,
        amountCents: body.amountCents,
        currency: body.currency,
        reason: body.reason,
        status: 'PENDING',
        stripeRefundId: 'temp-' + Date.now() // Placeholder
      }
    });

    return refund;
  }

  @Post(':id/approve')
  async approveRefund(@Param('id') id: string) {
    const refund = await this.prisma.refund.update({
      where: { id },
      data: { status: 'SUCCEEDED' }
    });

    return refund;
  }

  @Post(':id/reject')
  async rejectRefund(@Param('id') id: string) {
    const refund = await this.prisma.refund.update({
      where: { id },
      data: { status: 'FAILED' }
    });

    return refund;
  }
}