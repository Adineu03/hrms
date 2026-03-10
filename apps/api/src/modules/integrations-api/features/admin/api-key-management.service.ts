import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

function randomHex(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

@Injectable()
export class ApiKeyManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listApiKeys(orgId: string) {
    const rows = await this.db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        keyPrefix: schema.apiKeys.keyPrefix,
        scopes: schema.apiKeys.scopes,
        expiresAt: schema.apiKeys.expiresAt,
        rateLimitPerMin: schema.apiKeys.rateLimitPerMin,
        ipWhitelist: schema.apiKeys.ipWhitelist,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        usageCount: schema.apiKeys.usageCount,
        rotationReminderDays: schema.apiKeys.rotationReminderDays,
        revokedAt: schema.apiKeys.revokedAt,
        revokedBy: schema.apiKeys.revokedBy,
        createdBy: schema.apiKeys.createdBy,
        status: schema.apiKeys.status,
        isActive: schema.apiKeys.isActive,
        createdAt: schema.apiKeys.createdAt,
        updatedAt: schema.apiKeys.updatedAt,
      })
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.orgId, orgId), eq(schema.apiKeys.isActive, true)))
      .orderBy(desc(schema.apiKeys.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createApiKey(
    orgId: string,
    dto: {
      name: string;
      scopes: string[];
      expiresAt?: string;
      rateLimitPerMin?: number;
      ipWhitelist?: string[];
      rotationReminderDays?: number;
    },
    userId: string,
  ) {
    const fullKey = randomHex(64);
    const keyPrefix = fullKey.substring(0, 8);
    const keyHash = fullKey; // mock — not actually hashed

    const [row] = await this.db
      .insert(schema.apiKeys)
      .values({
        orgId,
        name: dto.name,
        keyPrefix,
        keyHash,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        rateLimitPerMin: dto.rateLimitPerMin ?? 60,
        ipWhitelist: dto.ipWhitelist ?? null,
        rotationReminderDays: dto.rotationReminderDays ?? 90,
        createdBy: userId,
        status: 'active',
      })
      .returning();

    // Return the full key only on creation — never again
    return { data: { ...row, fullKey } };
  }

  async getApiKey(orgId: string, id: string) {
    const rows = await this.db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        keyPrefix: schema.apiKeys.keyPrefix,
        scopes: schema.apiKeys.scopes,
        expiresAt: schema.apiKeys.expiresAt,
        rateLimitPerMin: schema.apiKeys.rateLimitPerMin,
        ipWhitelist: schema.apiKeys.ipWhitelist,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        usageCount: schema.apiKeys.usageCount,
        rotationReminderDays: schema.apiKeys.rotationReminderDays,
        revokedAt: schema.apiKeys.revokedAt,
        revokedBy: schema.apiKeys.revokedBy,
        createdBy: schema.apiKeys.createdBy,
        status: schema.apiKeys.status,
        isActive: schema.apiKeys.isActive,
        createdAt: schema.apiKeys.createdAt,
        updatedAt: schema.apiKeys.updatedAt,
      })
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.orgId, orgId), eq(schema.apiKeys.isActive, true)));

    if (!rows.length) throw new NotFoundException('API key not found');

    return { data: rows[0] };
  }

  async revokeApiKey(orgId: string, id: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.orgId, orgId), eq(schema.apiKeys.isActive, true)));

    if (!existing.length) throw new NotFoundException('API key not found');

    const [row] = await this.db
      .update(schema.apiKeys)
      .set({ status: 'revoked', revokedAt: new Date(), revokedBy: userId, updatedAt: new Date() })
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async rotateApiKey(orgId: string, id: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.orgId, orgId), eq(schema.apiKeys.isActive, true)));

    if (!existing.length) throw new NotFoundException('API key not found');

    const old = existing[0];

    // Revoke the old key
    await this.db
      .update(schema.apiKeys)
      .set({ status: 'revoked', revokedAt: new Date(), revokedBy: userId, updatedAt: new Date() })
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.orgId, orgId)));

    // Create new key with same name and scopes
    const fullKey = randomHex(64);
    const keyPrefix = fullKey.substring(0, 8);
    const keyHash = fullKey;

    const [newRow] = await this.db
      .insert(schema.apiKeys)
      .values({
        orgId,
        name: old.name,
        keyPrefix,
        keyHash,
        scopes: old.scopes as string[],
        expiresAt: old.expiresAt ?? null,
        rateLimitPerMin: old.rateLimitPerMin,
        ipWhitelist: old.ipWhitelist as string[] ?? null,
        rotationReminderDays: old.rotationReminderDays,
        createdBy: userId,
        status: 'active',
      })
      .returning();

    return { data: { ...newRow, fullKey } };
  }
}
