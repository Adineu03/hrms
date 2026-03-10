import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OauthAppRegistryService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listApps(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.oauthApps)
      .where(and(eq(schema.oauthApps.orgId, orgId), eq(schema.oauthApps.isActive, true)))
      .orderBy(desc(schema.oauthApps.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createApp(
    orgId: string,
    dto: {
      appName: string;
      clientId: string;
      clientSecretHash: string;
      redirectUris: string[];
      scopes: string[];
      description?: string;
      logoUrl?: string;
      ownerEmail?: string;
      isPublic?: boolean;
    },
  ) {
    const [row] = await this.db
      .insert(schema.oauthApps)
      .values({
        orgId,
        appName: dto.appName,
        clientId: dto.clientId,
        clientSecretHash: dto.clientSecretHash,
        redirectUris: dto.redirectUris,
        scopes: dto.scopes,
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
        ownerEmail: dto.ownerEmail ?? null,
        isPublic: dto.isPublic ?? false,
        status: 'active',
      })
      .returning();

    return { data: row };
  }

  async getApp(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.oauthApps)
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId), eq(schema.oauthApps.isActive, true)));

    if (!rows.length) throw new NotFoundException('OAuth app not found');

    return { data: rows[0] };
  }

  async updateApp(
    orgId: string,
    id: string,
    dto: {
      appName?: string;
      redirectUris?: string[];
      scopes?: string[];
      description?: string;
      logoUrl?: string;
      ownerEmail?: string;
      isPublic?: boolean;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.oauthApps)
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId), eq(schema.oauthApps.isActive, true)));

    if (!existing.length) throw new NotFoundException('OAuth app not found');

    const [row] = await this.db
      .update(schema.oauthApps)
      .set({
        ...(dto.appName !== undefined && { appName: dto.appName }),
        ...(dto.redirectUris !== undefined && { redirectUris: dto.redirectUris }),
        ...(dto.scopes !== undefined && { scopes: dto.scopes }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.ownerEmail !== undefined && { ownerEmail: dto.ownerEmail }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async revokeApp(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.oauthApps)
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId), eq(schema.oauthApps.isActive, true)));

    if (!existing.length) throw new NotFoundException('OAuth app not found');

    const [row] = await this.db
      .update(schema.oauthApps)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
