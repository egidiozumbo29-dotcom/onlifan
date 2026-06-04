import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  readonly client: Stripe;

  constructor(config: ConfigService) {
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY');
    this.client = new Stripe(stripeKey || 'sk_test_dummy', {
      apiVersion: '2025-02-24.acacia',
    });
  }
}
