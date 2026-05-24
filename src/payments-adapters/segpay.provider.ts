import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckoutInput,
  CheckoutResult,
  NormalizedEvent,
  PaymentProvider,
} from './payment-provider.interface';

/**
 * Segpay adapter (alternative adult-friendly processor).
 * Env: SEGPAY_PACKAGE_ID, SEGPAY_BILLING_CONFIG, SEGPAY_POSTBACK_KEY
 */
@Injectable()
export class SegpayProvider implements PaymentProvider {
  readonly name = 'segpay';
  private readonly logger = new Logger(SegpayProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const pkg = this.config.get<string>('SEGPAY_PACKAGE_ID');
    const billConfig = this.config.get<string>('SEGPAY_BILLING_CONFIG');
    if (!pkg || !billConfig) {
      this.logger.warn('Segpay not configured');
      return { checkoutUrl: `https://example.invalid/segpay/${input.fanId}`, providerRef: 'placeholder' };
    }
    const url = new URL('https://secure.segpay.com/billing/poset.cgi');
    url.searchParams.set('x-eticketid', pkg);
    url.searchParams.set('billConfig', billConfig);
    url.searchParams.set('returnurl', input.successUrl);
    url.searchParams.set('declineurl', input.cancelUrl);
    url.searchParams.set('userid', input.fanId);
    url.searchParams.set('creatorId', input.creatorId);
    url.searchParams.set('kind', input.kind);
    return { checkoutUrl: url.toString(), providerRef: pkg };
  }

  async parseWebhook(payload: unknown): Promise<NormalizedEvent> {
    const data = (payload ?? {}) as Record<string, string>;
    const action = data.action ?? data.eventType ?? '';
    const map: Record<string, NormalizedEvent['type']> = {
      auth: 'PAYMENT_SUCCEEDED',
      rebill: 'SUBSCRIPTION_RENEWED',
      cancel: 'SUBSCRIPTION_CANCELED',
      refund: 'REFUND',
      chargeback: 'CHARGEBACK',
    };
    return {
      type: map[action] ?? 'OTHER',
      providerRef: data.trans_id ?? '',
      amountCents: data.amount ? Math.round(parseFloat(data.amount) * 100) : undefined,
      currency: data.currency?.toLowerCase(),
      metadata: data,
      raw: payload,
    };
  }
}
