import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

interface AuthenticatedUser {
  orgId: string;
  userId: string;
  role: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // JWT guard sets req.user on authenticated requests.
    // Public routes (health, signup, login) won't have tenant context.
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const orgId = user?.orgId;
    const userId = user?.userId;
    const role = user?.role;

    if (orgId && userId && role) {
      this.tenantService.run({ orgId, userId, role }, async () => next());
    } else {
      next();
    }
  }
}
