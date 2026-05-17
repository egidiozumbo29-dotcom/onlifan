import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('connect/onboarding-link')
  createOnboardingLink(@CurrentUser() user: { id: string }) {
    return this.paymentsService.createConnectOnboardingLink(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('connect/status')
  connectStatus(@CurrentUser() user: { id: string }) {
    return this.paymentsService.getConnectStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions/checkout')
  createSubscriptionCheckout(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.paymentsService.createSubscriptionCheckout(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creator/earnings')
  creatorEarnings(@CurrentUser() user: { id: string }) {
    return this.paymentsService.getCreatorEarnings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creator/ledger')
  creatorLedger(@CurrentUser() user: { id: string }) {
    return this.paymentsService.getCreatorLedger(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refunds')
  createRefund(@Body() dto: CreateRefundDto) {
    return this.paymentsService.createRefund(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payouts/schedule')
  schedulePayouts() {
    return this.paymentsService.scheduleCreatorPayouts();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':paymentId')
  findPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.findPayment(paymentId);
  }

  @Post('stripe/webhook')
  stripeWebhook(@Req() request: Request, @Headers('stripe-signature') signature?: string) {
    return this.paymentsService.handleStripeWebhook(request.body, signature);
  }
}
