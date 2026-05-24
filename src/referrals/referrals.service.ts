import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReferralStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMine(userId: string, commissionPercent = 5) {
    const existing = await this.prisma.referralCode.findFirst({
      where: { ownerId: userId, status: ReferralStatus.ACTIVE },
    });
    if (existing) return existing;
    const code = randomBytes(4).toString('hex').toUpperCase();
    return this.prisma.referralCode.create({
      data: { ownerId: userId, code, commissionPercent },
    });
  }

  async stats(userId: string) {
    const code = await this.getOrCreateMine(userId);
    const attributions = await this.prisma.referralAttribution.findMany({
      where: { referralCodeId: code.id },
      include: { referredUser: { select: { id: true, displayName: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const totalRevenue = attributions.reduce((s, a) => s + a.totalRevenueCents, 0);
    const earned = Math.round((totalRevenue * code.commissionPercent) / 100);
    const paid = attributions.reduce((s, a) => s + a.commissionPaidCents, 0);
    return {
      code: code.code,
      commissionPercent: code.commissionPercent,
      referrals: attributions.length,
      attributedRevenueCents: totalRevenue,
      earnedCommissionCents: earned,
      paidCommissionCents: paid,
      pendingCommissionCents: earned - paid,
      attributions,
    };
  }

  async attribute(referredUserId: string, code: string) {
    const ref = await this.prisma.referralCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!ref || ref.status !== ReferralStatus.ACTIVE) throw new NotFoundException();
    if (ref.ownerId === referredUserId) throw new BadRequestException();
    return this.prisma.referralAttribution.upsert({
      where: { referredUserId },
      update: {},
      create: { referralCodeId: ref.id, referredUserId },
    });
  }
}
