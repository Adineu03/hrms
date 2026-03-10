import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantService } from './tenant.service';

interface JwtUser {
  orgId?: string;
  userId?: string;
  role?: string;
}

/**
 * Runs AFTER JwtAuthGuard (interceptors execute post-guard).
 * Wraps the handler call inside AsyncLocalStorage so every service
 * that calls TenantService.getOrgId() / getUserId() finds the context.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantService: TenantService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = req.user;

    if (!(user?.orgId && user?.userId && user?.role)) {
      return next.handle();
    }

    const ctx = {
      orgId: user.orgId,
      userId: user.userId,
      role: user.role,
    };

    return new Observable((subscriber) => {
      this.tenantService.run(ctx, async () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
