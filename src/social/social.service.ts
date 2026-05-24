import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException('Non puoi seguire te stesso');
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException();
    return this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { success: true };
  }

  async isFollowing(followerId: string, followingId: string) {
    const f = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { following: !!f };
  }

  async followers(userId: string, cursor?: string, limit = 30) {
    const items = await this.prisma.follow.findMany({
      where: { followingId: userId, createdAt: cursor ? { lt: new Date(cursor) } : undefined },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { follower: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    const slice = items.slice(0, limit);
    const nextCursor = items.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;
    return { items: slice, nextCursor };
  }

  async following(userId: string, cursor?: string, limit = 30) {
    const items = await this.prisma.follow.findMany({
      where: { followerId: userId, createdAt: cursor ? { lt: new Date(cursor) } : undefined },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: { following: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    const slice = items.slice(0, limit);
    const nextCursor = items.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;
    return { items: slice, nextCursor };
  }

  async block(blockerId: string, blockedId: string, reason?: string) {
    if (blockerId === blockedId) throw new BadRequestException();
    return this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: { reason },
      create: { blockerId, blockedId, reason },
    });
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { success: true };
  }

  async listBlocks(userId: string) {
    return this.prisma.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
