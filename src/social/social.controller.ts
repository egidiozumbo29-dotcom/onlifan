import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SocialService } from './social.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SocialController {
  constructor(private readonly service: SocialService) {}

  @Post('follow/:userId')
  follow(@CurrentUser() user: { id: string }, @Param('userId') id: string) {
    return this.service.follow(user.id, id);
  }

  @Delete('follow/:userId')
  unfollow(@CurrentUser() user: { id: string }, @Param('userId') id: string) {
    return this.service.unfollow(user.id, id);
  }

  @Get('follow/:userId/status')
  status(@CurrentUser() user: { id: string }, @Param('userId') id: string) {
    return this.service.isFollowing(user.id, id);
  }

  @Get('users/:userId/followers')
  followers(@Param('userId') id: string, @Query('cursor') cursor?: string) {
    return this.service.followers(id, cursor);
  }

  @Get('users/:userId/following')
  following(@Param('userId') id: string, @Query('cursor') cursor?: string) {
    return this.service.following(id, cursor);
  }

  @Post('block/:userId')
  block(
    @CurrentUser() user: { id: string },
    @Param('userId') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.block(user.id, id, body.reason);
  }

  @Delete('block/:userId')
  unblock(@CurrentUser() user: { id: string }, @Param('userId') id: string) {
    return this.service.unblock(user.id, id);
  }

  @Get('blocks')
  blocks(@CurrentUser() user: { id: string }) {
    return this.service.listBlocks(user.id);
  }
}
