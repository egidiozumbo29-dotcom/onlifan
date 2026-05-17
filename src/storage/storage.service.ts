import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
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
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const storageConfig: StorageConfig = {
      accessKeyId: this.configService.get<string>('STORAGE_ACCESS_KEY_ID') || '',
      secretAccessKey: this.configService.get<string>('STORAGE_SECRET_ACCESS_KEY') || '',
      bucket: this.configService.get<string>('STORAGE_BUCKET') || '',
      region: this.configService.get<string>('STORAGE_REGION') || 'auto',
      endpoint: this.configService.get<string>('STORAGE_ENDPOINT'),
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

    this.logger.log(`Storage service initialized with bucket: ${this.bucket}`);
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
