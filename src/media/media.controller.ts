import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  createUploadUrl(@CurrentUser() user: { id: string }, @Body() dto: CreateUploadUrlDto) {
    return this.mediaService.createUploadUrl(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/confirm-upload')
  confirmUpload(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.mediaService.confirmUpload(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/signed-url')
  getSignedUrl(@CurrentUser() user: { id: string; roles: string[] }, @Param('id') id: string) {
    return this.mediaService.getSignedDeliveryUrl(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/process')
  processMedia(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.mediaService.enqueueProcessing(user.id, id);
  }
}
