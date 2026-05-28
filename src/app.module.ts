import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ChatModule } from './chat/chat.module';
import { TipsModule } from './tips/tips.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SocialModule } from './social/social.module';
import { StoriesModule } from './stories/stories.module';
import { BundlesModule } from './bundles/bundles.module';
import { PromosModule } from './promos/promos.module';
import { DiscoverModule } from './discover/discover.module';
import { WalletModule } from './wallet/wallet.module';
import { ReferralsModule } from './referrals/referrals.module';
import { KycModule } from './kyc/kyc.module';
import { LiveModule } from './live/live.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DmcaModule } from './dmca/dmca.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AIModule } from './ai/ai.module';
import { PaymentsAdapterModule } from './payments-adapters/payments-adapter.module';
import { OwnerHubModule } from './owner-hub/owner-hub.module';

function parseRedisConfig() {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const u = new URL(url);
      return {
        redis: {
          host: u.hostname,
          port: u.port ? parseInt(u.port, 10) : 6379,
          password: u.password ? decodeURIComponent(u.password) : undefined,
          username: u.username ? decodeURIComponent(u.username) : undefined,
          tls: u.protocol === 'rediss:' ? {} : undefined,
        },
      };
    } catch {
      // fallthrough to host/port
    }
  }
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  };
}

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRoot(parseRedisConfig()),
    ScheduleModule.forRoot(),
    OwnerHubModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    SubscriptionsModule,
    PaymentsModule,
    PaymentsAdapterModule,
    ContentModule,
    MediaModule,
    JobsModule,
    StorageModule,
    AdminModule,
    NotificationsModule,
    ChatModule,
    TipsModule,
    SocialModule,
    StoriesModule,
    BundlesModule,
    PromosModule,
    DiscoverModule,
    WalletModule,
    ReferralsModule,
    KycModule,
    LiveModule,
    SchedulerModule,
    DmcaModule,
    AnalyticsModule,
    AIModule,
  ],
})
export class AppModule {}
