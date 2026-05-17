import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus, PostVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async createPost(userId: string, dto: CreatePostDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new ForbiddenException('Solo i creator possono pubblicare contenuti');
    }

    return this.prisma.post.create({
      data: {
        creatorId: creator.id,
        title: dto.title,
        body: dto.body,
        visibility: dto.visibility,
        priceCents: dto.priceCents,
        currency: dto.currency,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        media: dto.mediaIds?.length
          ? {
              create: dto.mediaIds.map((mediaId, index) => ({ mediaId, sortOrder: index })),
            }
          : undefined,
      },
      include: { media: true },
    });
  }

  async getSubscribedFeed(user: { id: string; roles: string[] }, query: FeedQueryDto) {
    const limit = query.limit ?? 20;
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        fanId: user.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
        currentPeriodEnd: { gt: new Date() },
      },
      select: { creatorId: true },
    });

    const creatorIds = subscriptions.map((subscription) => subscription.creatorId);

    if (!creatorIds.length) {
      return { items: [], nextCursor: null };
    }

    const posts = await this.prisma.post.findMany({
      where: {
        creatorId: { in: creatorIds },
        status: PostStatus.PUBLISHED,
        publishedAt: query.cursor ? { lt: new Date(query.cursor) } : undefined,
        visibility: {
          in: [PostVisibility.PUBLIC, PostVisibility.SUBSCRIBERS_ONLY, PostVisibility.PAID_POST],
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        creator: true,
        media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const items = posts.slice(0, limit);
    const nextCursor =
      posts.length > limit ? (items[items.length - 1]?.publishedAt?.toISOString() ?? null) : null;

    return {
      items: items.map((post) => this.decorateFeedPost(post)),
      nextCursor,
    };
  }

  async findPostForViewer(user: { id: string; roles: string[] }, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        creator: true,
        media: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!post || post.status === PostStatus.REMOVED) {
      throw new NotFoundException('Post non trovato');
    }

    const isOwner = post.creator.userId === user.id;
    const isAdmin = user.roles.includes('ADMIN');

    if (post.visibility === PostVisibility.PUBLIC || isOwner || isAdmin) {
      return { ...post, locked: false };
    }

    if (post.visibility === PostVisibility.SUBSCRIBERS_ONLY) {
      const access = await this.subscriptions.hasActiveAccess(user.id, post.creatorId);

      if (access.hasAccess) {
        return { ...post, locked: false };
      }

      return {
        id: post.id,
        title: post.title,
        body: post.body ? 'Abbonati per sbloccare il contenuto completo' : null,
        visibility: post.visibility,
        locked: true,
        creator: {
          username: post.creator.username,
          displayName: post.creator.displayName,
        },
      };
    }

    if (post.visibility === PostVisibility.PAID_POST) {
      const purchase = await this.prisma.postPurchase.findUnique({
        where: { postId_fanId: { postId: post.id, fanId: user.id } },
      });

      if (purchase) {
        return { ...post, locked: false };
      }

      return {
        id: post.id,
        title: post.title,
        body: post.body ? 'Acquista il post per sbloccare il contenuto completo' : null,
        visibility: post.visibility,
        locked: true,
        priceCents: post.priceCents,
        currency: post.currency,
        creator: {
          username: post.creator.username,
          displayName: post.creator.displayName,
        },
      };
    }

    throw new ForbiddenException('Contenuto non accessibile');
  }

  async likePost(user: { id: string; roles: string[] }, postId: string) {
    await this.findPostForViewer(user, postId);

    return this.prisma.postLike.upsert({
      where: { postId_userId: { postId, userId: user.id } },
      update: {},
      create: { postId, userId: user.id },
    });
  }

  async unlikePost(userId: string, postId: string) {
    await this.prisma.postLike.deleteMany({
      where: { postId, userId },
    });

    return { success: true };
  }

  async createComment(
    user: { id: string; roles: string[] },
    postId: string,
    dto: CreateCommentDto,
  ) {
    await this.findPostForViewer(user, postId);

    return this.prisma.postComment.create({
      data: {
        postId,
        userId: user.id,
        body: dto.body,
      },
    });
  }

  async getComments(postId: string, query: FeedQueryDto) {
    const limit = query.limit ?? 20;
    const comments = await this.prisma.postComment.findMany({
      where: {
        postId,
        createdAt: query.cursor ? { lt: new Date(query.cursor) } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const items = comments.slice(0, limit);
    const nextCursor =
      comments.length > limit ? (items[items.length - 1]?.createdAt.toISOString() ?? null) : null;

    return { items, nextCursor };
  }

  private decorateFeedPost(post: {
    visibility: PostVisibility;
    body: string | null;
    priceCents: number | null;
    currency: string | null;
  }) {
    if (post.visibility === PostVisibility.PAID_POST) {
      return {
        ...post,
        locked: true,
        body: post.body ? 'Acquista il post per sbloccare il contenuto completo' : null,
        priceCents: post.priceCents,
        currency: post.currency,
      };
    }

    return { ...post, locked: false };
  }
}
