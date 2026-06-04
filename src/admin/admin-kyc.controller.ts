import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/kyc')
@UseGuards(JwtAuthGuard)
export class AdminKycController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pending')
  async getPendingKyc() {
    const pendingKyc = await this.prisma.kycVerification.findMany({
      where: { status: 'PENDING' },
      include: {
        creator: {
          include: {
            user: {
              select: { email: true, displayName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      pendingKyc: pendingKyc.map(k => ({
        id: k.id,
        creatorId: k.creatorId,
        creatorName: k.creator.user.displayName,
        creatorEmail: k.creator.user.email,
        provider: k.provider,
        status: k.status,
        submittedAt: k.createdAt,
      })),
    };
  }

  @Get(':id')
  async getKycDetails(@Param('id') id: string) {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: {
              select: { email: true, displayName: true },
            },
          },
        },
      },
    });

    if (!kyc) {
      throw new Error('KYC verification not found');
    }

    return {
      id: kyc.id,
      creatorId: kycId,
      creatorName: kyc.creator.user.displayName,
      creatorEmail: kyc.creator.user.email,
      provider: k.provider,
      status: k.status,
      externalId: k.externalId,
      submittedAt: k.createdAt,
      reviewedAt: k.reviewedAt,
      metadata: k.metadata,
    };
  }

  @Patch(':id/approve')
  async approveKyc(@Param('id') id: string) {
    const kyc = await this.prisma.kycVerification.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    });

    // Aggiorna anche lo stato del creator
    await this.prisma.creatorProfile.update({
      where: { id: kyc.creatorId },
      data: { kycVerified: true },
    });

    return { success: true, kycId: kyc.id, status: 'APPROVED' };
  }

  @Patch(':id/reject')
  async rejectKyc(@Param('id') id: string, @Body() body: { reason: string }) {
    const kyc = await this.prisma.kycVerification.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        metadata: {
          ...kyc.metadata,
          rejectionReason: body.reason,
        },
      },
    });

    return { success: true, kycId: kyc.id, status: 'REJECTED', reason: body.reason };
  }
}