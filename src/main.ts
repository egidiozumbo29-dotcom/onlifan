import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TimingMiddleware } from './common/middleware/timing.middleware';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('APP_URL') ?? true,
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

  const port = config.get<number>('APP_PORT') ?? 4000;
  await app.listen(port);
}

bootstrap();
