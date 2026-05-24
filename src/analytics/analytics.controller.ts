import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: { id: string }, @Query('days') days?: string) {
    return this.service.creatorOverview(user.id, days ? parseInt(days, 10) : 30);
  }

  @Get('revenue')
  revenue(@CurrentUser() user: { id: string }, @Query('days') days?: string) {
    return this.service.revenueTimeseries(user.id, days ? parseInt(days, 10) : 30);
  }
}
