import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, any>();
  private readonly ttl = 60000; // 1 minute default TTL

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    // Check cache
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse) {
      // Return cached response if still valid
      if (Date.now() - cachedResponse.timestamp < this.ttl) {
        request.cachedResponse = cachedResponse.data;
        return next.handle();
      }
      // Remove expired cache
      this.cache.delete(cacheKey);
    }

    return next.handle().pipe(
      tap((data) => {
        // Cache the response
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const { method, url, query } = request;
    return `${method}:${url}:${JSON.stringify(query)}`;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
