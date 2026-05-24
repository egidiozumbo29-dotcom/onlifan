import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';

@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly service: StoriesService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateStoryDto) {
    return this.service.create(user.id, dto);
  }

  @Get('feed')
  feed(@CurrentUser() user: { id: string }) {
    return this.service.listForViewer(user.id);
  }

  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.service.listMine(user.id);
  }

  @Post(':id/view')
  view(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.view(user.id, id);
  }

  @Post(':id/reply')
  reply(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.service.reply(user.id, id, body.body);
  }
}
