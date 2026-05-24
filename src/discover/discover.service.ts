import { Injectable } from '@nestjs/common';
import { CreatorStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DiscoverQuery {
  q?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'trending' | 'new' | 'top' | 'price_asc' | 'price_desc';
  cursor?: string;
  limit?: number;
}

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  async creators(query: DiscoverQuery) {
    const limit = Math.min(query.limit ?? 24, 50);
    const where: Prisma.CreatorProfileWhereInput = {
      status: CreatorStatus.ACTIVE,
    };
    if (query.q) {
      where.OR = [
        { username: { contains: query.q, mode: 'insensitive' } },
        { displayName: { contains: query.q, mode: 'insensitive' } },
        { bio: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.tag) {
      where.creatorTags = { some: { tag: { slug: query.tag } } };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.subscriptionPriceCents = {
        gte: query.minPrice,
        lte: query.maxPrice,
      };
    }

    let orderBy: Prisma.CreatorProfileOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
    if (query.sort === 'price_asc') orderBy = [{ subscriptionPriceCents: 'asc' }];
    if (query.sort === 'price_desc') orderBy = [{ subscriptionPriceCents: 'desc' }];
    if (query.sort === 'trending' || query.sort === 'top') {
      // approximate trending by subscriber count in the last 30 days
      // fallback to ordering by total posts count
      orderBy = [{ updatedAt: 'desc' }];
    }

    const items = await this.prisma.creatorProfile.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        user: { select: { id: true, avatarUrl: true } },
        creatorTags: { include: { tag: true } },
        _count: { select: { subscriptions: true, posts: true } },
      },
    });

    const slice = items.slice(0, limit);
    const nextCursor = items.length > limit ? slice[slice.length - 1]?.id ?? null : null;
    return { items: slice, nextCursor };
  }

  async trendingTags(limit = 20) {
    const tags = await this.prisma.tag.findMany({
      orderBy: { posts: { _count: 'desc' } },
      take: limit,
      include: { _count: { select: { posts: true, creators: true } } },
    });
    return tags;
  }

  async suggestions(userId: string, limit = 10) {
    const subs = await this.prisma.subscription.findMany({
      where: { fanId: userId },
      select: { creatorId: true },
    });
    const excludeIds = subs.map((s) => s.creatorId);
    return this.prisma.creatorProfile.findMany({
      where: {
        status: CreatorStatus.ACTIVE,
        id: { notIn: excludeIds.length ? excludeIds : undefined },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, avatarUrl: true } } },
    });
  }

  async searchPosts(query: DiscoverQuery) {
    const limit = Math.min(query.limit ?? 20, 50);
    if (!query.q) return { items: [], nextCursor: null };
    const items = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { body: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { creator: true, _count: { select: { likes: true, comments: true } } },
    });
    return { items, nextCursor: null };
  }
}
