import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RevolutService, CreatePaymentOrderDto } from './revolut.service';
import { InvoicingService } from '../invoicing/invoicing.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments/revolut')
export class RevolutController {
  constructor(
    private readonly revolut: RevolutService,
    private readonly invoicing: InvoicingService,
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
          await this.invoicing.generateInvoice({
            paymentId: payment.id,
            userId: user.id,
            userEmail: user.email,
            amount: order.amount / 100,
            currency: order.currency,
            description: order.description,
            date: new Date(order.created_at),
          });
        }
      }

      return { success: true, message: 'Payment confirmed and invoice generated' };
    }

    return { success: false, message: 'Payment not confirmed yet' };
  }
}