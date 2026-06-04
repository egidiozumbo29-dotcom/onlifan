import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OwnerHubService, OwnerHubEventType } from '../owner-hub/owner-hub.service';

export interface RevolutWebhookEvent {
  event_type: string;
  id: string;
  occurred_at: string;
  data: any;
}

@Injectable()
export class RevolutService {
  private readonly logger = new Logger(RevolutService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ownerHub: OwnerHubService,
  ) {}

  async handleWebhook(event: RevolutWebhookEvent) {
    this.logger.log(`Revolut webhook received: ${event.event_type} (${event.id})`);

    try {
      switch (event.event_type) {
        case 'PAYMENT_COMPLETED':
          await this.handlePaymentCompleted(event);
          break;
        case 'PAYMENT_FAILED':
          await this.handlePaymentFailed(event);
          break;
        case 'PAYOUT_COMPLETED':
          await this.handlePayoutCompleted(event);
          break;
        case 'PAYOUT_FAILED':
          await this.handlePayoutFailed(event);
          break;
        case 'TRANSFER_COMPLETED':
          await this.handleTransferCompleted(event);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.event_type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing Revolut webhook: ${error}`);
      // Non propagare l'errore per non far fallire il webhook
    }
  }

  private async handlePaymentCompleted(event: RevolutWebhookEvent) {
    const payment = event.data;
    const amountEur = payment.amount / 100; // Revolut usa centesimi
    const userId = payment.merchant_reference || 'unknown';

    this.ownerHub.send({
      externalId: `revolut_payment_${event.id}`,
      type: 'GALLERY_PURCHASE' as OwnerHubEventType,
      occurredAt: event.occurred_at,
      userId,
      amountEur,
      currency: 'EUR',
    });

    this.logger.log(`Payment completed: ${amountEur} EUR`);
  }

  private async handlePaymentFailed(event: RevolutWebhookEvent) {
    this.logger.log(`Payment failed: ${event.id}`);
    // Potremmo inviare un evento di tipo diverso per il fallimento
  }

  private async handlePayoutCompleted(event: RevolutWebhookEvent) {
    const payout = event.data;
    const amountEur = payout.amount / 100;

    this.ownerHub.send({
      externalId: `revolut_payout_${event.id}`,
      type: 'PAYOUT_PAID' as OwnerHubEventType,
      occurredAt: event.occurred_at,
      amountEur,
      currency: 'EUR',
    });

    this.logger.log(`Payout completed: ${amountEur} EUR`);
  }

  private async handlePayoutFailed(event: RevolutWebhookEvent) {
    this.logger.log(`Payout failed: ${event.id}`);
  }

  private async handleTransferCompleted(event: RevolutWebhookEvent) {
    const transfer = event.data;
    const amountEur = transfer.amount / 100;

    // Identifico se è un incasso (OWNER_REVENUE) o altro
    if (transfer.counterparty?.account_type === 'MERCHANT') {
      this.ownerHub.send({
        externalId: `revolut_revenue_${event.id}`,
        type: 'OWNER_REVENUE' as OwnerHubEventType,
        occurredAt: event.occurred_at,
        amountEur,
        currency: 'EUR',
      });
    }

    this.logger.log(`Transfer completed: ${amountEur} EUR`);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Revolut usa HMAC-SHA256 per firmare i webhook
    const webhookSecret = this.config.get<string>('REVOLUT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('REVOLUT_WEBHOOK_SECRET not configured');
      return false;
    }

    // Implementazione della verifica HMAC (da completare con crypto)
    // Per ora restituisco true per testing
    return true;
  }
}