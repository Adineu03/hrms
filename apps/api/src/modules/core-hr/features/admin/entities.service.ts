import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { entities } from '../../../../infrastructure/database/schema/entities';

@Injectable()
export class EntitiesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string) {
    const rows = await this.db
      .select()
      .from(entities)
      .where(eq(entities.orgId, orgId))
      .orderBy(entities.name);

    return rows.map((r) => this.toDto(r));
  }

  async getById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(entities)
      .where(and(eq(entities.id, id), eq(entities.orgId, orgId)))
      .limit(1);

    if (!row) throw new NotFoundException('Entity not found');
    return this.toDto(row);
  }

  async create(orgId: string, data: {
    name: string;
    legalName?: string;
    registrationNumber?: string;
    taxId?: string;
    country: string;
    address?: string;
    city?: string;
    state?: string;
    currency?: string;
    isPrimary?: boolean;
    config?: Record<string, any>;
  }) {
    const now = new Date();
    const [inserted] = await this.db
      .insert(entities)
      .values({
        orgId,
        name: data.name,
        legalName: data.legalName ?? null,
        registrationNumber: data.registrationNumber ?? null,
        taxId: data.taxId ?? null,
        country: data.country,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        currency: data.currency ?? 'INR',
        isPrimary: data.isPrimary ?? false,
        isActive: true,
        config: data.config ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toDto(inserted);
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(entities)
      .where(and(eq(entities.id, id), eq(entities.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Entity not found');

    const now = new Date();
    const updateValues: Record<string, any> = { updatedAt: now };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.legalName !== undefined) updateValues.legalName = data.legalName;
    if (data.registrationNumber !== undefined) updateValues.registrationNumber = data.registrationNumber;
    if (data.taxId !== undefined) updateValues.taxId = data.taxId;
    if (data.country !== undefined) updateValues.country = data.country;
    if (data.address !== undefined) updateValues.address = data.address;
    if (data.city !== undefined) updateValues.city = data.city;
    if (data.state !== undefined) updateValues.state = data.state;
    if (data.currency !== undefined) updateValues.currency = data.currency;
    if (data.isPrimary !== undefined) updateValues.isPrimary = data.isPrimary;
    if (data.config !== undefined) updateValues.config = data.config;

    const [updated] = await this.db
      .update(entities)
      .set(updateValues)
      .where(and(eq(entities.id, id), eq(entities.orgId, orgId)))
      .returning();

    return this.toDto(updated);
  }

  async deactivate(orgId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.id, id), eq(entities.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Entity not found');

    const now = new Date();
    await this.db
      .update(entities)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(entities.id, id), eq(entities.orgId, orgId)));
  }

  private toDto(row: typeof entities.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      legalName: row.legalName ?? undefined,
      registrationNumber: row.registrationNumber ?? undefined,
      taxId: row.taxId ?? undefined,
      country: row.country,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      currency: row.currency ?? undefined,
      isPrimary: row.isPrimary,
      isActive: row.isActive,
      config: row.config ?? {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
