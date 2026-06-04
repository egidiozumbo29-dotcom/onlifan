import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private prisma: PrismaService) {}

  @Get('reports')
  async getReports(@Query('status') status?: string) {
    const reports = await this.prisma.report.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        reporter: {
          select: { displayName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    return reports.map(r => ({
      id: r.id,
      reporterName: r.reporter.displayName,
      reporterEmail: r.reporter.email,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  @Post(':id/resolve')
  async resolveReport(@Param('id') id: string) {
    await this.prisma.report.update({
      where: { id },
      data: { status: 'RESOLVED' }
    });

    return { success: true, message: 'Report resolved' };
  }

  @Post(':id/dismiss')
  async dismissReport(@Param('id') id: string) {
    await this.prisma.report.update({
      where: { id },
      data: { status: 'CLOSED' }
    });

    return { success: true, message: 'Report dismissed' };
  }
}