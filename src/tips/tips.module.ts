import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TipsController } from './tips.controller';
import { TipsService } from './tips.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
