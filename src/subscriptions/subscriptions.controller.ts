import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  listMine(@CurrentUser() user: { id: string }) {
    return this.subscriptionsService.listMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':creatorId/checkout')
  checkout(@CurrentUser() user: { id: string }, @Param('creatorId') creatorId: string) {
    return this.subscriptionsService.createCheckout(user.id, creatorId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':subscriptionId/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionsService.cancel(user.id, subscriptionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('creators/:creatorId/status')
  status(@CurrentUser() user: { id: string }, @Param('creatorId') creatorId: string) {
    return this.subscriptionsService.hasActiveAccess(user.id, creatorId);
  }
}
