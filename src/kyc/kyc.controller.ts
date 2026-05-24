import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { KycService, StartKycDto } from './kyc.service';

@Controller('kyc')
export class KycController {
  constructor(private readonly service: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  start(@CurrentUser() user: { id: string }, @Body() dto: StartKycDto) {
    return this.service.start(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@CurrentUser() user: { id: string }) {
    return this.service.getMyStatus(user.id);
  }

  // Admin endpoints
  @UseGuards(JwtAuthGuard)
  @Get('admin/pending')
  pending() {
    return this.service.listPending();
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/:id/approve')
  approve(@Param('id') id: string, @Body() body: { providerRef?: string }) {
    return this.service.approve(id, body.providerRef);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/:id/reject')
  reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.reject(id, body.reason);
  }
}
