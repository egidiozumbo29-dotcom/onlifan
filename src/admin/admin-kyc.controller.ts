import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/kyc')
@UseGuards(JwtAuthGuard)
export class AdminKycController {
  constructor(private prisma: PrismaService) {}

  @Get('pending')
  async getPendingKyc() {
    const kycs = await this.prisma.kycVerification.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });

    return kycs.map(k => ({
      id: k.id,
      userName: k.user?.displayName || 'Unknown',
      userEmail: k.user?.email || 'Unknown',
      provider: k.provider,
      status: k.status,
      submittedAt: k.createdAt
    }));
  }

  @Post(':id/approve')
  async approveKyc(@Param('id') id: string) {
    const kyc = await this.prisma.kycVerification.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { user: true }
    });

    return {
      id: kyc.id,
      status: kyc.status,
      userName: kyc.user?.displayName,
      userEmail: kyc.user?.email
    };
  }

  @Post(':id/reject')
  async rejectKyc(@Param('id') id: string, @Body() body: { reason: string }) {
    const kyc = await this.prisma.kycVerification.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    return {
      id: kyc.id,
      status: kyc.status,
      reason: body.reason
    };
  }
}