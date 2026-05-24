import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { EmailProcessor } from './jobs.processor';
import { VideoTranscodeProcessor } from './video.processor';
import { JobQueue } from './interfaces/job.interface';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue(
      {
        name: JobQueue.VIDEO_PROCESSING,
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      },
      {
        name: JobQueue.EMAIL,
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      },
      {
        name: JobQueue.PAYMENT_RECONCILIATION,
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      },
      {
        name: JobQueue.SUBSCRIPTION_REMINDER,
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      },
    ),
  ],
  providers: [JobsService, EmailProcessor, VideoTranscodeProcessor],
  exports: [JobsService],
})
export class JobsModule {}
