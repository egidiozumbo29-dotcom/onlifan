import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BundleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertBundleDto {
  monthsCount: number;
  discountPercent: number;
}

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForCreator(creatorId: string) {
    return this.prisma.bundle.findMany({
      where: { creatorId, status: BundleStatus.ACTIVE },
      orderBy: { monthsCount: 'asc' },
    });
  }

  async upsert(userId: string, dto: UpsertBundleDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();
    const baseCents = creator.subscriptionPriceCents * dto.monthsCount;
    const priceCents = Math.round(baseCents * (1 - dto.discountPercent / 100));
    return this.prisma.bundle.upsert({
      where: { creatorId_monthsCount: { creatorId: creator.id, monthsCount: dto.monthsCount } },
      update: { discountPercent: dto.discountPercent, priceCents },
      create: {
        creatorId: creator.id,
        monthsCount: dto.monthsCount,
        discountPercent: dto.discountPercent,
        priceCents,
        currency: creator.currency,
      },
    });
  }

  async remove(userId: string, bundleId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();
    const b = await this.prisma.bundle.findUnique({ where: { id: bundleId } });
    if (!b || b.creatorId !== creator.id) throw new NotFoundException();
    await this.prisma.bundle.update({
      where: { id: bundleId },
      data: { status: BundleStatus.ARCHIVED },
    });
    return { success: true };
  }
}
