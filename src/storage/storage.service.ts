import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  UploadUrlResult,
  SignedUrlResult,
  FileMetadata,
  StorageFileType,
  StorageConfig,
} from './interfaces/storage.interface';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    const storageConfig: StorageConfig = {
      accessKeyId:
        this.configService.get<string>('S3_ACCESS_KEY_ID') ||
        this.configService.get<string>('STORAGE_ACCESS_KEY_ID') ||
        '',
      secretAccessKey:
        this.configService.get<string>('S3_SECRET_ACCESS_KEY') ||
        this.configService.get<string>('STORAGE_SECRET_ACCESS_KEY') ||
        '',
      bucket:
        this.configService.get<string>('S3_BUCKET') ||
        this.configService.get<string>('STORAGE_BUCKET') ||
        'dollyfans-local',
      region:
        this.configService.get<string>('S3_REGION') ||
        this.configService.get<string>('STORAGE_REGION') ||
        'auto',
      endpoint:
        this.configService.get<string>('S3_ENDPOINT') ||
        this.configService.get<string>('STORAGE_ENDPOINT'),
      forcePathStyle: true,
    };

    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      region: storageConfig.region,
      endpoint: storageConfig.endpoint,
      forcePathStyle: storageConfig.forcePathStyle,
    });

    this.bucket = storageConfig.bucket;
    this.publicEndpoint =
      this.configService.get<string>('S3_PUBLIC_ENDPOINT') || storageConfig.endpoint || '';

    this.logger.log(`Storage service initialized with bucket: ${this.bucket}`);
  }

  async onModuleInit() {
    if (!this.bucket || !this.s3Client.config.endpoint) return;
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists.`);
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket "${this.bucket}".`);
      } catch (e) {
        this.logger.warn(
          `Could not create bucket "${this.bucket}": ${e instanceof Error ? e.message : 'unknown'}`,
        );
      }
    }
  }

  /** Rewrites S3 endpoint host to a browser-reachable URL (S3_PUBLIC_ENDPOINT) for presigned URLs. */
  rewriteForPublic(url: string): string {
    if (!this.publicEndpoint) return url;
    try {
      const u = new URL(url);
      const pub = new URL(this.publicEndpoint);
      u.protocol = pub.protocol;
      u.host = pub.host;
      return u.toString();
    } catch {
      return url;
    }
  }

  async generateUploadUrl(
    creatorId: string,
    mediaId: string,
    filename: string,
    contentType: string,
    fileType: StorageFileType = StorageFileType.ORIGINAL,
  ): Promise<UploadUrlResult> {
    try {
      const key = this.buildKey(creatorId, mediaId, filename, fileType);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      this.logger.log(`Generated upload URL for key: ${key}, expires: ${expiresAt}`);

      return {
        uploadUrl,
        key,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate upload URL',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<SignedUrlResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

      this.logger.log(`Generated signed URL for key: ${key}, expires: ${expiresAt}`);

      return {
        signedUrl,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate signed URL',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file with key: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get metadata for key: ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to get file metadata');
    }
  }

  async putBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getBuffer(key: string): Promise<Buffer> {
    const res = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    return Buffer.concat(chunks);
  }

  buildProcessedKey(creatorId: string, mediaId: string, filename: string): string {
    return this.buildKey(creatorId, mediaId, filename, StorageFileType.PROCESSED);
  }

  buildThumbnailKey(creatorId: string, mediaId: string, filename: string): string {
    return this.buildKey(creatorId, mediaId, filename, StorageFileType.THUMBNAIL);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  private buildKey(
    creatorId: string,
    mediaId: string,
    filename: string,
    fileType: StorageFileType,
  ): string {
    const fileTypeDir = this.getFileTypeDirectory(fileType);
    return `${fileTypeDir}/${creatorId}/${mediaId}/${filename}`;
  }

  private getFileTypeDirectory(fileType: StorageFileType): string {
    switch (fileType) {
      case StorageFileType.ORIGINAL:
        return 'originals';
      case StorageFileType.PROCESSED:
        return 'processed';
      case StorageFileType.THUMBNAIL:
        return 'thumbnails';
      default:
        return 'originals';
    }
  }
}
