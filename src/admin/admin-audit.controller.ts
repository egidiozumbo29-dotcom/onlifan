import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard)
export class AdminAuditController {
  constructor(private prisma: PrismaService) {}

  @Get('logs')
  async getAuditLogs(@Query('limit') limit: string = '50') {
    const logs = await this.prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    return logs;
  }

  @Get('user-activity')
  async getUserActivity(@Query('actorId') actorId: string) {
    if (!actorId) {
      return { error: 'actorId required' };
    }

    const logs = await this.prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return logs;
  }
}