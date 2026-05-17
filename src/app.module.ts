import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { CreatorsModule } from './creators/creators.module';
import { JobsModule } from './jobs/jobs.module';
import { MediaModule } from './media/media.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    SubscriptionsModule,
    PaymentsModule,
    ContentModule,
    MediaModule,
    JobsModule,
    StorageModule,
    AdminModule,
  ],
})
export class AppModule {}
