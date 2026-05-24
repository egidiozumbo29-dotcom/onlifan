import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  CheckoutInput,
  CheckoutResult,
  NormalizedEvent,
  PaymentProvider,
} from './payment-provider.interface';

/**
 * CCBill Restful API adapter. Requires a CCBill account, FlexForm and webhook configuration.
 * Env:
 *  - CCBILL_ACCOUNT_NUMBER
 *  - CCBILL_SUB_ACCOUNT
 *  - CCBILL_FLEXFORM_ID
 *  - CCBILL_SALT
 *  - CCBILL_WEBHOOK_SECRET
 */
@Injectable()
export class CcbillProvider implements PaymentProvider {
  readonly name = 'ccbill';
  private readonly logger = new Logger(CcbillProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const account = this.config.get<string>('CCBILL_ACCOUNT_NUMBER');
    const sub = this.config.get<string>('CCBILL_SUB_ACCOUNT');
    const form = this.config.get<string>('CCBILL_FLEXFORM_ID');
    const salt = this.config.get<string>('CCBILL_SALT');

    if (!account || !sub || !form || !salt) {
      this.logger.warn('CCBill not configured, returning placeholder URL');
      return { checkoutUrl: `https://example.invalid/ccbill/${input.fanId}`, providerRef: 'placeholder' };
    }

    const amount = (input.amountCents / 100).toFixed(2);
    const currencyCode = this.currencyToCode(input.currency);
    const formDigest = createHmac('md5', '')
      .update(`${amount}${input.intervalMonths ?? 0}${input.intervalMonths ?? 0}${currencyCode}${salt}`)
      .digest('hex');

    const url = new URL(`https://api.ccbill.com/wap-frontflex/flexforms/${form}`);
    url.searchParams.set('clientAccnum', account);
    url.searchParams.set('clientSubacc', sub);
    url.searchParams.set('initialPrice', amount);
    url.searchParams.set('initialPeriod', String(input.intervalMonths ?? 0));
    url.searchParams.set('currencyCode', String(currencyCode));
    url.searchParams.set('formDigest', formDigest);
    url.searchParams.set('fanId', input.fanId);
    url.searchParams.set('creatorId', input.creatorId);
    url.searchParams.set('kind', input.kind);
    for (const [k, v] of Object.entries(input.metadata ?? {})) {
      url.searchParams.set(k, v);
    }

    return { checkoutUrl: url.toString(), providerRef: formDigest };
  }

  async parseWebhook(payload: unknown): Promise<NormalizedEvent> {
    const data = (payload ?? {}) as Record<string, string>;
    // CCBill posts form-encoded events. eventType examples: NewSaleSuccess, Cancellation, Refund, Chargeback, RenewalSuccess
    const eventType = data.eventType ?? data.event_type ?? '';
    const map: Record<string, NormalizedEvent['type']> = {
      NewSaleSuccess: 'PAYMENT_SUCCEEDED',
      RenewalSuccess: 'SUBSCRIPTION_RENEWED',
      Cancellation: 'SUBSCRIPTION_CANCELED',
      Refund: 'REFUND',
      Chargeback: 'CHARGEBACK',
      NewSaleFailure: 'PAYMENT_FAILED',
    };
    return {
      type: map[eventType] ?? 'OTHER',
      providerRef: data.subscriptionId ?? data.transactionId ?? '',
      amountCents: data.accountingAmount
        ? Math.round(parseFloat(data.accountingAmount) * 100)
        : undefined,
      currency: data.accountingCurrencyCode ? this.codeToCurrency(parseInt(data.accountingCurrencyCode, 10)) : undefined,
      metadata: data,
      raw: payload,
    };
  }

  private currencyToCode(currency: string): number {
    const map: Record<string, number> = { usd: 840, eur: 978, gbp: 826 };
    return map[currency.toLowerCase()] ?? 978;
  }

  private codeToCurrency(code: number): string {
    const map: Record<number, string> = { 840: 'usd', 978: 'eur', 826: 'gbp' };
    return map[code] ?? 'eur';
  }
}
