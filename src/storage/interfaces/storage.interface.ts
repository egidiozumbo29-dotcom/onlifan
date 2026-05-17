export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
  expiresAt: Date;
}

export interface SignedUrlResult {
  signedUrl: string;
  expiresAt: Date;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
}

export enum StorageFileType {
  ORIGINAL = 'original',
  PROCESSED = 'processed',
  THUMBNAIL = 'thumbnail',
}

export interface StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}
