import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PromoStatus, PromoType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePromoDto {
  type: PromoType;
  value: number;
  maxRedemptions?: number;
  expiresAt?: string;
  code?: string;
}

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePromoDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();

    const code = (dto.code ?? randomBytes(4).toString('hex')).toUpperCase();
    return this.prisma.promo.create({
      data: {
        code,
        creatorId: creator.id,
        type: dto.type,
        value: dto.value,
        maxRedemptions: dto.maxRedemptions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async listMine(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return [];
    return this.prisma.promo.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, id: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();
    const promo = await this.prisma.promo.findUnique({ where: { id } });
    if (!promo || promo.creatorId !== creator.id) throw new NotFoundException();
    return this.prisma.promo.update({ where: { id }, data: { status: PromoStatus.REVOKED } });
  }

  async redeem(userId: string, code: string) {
    const promo = await this.prisma.promo.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo || promo.status !== PromoStatus.ACTIVE) throw new NotFoundException('Promo non valida');
    if (promo.expiresAt && promo.expiresAt < new Date())
      throw new BadRequestException('Promo scaduta');
    if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions)
      throw new BadRequestException('Promo esaurita');

    const existing = await this.prisma.promoRedemption.findUnique({
      where: { promoId_fanId: { promoId: promo.id, fanId: userId } },
    });
    if (existing) throw new BadRequestException('Promo già usata');

    await this.prisma.$transaction([
      this.prisma.promoRedemption.create({ data: { promoId: promo.id, fanId: userId } }),
      this.prisma.promo.update({
        where: { id: promo.id },
        data: { redemptionCount: { increment: 1 } },
      }),
    ]);

    return { success: true, promo };
  }
}
