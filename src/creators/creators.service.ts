import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatorStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ApplyCreatorDto } from './dto/apply-creator.dto';

@Injectable()
export class CreatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async apply(userId: string, dto: ApplyCreatorDto) {
    const existing = await this.prisma.creatorProfile.findFirst({
      where: {
        OR: [{ userId }, { username: dto.username }],
      },
    });

    if (existing) {
      throw new ConflictException('Profilo creator già esistente o username non disponibile');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_role: { userId, role: Role.CREATOR } },
        update: {},
        create: { userId, role: Role.CREATOR },
      });

      return tx.creatorProfile.create({
        data: {
          userId,
          username: dto.username,
          displayName: dto.displayName,
          bio: dto.bio,
          subscriptionPriceCents: dto.subscriptionPriceCents,
          status: CreatorStatus.PENDING_REVIEW,
        },
      });
    });
  }

  async findMine(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('Profilo creator non trovato');
    }

    return profile;
  }

  async listMyPosts(userId: string, limit = 50) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Profilo creator non trovato');
    }
    return this.prisma.post.findMany({
      where: { creatorId: profile.id },
      take: limit,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        body: true,
        visibility: true,
        priceCents: true,
        currency: true,
        status: true,
        publishedAt: true,
        createdAt: true,
      },
    });
  }

  async listPublic(limit = 20) {
    return this.prisma.creatorProfile.findMany({
      where: { status: CreatorStatus.ACTIVE },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        bannerUrl: true,
        subscriptionPriceCents: true,
        currency: true,
      },
    });
  }

  async listPostsByUsername(username: string, limit = 20) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== CreatorStatus.ACTIVE) {
      throw new NotFoundException('Creator non trovato');
    }
    const posts = await this.prisma.post.findMany({
      where: {
        creatorId: profile.id,
        status: 'PUBLISHED',
        visibility: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PAID_POST'] },
      },
      take: limit,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        body: true,
        visibility: true,
        priceCents: true,
        currency: true,
        publishedAt: true,
        media: {
          orderBy: { sortOrder: 'asc' },
          select: {
            sortOrder: true,
            media: {
              select: { id: true, type: true, status: true, mimeType: true, objectKey: true },
            },
          },
        },
      },
    });

    // Generate signed URLs only for PUBLIC posts (paywall protects others)
    return Promise.all(
      posts.map(async (post) => {
        const mediaWithUrls = await Promise.all(
          post.media.map(async (entry) => {
            let url: string | null = null;
            if (post.visibility === 'PUBLIC' && entry.media.status === 'READY') {
              try {
                const signed = await this.storage.generateSignedUrl(entry.media.objectKey, 900);
                url = this.storage.rewriteForPublic(signed.signedUrl);
              } catch {
                url = null;
              }
            }
            return {
              id: entry.media.id,
              type: entry.media.type,
              mimeType: entry.media.mimeType,
              url,
              locked: post.visibility !== 'PUBLIC',
            };
          }),
        );
        return { ...post, media: mediaWithUrls };
      }),
    );
  }

  async findByUsername(username: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        bannerUrl: true,
        subscriptionPriceCents: true,
        currency: true,
        status: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Creator non trovato');
    }

    return profile;
  }
}
