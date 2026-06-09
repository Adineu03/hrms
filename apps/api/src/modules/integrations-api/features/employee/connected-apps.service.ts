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

    const data = rows.map((r) => ({
      id: r.id,
      appName: r.appName ?? '',
      scopes: (r.scopes as string[] | null) ?? [],
      lastAccessed: r.lastUsedAt ? this.fmtDate(r.lastUsedAt) : 'Never',
      authorizedAt: r.createdAt ? this.fmtDate(r.createdAt) : '—',
      logoInitial: this.logoInitial(r.appName),
    }));

    return { data, meta: { total: data.length } };
  }

  private fmtDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private logoInitial(name: string | null): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
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
