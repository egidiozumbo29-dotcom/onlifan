import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiscoverQuery, DiscoverService } from './discover.service';

@Controller('discover')
export class DiscoverController {
  constructor(private readonly service: DiscoverService) {}

  @Get('creators')
  creators(@Query() query: DiscoverQuery) {
    return this.service.creators(query);
  }

  @Get('posts')
  posts(@Query() query: DiscoverQuery) {
    return this.service.searchPosts(query);
  }

  @Get('tags/trending')
  tags() {
    return this.service.trendingTags();
  }

  @UseGuards(JwtAuthGuard)
  @Get('suggestions')
  suggestions(@CurrentUser() user: { id: string }) {
    return this.service.suggestions(user.id);
  }
}
