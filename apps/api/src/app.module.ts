import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { MultiTenancyModule } from './shared/multi-tenancy/multi-tenancy.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule,
    QueueModule,
    MultiTenancyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
