import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CreatePaymentOrderDto {
  amount: number;
  currency: string;
  description: string;
  merchantReference: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface RevolutPaymentOrder {
  id: string;
  amount: number;
  currency: string;
  description: string;
  merchant_reference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  checkout_url?: string;
  created_at: string;
}

@Injectable()
export class RevolutService {
  private readonly logger = new Logger(RevolutService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('REVOLUT_API_KEY') || '';
    // Revolut API base URL - usa sandbox per testing, production per live
    this.baseUrl = config.get<string>('REVOLUT_ENVIRONMENT') === 'production'
      ? 'https://merchant.revolut.com/api'
      : 'https://sandbox-merchant.revolut.com/api';
  }

  async createPaymentOrder(dto: CreatePaymentOrderDto): Promise<RevolutPaymentOrder> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/1.0/orders`,
        {
          amount: dto.amount,
          currency: dto.currency,
          description: dto.description,
          merchant_reference: dto.merchantReference,
          return_url: dto.returnUrl,
          cancel_url: dto.cancelUrl,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Payment order created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create payment order: ${error.message}`);
      throw new Error('Failed to create payment order');
    }
  }

  async getPaymentOrder(orderId: string): Promise<RevolutPaymentOrder> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/1.0/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get payment order: ${error.message}`);
      throw new Error('Failed to get payment order');
    }
  }

  async confirmPayment(orderId: string): Promise<boolean> {
    try {
      const order = await this.getPaymentOrder(orderId);
      return order.status === 'COMPLETED';
    } catch (error) {
      this.logger.error(`Failed to confirm payment: ${error.message}`);
      return false;
    }
  }
}