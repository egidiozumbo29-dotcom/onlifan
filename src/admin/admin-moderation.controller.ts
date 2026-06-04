import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private prisma: PrismaService) {}

  @Get('reports')
  async getReports(@Query('status') status?: string) {
    const reports = await this.prisma.contentReport.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        post: {
          include: { creator: { include: { user: true } } }
        },
        reporter: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return reports.map(r => ({
      id: r.id,
      postId: r.postId,
      content: r.post?.body?.substring(0, 200) || '',
      creatorName: r.post?.creator?.user?.displayName || 'Unknown',
      creatorEmail: r.post?.creator?.user?.email || 'Unknown',
      reporterEmail: r.reporter?.email || 'Unknown',
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  @Post(':id/approve')
  async approveReport(@Param('id') id: string) {
    const report = await this.prisma.contentReport.update({
      where: { id },
      data: { status: 'RESOLVED' }
    });

    if (report.postId) {
      await this.prisma.post.update({
        where: { id: report.postId },
        data: { status: 'PUBLISHED' }
      });
    }

    return { success: true, message: 'Report approved' };
  }

  @Post(':id/reject')
  async rejectReport(@Param('id') id: string, @Body() body: { reason: string }) {
    await this.prisma.contentReport.update({
      where: { id },
      data: { status: 'DISMISSED' }
    });

    return { success: true, message: 'Report rejected' };
  }
}