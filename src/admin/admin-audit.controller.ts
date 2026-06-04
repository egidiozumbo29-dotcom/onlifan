import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard)
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (actorId) where.actorId = actorId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { displayName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        actorName: log.actor?.displayName,
        actorEmail: log.actor?.email,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('summary')
  async getAuditSummary() {
    const [totalLogs, recentActions, topActors] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorId'],
        _count: { actorId: true },
        orderBy: { _count: { actorId: 'desc' } },
        take: 5,
      }),
    ]);

    const actorIds = topActors.map(a => a.actorId);
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, displayName: true, email: true },
    });

    const actorMap = new Map(actors.map(a => [a.id, a]));

    return {
      totalLogs,
      recentActions: recentActions.map(a => ({
        action: a.action,
        count: a._count.action,
      })),
      topActors: topActors.map(a => {
        const actor = actorMap.get(a.actorId);
        return {
          actorId: a.actorId,
          actorName: actor?.displayName,
          actorEmail: actor?.email,
          actionCount: a._count.actorId,
        };
      })),
    };
  }
}