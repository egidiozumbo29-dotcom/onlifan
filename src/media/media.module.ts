import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
