import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  root() {
    return {
      name: 'DollyFans API',
      status: 'ok',
      docs: 'See ARCHITECTURE.md',
      endpoints: [
        'POST /auth/register',
        'POST /auth/login',
        'GET  /auth/me',
        'GET  /creators',
        'GET  /creators/:username',
        'GET  /creators/:username/posts',
        'POST /creators/apply',
        'POST /subscriptions/:creatorId/checkout',
        'GET  /posts/feed/subscribed',
        'GET  /health',
      ],
    };
  }

  @Get('health')
  async health() {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (e) {
      checks.database = `error: ${(e as Error).message}`;
    }
    try {
      await this.redis.client.ping();
      checks.redis = 'ok';
    } catch (e) {
      checks.redis = `error: ${(e as Error).message}`;
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    return { status: allOk ? 'ok' : 'degraded', checks };
  }
}
