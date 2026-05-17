import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaStatus, PostVisibility } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StorageFileType } from '../storage/interfaces/storage.interface';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async createUploadUrl(userId: string, dto: CreateUploadUrlDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new ForbiddenException('Solo i creator possono caricare media');
    }

    const mediaId = randomUUID();
    const filename = dto.filename ?? `file-${Date.now()}`;
    const bucket = this.config.get<string>('S3_BUCKET') ?? 'dollyfans-local';

    const upload = await this.storage.generateUploadUrl(
      creator.id,
      mediaId,
      filename,
      dto.mimeType,
      StorageFileType.ORIGINAL,
    );

    await this.prisma.media.create({
      data: {
        id: mediaId,
        creatorId: creator.id,
        type: dto.type,
        status: MediaStatus.PENDING_UPLOAD,
        bucket,
        objectKey: upload.key,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });

    return {
      mediaId,
      objectKey: upload.key,
      uploadUrl: this.storage.rewriteForPublic(upload.uploadUrl),
      expiresAt: upload.expiresAt,
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

    // Verifica che il file sia effettivamente presente su S3/MinIO
    const exists = await this.storage.fileExists(media.objectKey);
    if (!exists) {
      throw new NotFoundException("File non trovato sull'object storage");
    }

    // Per le immagini saltiamo il workflow di processing -> READY direttamente
    return this.prisma.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.READY },
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

    const deliveryKey = media.processedObjectKey ?? media.objectKey;
    const signed = await this.storage.generateSignedUrl(deliveryKey, 900);

    return {
      mediaId: media.id,
      url: this.storage.rewriteForPublic(signed.signedUrl),
      expiresAt: signed.expiresAt,
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
