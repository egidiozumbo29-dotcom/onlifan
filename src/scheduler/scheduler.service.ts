import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, PostStatus, ScheduledPostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SchedulePostDto {
  scheduledFor: string;
  payload: {
    title?: string;
    body?: string;
    visibility: 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'PAID_POST' | 'PRIVATE';
    priceCents?: number;
    currency?: string;
    mediaIds?: string[];
  };
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async schedule(userId: string, dto: SchedulePostDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();
    return this.prisma.scheduledPost.create({
      data: {
        creatorId: creator.id,
        scheduledFor: new Date(dto.scheduledFor),
        payload: dto.payload as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listMine(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return [];
    return this.prisma.scheduledPost.findMany({
      where: { creatorId: creator.id, status: { in: [ScheduledPostStatus.PENDING, ScheduledPostStatus.FAILED] } },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async cancel(userId: string, id: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException();
    const sp = await this.prisma.scheduledPost.findUnique({ where: { id } });
    if (!sp || sp.creatorId !== creator.id) throw new NotFoundException();
    return this.prisma.scheduledPost.update({
      where: { id },
      data: { status: ScheduledPostStatus.CANCELED },
    });
  }

  // Runs every minute to publish due posts
  @Cron(CronExpression.EVERY_MINUTE)
  async publishDuePosts() {
    const due = await this.prisma.scheduledPost.findMany({
      where: { status: ScheduledPostStatus.PENDING, scheduledFor: { lte: new Date() } },
      take: 50,
    });

    for (const sp of due) {
      try {
        const payload = sp.payload as {
          title?: string;
          body?: string;
          visibility: 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'PAID_POST' | 'PRIVATE';
          priceCents?: number;
          currency?: string;
          mediaIds?: string[];
        };

        const post = await this.prisma.post.create({
          data: {
            creatorId: sp.creatorId,
            title: payload.title,
            body: payload.body,
            visibility: payload.visibility,
            priceCents: payload.priceCents,
            currency: payload.currency,
            status: PostStatus.PUBLISHED,
            publishedAt: new Date(),
            media: payload.mediaIds?.length
              ? {
                  create: payload.mediaIds.map((mediaId, index) => ({ mediaId, sortOrder: index })),
                }
              : undefined,
          },
        });

        await this.prisma.scheduledPost.update({
          where: { id: sp.id },
          data: { status: ScheduledPostStatus.PUBLISHED, publishedPostId: post.id },
        });
      } catch (e) {
        await this.prisma.scheduledPost.update({
          where: { id: sp.id },
          data: {
            status: ScheduledPostStatus.FAILED,
            lastError: (e as Error).message,
            attempts: { increment: 1 },
          },
        });
        this.logger.error(`Failed to publish scheduled post ${sp.id}: ${(e as Error).message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStories() {
    const result = await this.prisma.story.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (result.count) this.logger.log(`Expired ${result.count} stories`);
  }
}
