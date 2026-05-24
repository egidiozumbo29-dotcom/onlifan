import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePromoDto, PromosService } from './promos.service';

@UseGuards(JwtAuthGuard)
@Controller('promos')
export class PromosController {
  constructor(private readonly service: PromosService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePromoDto) {
    return this.service.create(user.id, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.service.listMine(user.id);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.revoke(user.id, id);
  }

  @Post('redeem')
  redeem(@CurrentUser() user: { id: string }, @Body() body: { code: string }) {
    return this.service.redeem(user.id, body.code);
  }
}
