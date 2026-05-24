import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get('balance')
  balance(@CurrentUser() user: { id: string }) {
    return this.service.getBalance(user.id);
  }

  @Get('transactions')
  txs(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listTransactions(user.id, cursor, limit ? parseInt(limit, 10) : 50);
  }

  @Post('top-up')
  topUp(@CurrentUser() user: { id: string }, @Body() body: { amountCents: number }) {
    return this.service.topUp(user.id, body.amountCents);
  }
}
