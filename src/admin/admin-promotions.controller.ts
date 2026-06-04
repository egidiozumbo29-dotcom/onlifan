import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getPromotions(@Query('status') status?: string) {
    const promos = await this.prisma.promo.findMany({
      include: { creator: { include: { user: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return promos.map(p => ({
      id: p.id,
      code: p.code,
      type: p.type,
      value: p.value,
      creatorName: p.creator?.user?.displayName || 'Unknown',
      creatorEmail: p.creator?.user?.email || 'Unknown',
      status: p.status,
      createdAt: p.createdAt
    }));
  }

  @Post()
  async createPromo(@Body() body: { code: string; type: string; value: number; creatorId?: string }) {
    const promo = await this.prisma.promo.create({
      data: {
        code: body.code,
        type: body.type as any,
        value: body.value,
        creatorId: body.creatorId
      }
    });

    return promo;
  }

  @Post(':id/deactivate')
  async deactivatePromo(@Param('id') id: string) {
    const promo = await this.prisma.promo.update({
      where: { id },
      data: { status: 'REVOKED' as any }
    });

    return promo;
  }
}