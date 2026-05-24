import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StoryStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoryDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Solo i creator possono creare storie');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.prisma.story.create({
      data: {
        creatorId: creator.id,
        mediaId: dto.mediaId,
        text: dto.text,
        expiresAt,
      },
    });
  }

  async listForViewer(userId: string) {
    const subs = await this.prisma.subscription.findMany({
      where: {
        fanId: userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        currentPeriodEnd: { gt: new Date() },
      },
      select: { creatorId: true },
    });
    const creatorIds = subs.map((s) => s.creatorId);
    if (!creatorIds.length) return [];

    return this.prisma.story.findMany({
      where: {
        creatorId: { in: creatorIds },
        status: StoryStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true, displayName: true, bannerUrl: true } },
        media: true,
      },
    });
  }

  async view(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { creator: true },
    });
    if (!story) throw new NotFoundException();
    await this.prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: {},
      create: { storyId, userId },
    });
    await this.prisma.story.update({
      where: { id: storyId },
      data: { viewCount: { increment: 1 } },
    });
    return { success: true };
  }

  async reply(userId: string, storyId: string, body: string) {
    return this.prisma.storyReply.create({ data: { storyId, userId, body } });
  }

  async listMine(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return [];
    return this.prisma.story.findMany({
      where: { creatorId: creator.id, status: StoryStatus.ACTIVE, expiresAt: { gt: new Date() } },
      include: { media: true, _count: { select: { views: true, replies: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async expireOld() {
    const result = await this.prisma.story.updateMany({
      where: { status: StoryStatus.ACTIVE, expiresAt: { lte: new Date() } },
      data: { status: StoryStatus.EXPIRED },
    });
    return { expired: result.count };
  }
}
