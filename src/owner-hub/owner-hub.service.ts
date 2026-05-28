import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

export type OwnerHubEventType =
  | 'TIP'
  | 'STREAM_ACCESS'
  | 'GALLERY_PURCHASE'
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_PAID'
  | 'OWNER_REVENUE'
  | 'USER_SIGNUP'
  | 'USER_LOGIN';

export interface OwnerHubEvent {
  externalId: string;
  type: OwnerHubEventType;
  occurredAt: string; // ISO 8601 UTC
  userId?: string;
  username?: string;
  amountTokens?: number;
  amountEur?: number;
  currency?: string;
}

@Injectable()
export class OwnerHubService {
  private readonly logger = new Logger(OwnerHubService.name);

  private readonly endpoint: string;
  private readonly token: string;
  private readonly platformId: string;
  private readonly platformName: string;
  private readonly platformApiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint =
      config.get<string>('OWNER_HUB_ENDPOINT') ?? 'http://localhost:3100/api/events';
    this.token =
      config.get<string>('OWNER_HUB_TOKEN') ??
      'bb7b94286478499dc0942916fa16792d4be2d04bb2f10bd3cc080302b0b149b6';
    this.platformId = config.get<string>('OWNER_HUB_PLATFORM_ID') ?? 'onlifan';
    this.platformName = config.get<string>('OWNER_HUB_PLATFORM_NAME') ?? 'OnliFan';
    this.platformApiUrl =
      config.get<string>('API_URL') ?? 'http://localhost:4000';
  }

  /**
   * Fire-and-forget: invia uno o più eventi all'Owner Hub.
   * Non blocca mai il flusso principale: tutti gli errori vengono solo loggati.
   */
  send(events: OwnerHubEvent | OwnerHubEvent[]): void {
    const list = Array.isArray(events) ? events : [events];
    this.dispatch(list).catch((err: unknown) => {
      this.logger.warn(`OwnerHub dispatch failed: ${String(err)}`);
    });
  }

  private async dispatch(events: OwnerHubEvent[]): Promise<void> {
    const body = JSON.stringify({
      platform: {
        id: this.platformId,
        name: this.platformName,
        apiUrl: this.platformApiUrl,
      },
      events,
    });

    await this.post(this.endpoint, body);
  }

  private post(url: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            Authorization: `Bearer ${this.token}`,
          },
        },
        (res) => {
          // Drain response to free socket
          res.resume();
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              this.logger.warn(`OwnerHub responded ${res.statusCode}`);
            }
            resolve();
          });
        },
      );

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy(new Error('OwnerHub request timeout'));
      });
      req.write(body);
      req.end();
    });
  }
}
