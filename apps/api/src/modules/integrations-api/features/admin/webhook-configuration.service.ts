import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WebhookConfigurationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listWebhooks(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)))
      .orderBy(desc(schema.webhooks.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createWebhook(
    orgId: string,
    dto: {
      name: string;
      endpointUrl: string;
      eventType: string;
      secret?: string;
      payloadFormat?: string;
      isEnabled?: boolean;
      retryPolicy?: Record<string, unknown>;
    },
  ) {
    const [row] = await this.db
      .insert(schema.webhooks)
      .values({
        orgId,
        name: dto.name,
        endpointUrl: dto.endpointUrl,
        eventType: dto.eventType,
        secret: dto.secret ?? null,
        payloadFormat: dto.payloadFormat ?? 'json',
        isEnabled: dto.isEnabled ?? true,
        retryPolicy: dto.retryPolicy ?? null,
      })
      .returning();

    return { data: row };
  }

  async getWebhook(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)));

    if (!rows.length) throw new NotFoundException('Webhook not found');

    return { data: rows[0] };
  }

  async updateWebhook(
    orgId: string,
    id: string,
    dto: {
      name?: string;
      endpointUrl?: string;
      eventType?: string;
      secret?: string;
      payloadFormat?: string;
      isEnabled?: boolean;
      retryPolicy?: Record<string, unknown>;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)));

    if (!existing.length) throw new NotFoundException('Webhook not found');

    const [row] = await this.db
      .update(schema.webhooks)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.endpointUrl !== undefined && { endpointUrl: dto.endpointUrl }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.payloadFormat !== undefined && { payloadFormat: dto.payloadFormat }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.retryPolicy !== undefined && { retryPolicy: dto.retryPolicy }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteWebhook(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)));

    if (!existing.length) throw new NotFoundException('Webhook not found');

    const [row] = await this.db
      .update(schema.webhooks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async enableWebhook(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)));

    if (!existing.length) throw new NotFoundException('Webhook not found');

    const [row] = await this.db
      .update(schema.webhooks)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async disableWebhook(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)));

    if (!existing.length) throw new NotFoundException('Webhook not found');

    const [row] = await this.db
      .update(schema.webhooks)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async pingWebhook(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId), eq(schema.webhooks.isActive, true)));

    if (!existing.length) throw new NotFoundException('Webhook not found');

    const [row] = await this.db
      .update(schema.webhooks)
      .set({ lastDeliveryAt: new Date(), lastDeliveryStatus: 'success', updatedAt: new Date() })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
