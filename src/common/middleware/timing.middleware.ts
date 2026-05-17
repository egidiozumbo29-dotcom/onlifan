import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Timing');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        this.logger.warn(`Slow request: ${method} ${originalUrl} - ${statusCode} - ${duration}ms`);
      }
    });

    next();
  }
}
