import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get('REDIS_URL', 'redis://localhost:6379');
        const redis = new Redis(url, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 5) return null; // stop retrying after 5 attempts
            return Math.min(times * 500, 3000);
          },
          reconnectOnError() {
            return true;
          },
          lazyConnect: true,
        });
        let errorLogged = false;
        redis.on('error', (err) => {
          if (!errorLogged) {
            console.warn('[Redis] Connection error (suppressing further logs):', err.message);
            errorLogged = true;
          }
        });
        redis.on('connect', () => {
          errorLogged = false;
          console.log('[Redis] Connected successfully');
        });
        redis.connect().catch(() => {
          console.warn('[Redis] Initial connection failed — app will work without cache');
        });
        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class CacheModule {}
