import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';

@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.service.getOrCreateMine(user.id);
  }

  @Get('stats')
  stats(@CurrentUser() user: { id: string }) {
    return this.service.stats(user.id);
  }

  @Post('attribute')
  attribute(@CurrentUser() user: { id: string }, @Body() body: { code: string }) {
    return this.service.attribute(user.id, body.code);
  }
}
