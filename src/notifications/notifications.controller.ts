import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly push: PushService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.id, cursor, limit ? parseInt(limit, 10) : 30);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: { id: string }) {
    return this.service.unreadCount(user.id).then((count) => ({ count }));
  }

  @Post('read')
  markRead(@CurrentUser() user: { id: string }, @Body() body: { ids?: string[] }) {
    return this.service.markRead(user.id, body.ids ?? []);
  }

  @Post('push/subscribe')
  subscribe(
    @CurrentUser() user: { id: string },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    return this.push.subscribe(user.id, body, body.userAgent);
  }

  @Delete('push/subscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.push.unsubscribe(body.endpoint);
  }
}
