import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CcbillProvider } from './ccbill.provider';
import { SegpayProvider } from './segpay.provider';
import { PaymentProvider } from './payment-provider.interface';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

@Module({
  providers: [
    CcbillProvider,
    SegpayProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, CcbillProvider, SegpayProvider],
      useFactory: (
        config: ConfigService,
        ccbill: CcbillProvider,
        segpay: SegpayProvider,
      ): PaymentProvider => {
        const name = (config.get<string>('PAYMENT_PROVIDER') ?? 'ccbill').toLowerCase();
        if (name === 'segpay') return segpay;
        return ccbill;
      },
    },
  ],
  exports: [PAYMENT_PROVIDER, CcbillProvider, SegpayProvider],
})
export class PaymentsAdapterModule {}
