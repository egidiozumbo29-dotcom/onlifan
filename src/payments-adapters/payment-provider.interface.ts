/**
 * Provider-neutral payment interface. Implementations: Stripe, CCBill, Segpay, Epoch, Vendo.
 * For adult content, Stripe is disallowed in production — swap to CCBill/Segpay.
 */
export interface PaymentProvider {
  readonly name: string;

  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;

  /** Verify and parse webhook payload */
  parseWebhook(payload: unknown, headers: Record<string, string | string[] | undefined>): Promise<NormalizedEvent>;

  /** Optional: refund a previous payment */
  refund?(paymentRef: string, amountCents?: number): Promise<{ refundRef: string }>;
}

export interface CheckoutInput {
  fanId: string;
  creatorId: string;
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  kind: 'SUBSCRIPTION' | 'POST_PURCHASE' | 'MESSAGE_PURCHASE' | 'TIP' | 'WALLET_TOPUP';
  metadata?: Record<string, string>;
  /** For subscriptions */
  intervalMonths?: number;
}

export interface CheckoutResult {
  checkoutUrl: string;
  providerRef: string;
}

export interface NormalizedEvent {
  type:
    | 'PAYMENT_SUCCEEDED'
    | 'PAYMENT_FAILED'
    | 'SUBSCRIPTION_RENEWED'
    | 'SUBSCRIPTION_CANCELED'
    | 'REFUND'
    | 'CHARGEBACK'
    | 'OTHER';
  providerRef: string;
  amountCents?: number;
  currency?: string;
  metadata?: Record<string, string>;
  raw: unknown;
}
