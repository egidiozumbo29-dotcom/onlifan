import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreatorStatus,
  EarningStatus,
  LedgerDirection,
  LedgerEntryType,
  PaymentStatus,
  PayoutStatus,
  RefundStatus,
  SubscriptionStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerHubService } from '../owner-hub/owner-hub.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreateSubscriptionCheckoutDto } from './dto/create-subscription-checkout.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stripe: StripeService,
    private readonly ownerHub: OwnerHubService,
  ) {}

  async createConnectOnboardingLink(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Profilo creator non trovato');
    }

    return {
      message: 'Qui verrà creato account/link onboarding Stripe Connect Express',
      creatorId: creator.id,
      stripeAccountId: creator.stripeAccountId,
    };
  }

  async getConnectStatus(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Profilo creator non trovato');
    }

    return {
      stripeAccountId: creator.stripeAccountId,
      onboardingComplete: creator.stripeOnboardingComplete,
      payoutsEnabled: creator.payoutsEnabled,
      chargesEnabled: creator.chargesEnabled,
    };
  }

  async createSubscriptionCheckout(fanId: string, dto: CreateSubscriptionCheckoutDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: dto.creatorId } });

    if (!creator || creator.status !== CreatorStatus.ACTIVE) {
      throw new NotFoundException('Creator non disponibile per abbonamenti');
    }

    if (!creator.chargesEnabled || !creator.stripeAccountId) {
      throw new ForbiddenException('Creator non ancora abilitato ai pagamenti');
    }

    const platformFeePercent = Number(this.config.get<string>('STRIPE_PLATFORM_FEE_PERCENT') ?? 20);
    const platformFeeCents = Math.round(
      (creator.subscriptionPriceCents * platformFeePercent) / 100,
    );
    const creatorNetCents = creator.subscriptionPriceCents - platformFeeCents;

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const apiUrl = this.config.get<string>('API_URL') ?? 'http://localhost:4000';

    const session = await this.stripe.client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        creator.stripePriceId
          ? {
              price: creator.stripePriceId,
              quantity: 1,
            }
          : {
              price_data: {
                currency: creator.currency,
                product_data: {
                  name: `${creator.displayName} monthly subscription`,
                  metadata: {
                    creatorId: creator.id,
                  },
                },
                unit_amount: creator.subscriptionPriceCents,
                recurring: { interval: 'month' },
              },
              quantity: 1,
            },
      ],
      subscription_data: {
        application_fee_percent: platformFeePercent,
        transfer_data: {
          destination: creator.stripeAccountId,
        },
        metadata: {
          fanId,
          creatorId: creator.id,
        },
      },
      metadata: {
        fanId,
        creatorId: creator.id,
        platformFeeCents: String(platformFeeCents),
        creatorNetCents: String(creatorNetCents),
      },
      success_url: `${appUrl}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/creator/${creator.username}?checkout=cancelled`,
    });

    return {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      webhookUrl: `${apiUrl}/payments/stripe/webhook`,
      amountCents: creator.subscriptionPriceCents,
      platformFeeCents,
      creatorNetCents,
      currency: creator.currency,
    };
  }

  async findPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: true,
        earnings: true,
        refunds: true,
        chargebacks: true,
        ledgerEntries: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento non trovato');
    }

    return payment;
  }

  async getCreatorEarnings(userId: string) {
    const creator = await this.getCreatorByUserId(userId);

    return this.prisma.creatorEarning.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { payment: true, payout: true },
    });
  }

  async getCreatorLedger(userId: string) {
    const creator = await this.getCreatorByUserId(userId);

    return this.prisma.ledgerEntry.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createRefund(dto: CreateRefundDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id: dto.paymentId } });

    if (!payment) {
      throw new NotFoundException('Pagamento non trovato');
    }

    return {
      message:
        'Qui verrà chiamata Stripe Refund API. Il database va aggiornato dal webhook charge.refunded.',
      paymentId: dto.paymentId,
      amountCents: dto.amountCents,
      reason: dto.reason,
      expectedWebhook: 'charge.refunded',
    };
  }

  async scheduleCreatorPayouts() {
    const availableEarnings = await this.prisma.creatorEarning.groupBy({
      by: ['creatorId', 'currency'],
      where: {
        status: EarningStatus.AVAILABLE,
        availableAt: { lte: new Date() },
      },
      _sum: { netCents: true },
    });

    const batches = availableEarnings.map((earning) => ({
      creatorId: earning.creatorId,
      currency: earning.currency,
      amountCents: earning._sum.netCents ?? 0,
      status: PayoutStatus.SCHEDULED,
    }));

    batches.forEach((batch) => {
      this.ownerHub.send({
        externalId: `payout_requested_creator_${batch.creatorId}_${Date.now()}`,
        type: 'PAYOUT_REQUESTED',
        occurredAt: new Date().toISOString(),
        userId: batch.creatorId,
        amountEur: batch.amountCents / 100,
        currency: batch.currency.toUpperCase(),
      });
    });

    return {
      message:
        'Payout scheduling simulato. In produzione crea Stripe transfers/payouts e aggiorna earnings.',
      batches,
    };
  }

  async handleStripeWebhook(payload: unknown, signature?: string) {
    const event = this.parseStripeEvent(payload, signature);

    const existingEvent = await this.prisma.stripeEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent?.processedAt) {
      return { received: true, duplicate: true };
    }

    await this.prisma.stripeEvent.upsert({
      where: { stripeEventId: event.id },
      update: { payload: event as unknown as object },
      create: {
        stripeEventId: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    });

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === 'customer.subscription.deleted') {
      await this.handleStripeSubscriptionDeleted(event.data.object as Stripe.Subscription);
    }

    await this.prisma.stripeEvent.update({
      where: { stripeEventId: event.id },
      data: { processedAt: new Date() },
    });

    return { received: true };
  }

  private parseStripeEvent(payload: unknown, signature?: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (webhookSecret && signature && Buffer.isBuffer(payload)) {
      return this.stripe.client.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    if (!webhookSecret) {
      return payload as Stripe.Event;
    }

    throw new BadRequestException('Firma Stripe mancante o raw body non configurato');
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const fanId = session.metadata?.fanId;
    const creatorId = session.metadata?.creatorId;
    const stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const stripeCustomerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!fanId || !creatorId || !stripeSubscriptionId || !stripeCustomerId) {
      throw new BadRequestException('Metadata Stripe checkout incompleti');
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await this.prisma.subscription.upsert({
      where: { fanId_creatorId: { fanId, creatorId } },
      update: {
        stripeSubscriptionId,
        stripeCustomerId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      create: {
        fanId,
        creatorId,
        stripeSubscriptionId,
        stripeCustomerId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    this.ownerHub.send({
      externalId: `stream_access_sub_${sub.id}`,
      type: 'STREAM_ACCESS',
      occurredAt: new Date().toISOString(),
      userId: fanId,
    });
  }

  private async handleStripeSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
      },
    });
  }

  async recordSuccessfulSubscriptionPayment(input: {
    fanId: string;
    creatorId: string;
    subscriptionId: string;
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
    stripeChargeId?: string;
    amountCents: number;
    currency: string;
  }) {
    const platformFeePercent = Number(this.config.get<string>('STRIPE_PLATFORM_FEE_PERCENT') ?? 20);
    const platformFeeCents = Math.round((input.amountCents * platformFeePercent) / 100);
    const creatorNetCents = input.amountCents - platformFeeCents;
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + 7);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          fanId: input.fanId,
          creatorId: input.creatorId,
          subscriptionId: input.subscriptionId,
          stripePaymentIntentId: input.stripePaymentIntentId,
          stripeInvoiceId: input.stripeInvoiceId,
          stripeChargeId: input.stripeChargeId,
          amountCents: input.amountCents,
          platformFeeCents,
          creatorNetCents,
          currency: input.currency,
          status: PaymentStatus.SUCCEEDED,
        },
      });

      await tx.creatorEarning.create({
        data: {
          creatorId: input.creatorId,
          paymentId: payment.id,
          grossCents: input.amountCents,
          platformFeeCents,
          netCents: creatorNetCents,
          currency: input.currency,
          status: EarningStatus.PENDING,
          availableAt,
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            creatorId: input.creatorId,
            paymentId: payment.id,
            type: LedgerEntryType.FAN_PAYMENT,
            direction: LedgerDirection.CREDIT,
            amountCents: input.amountCents,
            currency: input.currency,
            description: 'Pagamento fan ricevuto',
          },
          {
            creatorId: input.creatorId,
            paymentId: payment.id,
            type: LedgerEntryType.PLATFORM_FEE,
            direction: LedgerDirection.DEBIT,
            amountCents: platformFeeCents,
            currency: input.currency,
            description: 'Commissione piattaforma',
          },
          {
            creatorId: input.creatorId,
            paymentId: payment.id,
            type: LedgerEntryType.CREATOR_EARNING,
            direction: LedgerDirection.CREDIT,
            amountCents: creatorNetCents,
            currency: input.currency,
            description: 'Guadagno netto creator',
          },
        ],
      });

      this.ownerHub.send([
        {
          externalId: `stream_access_pay_${payment.id}`,
          type: 'STREAM_ACCESS',
          occurredAt: payment.createdAt.toISOString(),
          userId: input.fanId,
          amountEur: input.amountCents / 100,
          currency: input.currency.toUpperCase(),
        },
        {
          externalId: `owner_revenue_pay_${payment.id}`,
          type: 'OWNER_REVENUE',
          occurredAt: payment.createdAt.toISOString(),
          amountEur: platformFeeCents / 100,
          currency: input.currency.toUpperCase(),
        },
      ]);

      return payment;
    });
  }

  async recordRefundFromWebhook(input: {
    paymentId: string;
    stripeRefundId: string;
    amountCents: number;
    currency: string;
    reason?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId: input.paymentId,
          stripeRefundId: input.stripeRefundId,
          amountCents: input.amountCents,
          currency: input.currency,
          reason: input.reason,
          status: RefundStatus.SUCCEEDED,
        },
      });

      await tx.payment.update({
        where: { id: input.paymentId },
        data: { status: PaymentStatus.REFUNDED },
      });

      await tx.ledgerEntry.create({
        data: {
          paymentId: input.paymentId,
          type: LedgerEntryType.REFUND,
          direction: LedgerDirection.DEBIT,
          amountCents: input.amountCents,
          currency: input.currency,
          description: 'Rimborso fan',
        },
      });

      return refund;
    });
  }

  private async getCreatorByUserId(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Profilo creator non trovato');
    }

    return creator;
  }
}
