import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Allow JSON.stringify to handle BigInt (Prisma returns BigInt for some columns).
// Convert to string to avoid precision loss; clients can parse if needed.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TimingMiddleware } from './common/middleware/timing.middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  // CORS: comma-separated list of allowed origins, e.g. "https://app.com,https://staging.app.com".
  // For dev convenience, "*" or empty allows any origin.
  const corsRaw = config.get<string>('APP_URL') ?? '*';
  const allowedOrigins = corsRaw === '*' ? true : corsRaw.split(',').map((s) => s.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Apply middleware (bind to preserve `this` context for logger access)
  const requestIdMw = new RequestIdMiddleware();
  const loggingMw = new LoggingMiddleware();
  const timingMw = new TimingMiddleware();
  app.use(requestIdMw.use.bind(requestIdMw));
  app.use(loggingMw.use.bind(loggingMw));
  app.use(timingMw.use.bind(timingMw));

  // Apply global interceptors
  app.useGlobalInterceptors(new TransformInterceptor(), new TimeoutInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Render/Heroku/Railway expose the public port as PORT; APP_PORT takes precedence locally.
  const port = Number(process.env.APP_PORT ?? process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
