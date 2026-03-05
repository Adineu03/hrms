import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  orgId: string;
  userId: string;
  role: string;
}

@Injectable()
export class TenantService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run(context: TenantContext, callback: () => Promise<void>) {
    return this.storage.run(context, callback);
  }

  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getOrgId(): string | undefined {
    return this.storage.getStore()?.orgId;
  }

  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  getRole(): string | undefined {
    return this.storage.getStore()?.role;
  }
}
