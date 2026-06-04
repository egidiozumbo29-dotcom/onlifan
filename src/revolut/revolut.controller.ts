import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { RevolutService, CreatePaymentOrderDto } from './revolut.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments/revolut')
@UseGuards(JwtAuthGuard)
export class RevolutController {
  constructor(
    private readonly revolut: RevolutService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create-order')
  async createPaymentOrder(@Body() dto: CreatePaymentOrderDto) {
    const order = await this.revolut.createPaymentOrder(dto);
    return {
      success: true,
      orderId: order.id,
      checkoutUrl: order.checkout_url,
    };
  }

  @Get('confirm')
  async confirmPayment(@Query('orderId') orderId: string) {
    const isConfirmed = await this.revolut.confirmPayment(orderId);

    if (isConfirmed) {
      // Genera fattura automatica
      const order = await this.revolut.getPaymentOrder(orderId);

      // Cerca il pagamento nel database
      const payment = await this.prisma.payment.findFirst({
        where: { stripePaymentId: orderId },
      });

      if (payment && payment.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: payment.userId },
        });

        if (user) {
          // TODO: Implementare generazione fattura quando InvoicingModule è riattivato
          console.log(`Invoice generation for payment ${payment.id} - disabled temporarily`);
        }
      }

      return { success: true, message: 'Payment confirmed' };
    }

    return { success: false, message: 'Payment not confirmed yet' };
  }
}