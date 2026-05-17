import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaStatus, PostVisibility } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async createUploadUrl(userId: string, dto: CreateUploadUrlDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new ForbiddenException('Solo i creator possono caricare media');
    }

    const mediaId = randomUUID();
    const bucket = this.config.get<string>('S3_BUCKET') ?? 'dollyfans-local';
    const objectKey = `originals/${creator.id}/${mediaId}`;

    const media = await this.prisma.media.create({
      data: {
        id: mediaId,
        creatorId: creator.id,
        type: dto.type,
        status: MediaStatus.PENDING_UPLOAD,
        bucket,
        objectKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });

    return {
      mediaId: media.id,
      objectKey,
      uploadUrl: 'Presigned URL S3/R2 da generare nello StorageService',
      expiresInSeconds: Number(this.config.get<string>('S3_SIGNED_URL_TTL_SECONDS') ?? 900),
    };
  }

  async confirmUpload(userId: string, mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: { creator: true },
    });

    if (!media) {
      throw new NotFoundException('Media non trovato');
    }

    if (media.creator.userId !== userId) {
      throw new ForbiddenException('Non autorizzato');
    }

    return this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.UPLOADED },
    });
  }

  async getSignedDeliveryUrl(user: { id: string; roles: string[] }, mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        creator: true,
        posts: {
          include: {
            post: {
              include: { purchases: true },
            },
          },
        },
      },
    });

    if (!media || media.status !== MediaStatus.READY) {
      throw new NotFoundException('Media non disponibile');
    }

    const isOwner = media.creator.userId === user.id;
    const isAdmin = user.roles.includes('ADMIN');

    if (!isOwner && !isAdmin) {
      const allowed = media.posts.some(({ post }) => {
        if (post.visibility === PostVisibility.PUBLIC) {
          return true;
        }

        if (post.visibility === PostVisibility.PAID_POST) {
          return post.purchases.some((purchase) => purchase.fanId === user.id);
        }

        return false;
      });

      const subscriberAllowed = await this.hasSubscriberAccess(
        user.id,
        media.posts.map(({ post }) => post.creatorId),
      );

      if (!allowed && !subscriberAllowed) {
        throw new ForbiddenException('Media protetto da paywall');
      }
    }

    const cdnBaseUrl = this.config.get<string>('CDN_BASE_URL') ?? 'https://cdn.example.com';
    const deliveryKey = media.processedObjectKey ?? media.objectKey;

    return {
      mediaId: media.id,
      url: `${cdnBaseUrl}/${deliveryKey}?signature=placeholder&expires=${Date.now() + 900000}`,
      expiresInSeconds: Number(this.config.get<string>('S3_SIGNED_URL_TTL_SECONDS') ?? 900),
      deliveryKey,
    };
  }

  async enqueueProcessing(userId: string, mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: { creator: true },
    });

    if (!media) {
      throw new NotFoundException('Media non trovato');
    }

    if (media.creator.userId !== userId) {
      throw new ForbiddenException('Non autorizzato');
    }

    await this.prisma.media.update({
      where: { id: media.id },
      data: { status: MediaStatus.PROCESSING },
    });

    return {
      mediaId: media.id,
      status: MediaStatus.PROCESSING,
      pipeline: ['validation', 'compression', 'thumbnail_generation', 'optional_hls_transcoding'],
    };
  }

  private async hasSubscriberAccess(userId: string, creatorIds: string[]) {
    for (const creatorId of creatorIds) {
      const access = await this.subscriptions.hasActiveAccess(userId, creatorId);

      if (access.hasAccess) {
        return true;
      }
    }

    return false;
  }
}
