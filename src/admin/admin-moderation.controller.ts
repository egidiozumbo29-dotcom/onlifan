import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/moderation')
@UseGuards(JwtAuthGuard)
export class AdminModerationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('reports')
  async getReports(@Query('status') status?: string) {
    const where = status ? { status: status as any } : {};

    const reports = await this.prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: { displayName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      reports: reports.map(r => ({
        id: r.id,
        reporterName: r.reporter.displayName,
        reporterEmail: r.reporter.email,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  @Patch('reports/:id/resolve')
  async resolveReport(@Param('id') id: string) {
    await this.prisma.report.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });

    return { success: true, reportId: id, status: 'RESOLVED' };
  }

  @Get('posts/pending-review')
  async getPendingPosts() {
    const posts = await this.prisma.post.findMany({
      where: { status: 'PENDING_REVIEW' },
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
      posts: posts.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content.substring(0, 200),
        creatorName: p.creator.user.displayName,
        creatorEmail: p.creator.user.email,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }

  @Patch('posts/:id/approve')
  async approvePost(@Param('id') id: string) {
    await this.prisma.post.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    return { success: true, postId: id, status: 'PUBLISHED' };
  }

  @Patch('posts/:id/reject')
  async rejectPost(@Param('id') id: string, @Body() body: { reason: string }) {
    await this.prisma.post.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        metadata: {
          rejectionReason: body.reason,
        },
      },
    });

    return { success: true, postId: id, status: 'REJECTED', reason: body.reason };
  }
}