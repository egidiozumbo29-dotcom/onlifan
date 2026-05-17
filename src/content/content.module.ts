import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
