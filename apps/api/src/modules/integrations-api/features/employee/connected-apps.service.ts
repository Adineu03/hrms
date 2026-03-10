import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ConnectedAppsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listConnectedApps(orgId: string, userId: string) {
    const rows = await this.db
      .select({
        id: schema.oauthApps.id,
        appName: schema.oauthApps.appName,
        clientId: schema.oauthApps.clientId,
        redirectUris: schema.oauthApps.redirectUris,
        scopes: schema.oauthApps.scopes,
        description: schema.oauthApps.description,
        logoUrl: schema.oauthApps.logoUrl,
        ownerEmail: schema.oauthApps.ownerEmail,
        isPublic: schema.oauthApps.isPublic,
        authorizedUserCount: schema.oauthApps.authorizedUserCount,
        lastUsedAt: schema.oauthApps.lastUsedAt,
        status: schema.oauthApps.status,
        createdAt: schema.oauthApps.createdAt,
      })
      .from(schema.oauthApps)
      .where(and(eq(schema.oauthApps.orgId, orgId), eq(schema.oauthApps.isActive, true)))
      .orderBy(desc(schema.oauthApps.lastUsedAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async revokeAppAccess(orgId: string, id: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.oauthApps)
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId), eq(schema.oauthApps.isActive, true)));

    if (!existing.length) throw new NotFoundException('App not found');

    const [row] = await this.db
      .update(schema.oauthApps)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
