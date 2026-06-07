import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit')
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