import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/promotions')
@UseGuards(JwtAuthGuard)
export class AdminPromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getPromotions(@Query('status') status?: string) {
    const where = status ? { status: status as any } : {};

    const promotions = await this.prisma.promo.findMany({
      where,
      include: {
        creator: {
          include: {
            user: {
              select: { displayName: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      promotions: promotions.map(p => ({
        id: p.id,
        code: p.code,
        type: p.type,
        value: p.value,
        creatorName: p.creator?.user.displayName,
        creatorEmail: p.creator?.user.email,
        status: p.status,
        validFrom: p.validFrom,
        validUntil: p.validUntil,
        usageLimit: p.usageLimit,
        usageCount: p.usageCount,
        createdAt: p.createdAt,
      })),
    };
  }

  @Post('create')
  async createPromotion(@Body() body: {
    code: string;
    type: 'PERCENT_OFF' | 'FREE_TRIAL' | 'FIXED_AMOUNT';
    value: number;
    creatorId?: string;
    validFrom: Date;
    validUntil: Date;
    usageLimit?: number;
  }) {
    const promotion = await this.prisma.promo.create({
      data: {
        code: body.code,
        type: body.type,
        value: body.value,
        creatorId: body.creatorId,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
        usageLimit: body.usageLimit,
        usageCount: 0,
        status: 'ACTIVE',
      },
    });

    return { success: true, promotionId: promotion.id };
  }

  @Patch(':id/deactivate')
  async deactivatePromotion(@Param('id') id: string) {
    await this.prisma.promo.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    return { success: true, promotionId: id, status: 'REVOKED' };
  }

  @Patch(':id/extend')
  async extendPromotion(@Param('id') id: string, @Body() body: { validUntil: Date }) {
    await this.prisma.promo.update({
      where: { id },
      data: { validUntil: body.validUntil },
    });

    return { success: true, promotionId: id, validUntil: body.validUntil };
  }

  @Delete(':id')
  async deletePromotion(@Param('id') id: string) {
    await this.prisma.promo.delete({
      where: { id },
    });

    return { success: true, promotionId: id };
  }
}