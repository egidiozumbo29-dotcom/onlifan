import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [NotificationsModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
