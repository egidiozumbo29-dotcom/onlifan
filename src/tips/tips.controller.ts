import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';

@Controller('tips')
export class TipsController {
  constructor(private readonly service: TipsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateTipDto) {
    return this.service.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/received')
  listMine(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listForCreator(user.id, cursor, limit ? parseInt(limit, 10) : 50);
  }

  @Get('leaderboard/:creatorId')
  leaderboard(@Param('creatorId') creatorId: string, @Query('limit') limit?: string) {
    return this.service.leaderboard(creatorId, limit ? parseInt(limit, 10) : 10);
  }
}
