import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private prisma: PrismaService) {}

  @Get('reports')
  async getReports(@Query('status') status?: string) {
    const reports = await this.prisma.report.findMany({
      where: status ? { status: status as any } : undefined,
      include: { reporter: true },
      orderBy: { createdAt: 'desc' }
    });

    return reports.map(r => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      reporterEmail: r.reporter?.email || 'Unknown',
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  @Post(':id/resolve')
  async resolveReport(@Param('id') id: string) {
    const report = await this.prisma.report.update({
      where: { id },
      data: { status: 'RESOLVED' }
    });

    return { success: true, message: 'Report resolved', report };
  }

  @Post(':id/reject')
  async rejectReport(@Param('id') id: string) {
    const report = await this.prisma.report.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    return { success: true, message: 'Report rejected', report };
  }
}