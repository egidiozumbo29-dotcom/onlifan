import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageFileType } from './interfaces/storage.interface';

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  async generateUploadUrl(
    @Body()
    body: {
      creatorId: string;
      mediaId: string;
      filename: string;
      contentType: string;
      fileType?: StorageFileType;
    },
  ) {
    return this.storageService.generateUploadUrl(
      body.creatorId,
      body.mediaId,
      body.filename,
      body.contentType,
      body.fileType,
    );
  }

  @Get('signed-url/:key')
  async generateSignedUrl(@Param('key') key: string) {
    return this.storageService.generateSignedUrl(key);
  }

  @Delete('file/:key')
  @Roles('CREATOR', 'ADMIN')
  async deleteFile(@Param('key') key: string) {
    await this.storageService.deleteFile(key);
    return { message: 'File deleted successfully' };
  }

  @Get('metadata/:key')
  async getFileMetadata(@Param('key') key: string) {
    return this.storageService.getFileMetadata(key);
  }
}
