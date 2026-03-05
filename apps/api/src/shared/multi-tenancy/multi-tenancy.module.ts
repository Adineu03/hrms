import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantService } from './tenant.service';

@Global()
@Module({
  providers: [TenantService],
  exports: [TenantService],
})
export class MultiTenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
