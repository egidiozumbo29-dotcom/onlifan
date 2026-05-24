import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycProvider, KycStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface StartKycDto {
  provider?: KycProvider;
  fullName?: string;
  dob?: string;
  country?: string;
  idType?: string;
}

/**
 * KYC adapter. Real providers (Stripe Identity, Persona, Veriff, Sumsub) require API keys;
 * we expose a unified interface and fall back to MANUAL review when keys are missing.
 */
@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async start(userId: string, dto: StartKycDto) {
    const provider = dto.provider ?? this.detectProvider();
    const verification = await this.prisma.kycVerification.create({
      data: {
        userId,
        provider,
        status: KycStatus.PENDING,
        fullName: dto.fullName,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        country: dto.country,
        idType: dto.idType,
      },
    });

    let providerUrl: string | null = null;
    if (provider === KycProvider.STRIPE_IDENTITY) {
      providerUrl = await this.startStripeIdentity(verification.id);
    } else if (provider === KycProvider.PERSONA) {
      providerUrl = await this.startPersona(verification.id);
    }

    return { verification, providerUrl };
  }

  async getMyStatus(userId: string) {
    return this.prisma.kycVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(verificationId: string, providerRef?: string) {
    const v = await this.prisma.kycVerification.findUnique({ where: { id: verificationId } });
    if (!v) throw new NotFoundException();
    const updated = await this.prisma.kycVerification.update({
      where: { id: verificationId },
      data: {
        status: KycStatus.APPROVED,
        providerRef,
        isAgeVerified: true,
        isIdVerified: true,
        completedAt: new Date(),
      },
    });
    await this.notifications.create({
      userId: v.userId,
      type: NotificationType.KYC_APPROVED,
      title: 'Verifica completata',
      body: 'La tua identità è stata verificata. Ora puoi monetizzare.',
    });
    return updated;
  }

  async reject(verificationId: string, reason: string) {
    const v = await this.prisma.kycVerification.findUnique({ where: { id: verificationId } });
    if (!v) throw new NotFoundException();
    const updated = await this.prisma.kycVerification.update({
      where: { id: verificationId },
      data: { status: KycStatus.REJECTED, decisionReason: reason, completedAt: new Date() },
    });
    await this.notifications.create({
      userId: v.userId,
      type: NotificationType.KYC_REJECTED,
      title: 'Verifica rifiutata',
      body: reason,
    });
    return updated;
  }

  async listPending() {
    return this.prisma.kycVerification.findMany({
      where: { status: KycStatus.PENDING },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  private detectProvider(): KycProvider {
    if (this.config.get('STRIPE_IDENTITY_SECRET_KEY')) return KycProvider.STRIPE_IDENTITY;
    if (this.config.get('PERSONA_API_KEY')) return KycProvider.PERSONA;
    if (this.config.get('VERIFF_API_KEY')) return KycProvider.VERIFF;
    if (this.config.get('SUMSUB_API_KEY')) return KycProvider.SUMSUB;
    return KycProvider.MANUAL;
  }

  private async startStripeIdentity(verificationId: string): Promise<string | null> {
    // TODO: integrate with Stripe Identity verification sessions
    this.logger.warn('Stripe Identity adapter is a stub, returning placeholder URL');
    return `https://example.invalid/kyc/stripe/${verificationId}`;
  }

  private async startPersona(verificationId: string): Promise<string | null> {
    this.logger.warn('Persona adapter is a stub, returning placeholder URL');
    return `https://example.invalid/kyc/persona/${verificationId}`;
  }
}
