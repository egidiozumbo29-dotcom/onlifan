import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SchedulePostDto, SchedulerService } from './scheduler.service';

@UseGuards(JwtAuthGuard)
@Controller('scheduled-posts')
export class SchedulerController {
  constructor(private readonly service: SchedulerService) {}

  @Post()
  schedule(@CurrentUser() user: { id: string }, @Body() dto: SchedulePostDto) {
    return this.service.schedule(user.id, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.service.listMine(user.id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.cancel(user.id, id);
  }
}
