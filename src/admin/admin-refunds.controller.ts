import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/refunds')
@UseGuards(JwtAuthGuard)
export class AdminRefundsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getRefunds(@Query('status') status?: string) {
    const where = status ? { status: status as any } : {};

    const refunds = await this.prisma.refund.findMany({
      where,
      include: {
        payment: {
          include: {
            fan: {
              select: { email: true, displayName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      refunds: refunds.map(r => ({
        id: r.id,
        paymentId: r.paymentId,
        amountCents: r.amountCents,
        currency: r.currency,
        reason: r.reason,
        status: r.status,
        fanEmail: r.payment.fan.email,
        fanName: r.payment.fan.displayName,
        createdAt: r.createdAt,
      })),
    };
  }

  @Post('create')
  async createRefund(@Body() body: { paymentId: string; amountCents: number; reason: string }) {
    const refund = await this.prisma.refund.create({
      data: {
        paymentId: body.paymentId,
        amountCents: body.amountCents,
        currency: 'EUR',
        reason: body.reason,
        status: 'PENDING',
      },
    });

    return { success: true, refundId: refund.id };
  }

  @Patch(':id/approve')
  async approveRefund(@Param('id') id: string) {
    await this.prisma.refund.update({
      where: { id },
      data: { status: 'SUCCEEDED' },
    });

    return { success: true, refundId: id, status: 'SUCCEEDED' };
  }

  @Patch(':id/reject')
  async rejectRefund(@Param('id') id: string, @Body() body: { reason: string }) {
    await this.prisma.refund.update({
      where: { id },
      data: { 
        status: 'FAILED',
        reason: body.reason,
      },
    });

    return { success: true, refundId: id, status: 'FAILED', reason: body.reason };
  }
}