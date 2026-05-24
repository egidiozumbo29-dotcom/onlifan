import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BundlesService, UpsertBundleDto } from './bundles.service';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly service: BundlesService) {}

  @Get('creator/:creatorId')
  list(@Param('creatorId') id: string) {
    return this.service.listForCreator(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  upsert(@CurrentUser() user: { id: string }, @Body() dto: UpsertBundleDto) {
    return this.service.upsert(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
