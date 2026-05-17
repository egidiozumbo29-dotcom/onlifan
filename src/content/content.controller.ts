import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';

@Controller('posts')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto) {
    return this.contentService.createPost(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed/subscribed')
  subscribedFeed(
    @CurrentUser() user: { id: string; roles: string[] },
    @Query() query: FeedQueryDto,
  ) {
    return this.contentService.getSubscribedFeed(user, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: { id: string; roles: string[] }, @Param('id') id: string) {
    return this.contentService.findPostForViewer(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  like(@CurrentUser() user: { id: string; roles: string[] }, @Param('id') id: string) {
    return this.contentService.likePost(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  unlike(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.contentService.unlikePost(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  comment(
    @CurrentUser() user: { id: string; roles: string[] },
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.contentService.createComment(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/comments')
  comments(@Param('id') id: string, @Query() query: FeedQueryDto) {
    return this.contentService.getComments(id, query);
  }
}
