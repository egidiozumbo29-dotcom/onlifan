import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStreamDto, LiveService } from './live.service';

@Controller('live')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Get()
  list() {
    return this.service.listLive();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateStreamDto) {
    return this.service.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  start(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.start(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/end')
  end(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.end(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/viewer-token')
  viewer(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.getViewerToken(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/creator-token')
  creator(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.getCreatorToken(user.id, id);
  }
}
