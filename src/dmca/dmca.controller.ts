import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DmcaStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDmcaDto, DmcaService } from './dmca.service';

@Controller('dmca')
export class DmcaController {
  constructor(private readonly service: DmcaService) {}

  @Post()
  create(@Body() dto: CreateDmcaDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  list(@Query('status') status?: DmcaStatus) {
    return this.service.list(status);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/:id/resolve')
  resolve(@Param('id') id: string, @Body() body: { status: DmcaStatus }) {
    return this.service.resolve(id, body.status);
  }
}
