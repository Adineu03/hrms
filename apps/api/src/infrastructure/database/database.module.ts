import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = postgres(config.getOrThrow<string>('DATABASE_URL'));
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
