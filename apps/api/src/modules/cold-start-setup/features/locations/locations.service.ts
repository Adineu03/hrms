import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { LocationData } from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { locations } from '../../../../infrastructure/database/schema/locations';

@Injectable()
export class LocationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string): Promise<LocationData[]> {
    const rows = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.orgId, orgId), eq(locations.isActive, true)))
      .orderBy(desc(locations.isPrimary), asc(locations.name));

    return rows.map((row) => this.toLocationData(row));
  }

  async getById(orgId: string, id: string): Promise<LocationData> {
    const [row] = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.orgId, orgId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Location not found');
    }

    return this.toLocationData(row);
  }

  async create(orgId: string, data: LocationData): Promise<LocationData> {
    const now = new Date();
    const [inserted] = await this.db
      .insert(locations)
      .values({
        orgId,
        name: data.name,
        code: data.code ?? null,
        type: data.type ?? 'office',
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        country: data.country ?? null,
        postalCode: data.postalCode ?? null,
        timezone: data.timezone ?? null,
        latitude: data.latitude != null ? String(data.latitude) : null,
        longitude: data.longitude != null ? String(data.longitude) : null,
        geoFenceRadius:
          data.geoFenceRadius != null ? String(data.geoFenceRadius) : null,
        isPrimary: data.isPrimary ?? false,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toLocationData(inserted);
  }

  async update(
    orgId: string,
    id: string,
    data: Partial<LocationData>,
  ): Promise<LocationData> {
    const [existing] = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.orgId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    const now = new Date();
    const updateValues: Record<string, any> = { updatedAt: now };

    if (data.name !== undefined) updateValues.name = data.name;
    if (data.code !== undefined) updateValues.code = data.code;
    if (data.type !== undefined) updateValues.type = data.type;
    if (data.address !== undefined) updateValues.address = data.address;
    if (data.city !== undefined) updateValues.city = data.city;
    if (data.state !== undefined) updateValues.state = data.state;
    if (data.country !== undefined) updateValues.country = data.country;
    if (data.postalCode !== undefined) updateValues.postalCode = data.postalCode;
    if (data.timezone !== undefined) updateValues.timezone = data.timezone;
    if (data.latitude !== undefined)
      updateValues.latitude =
        data.latitude != null ? String(data.latitude) : null;
    if (data.longitude !== undefined)
      updateValues.longitude =
        data.longitude != null ? String(data.longitude) : null;
    if (data.geoFenceRadius !== undefined)
      updateValues.geoFenceRadius =
        data.geoFenceRadius != null ? String(data.geoFenceRadius) : null;
    if (data.isPrimary !== undefined) updateValues.isPrimary = data.isPrimary;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;

    const [updated] = await this.db
      .update(locations)
      .set(updateValues)
      .where(and(eq(locations.id, id), eq(locations.orgId, orgId)))
      .returning();

    return this.toLocationData(updated);
  }

  async remove(orgId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.orgId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Location not found');
    }

    const now = new Date();
    await this.db
      .update(locations)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(locations.id, id), eq(locations.orgId, orgId)));
  }

  async bulkCreate(
    orgId: string,
    dataList: LocationData[],
  ): Promise<LocationData[]> {
    if (dataList.length === 0) {
      return [];
    }

    const now = new Date();
    const rows = dataList.map((data) => ({
      orgId,
      name: data.name,
      code: data.code ?? null,
      type: data.type ?? 'office',
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      postalCode: data.postalCode ?? null,
      timezone: data.timezone ?? null,
      latitude: data.latitude != null ? String(data.latitude) : null,
      longitude: data.longitude != null ? String(data.longitude) : null,
      geoFenceRadius:
        data.geoFenceRadius != null ? String(data.geoFenceRadius) : null,
      isPrimary: data.isPrimary ?? false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    const inserted = await this.db
      .insert(locations)
      .values(rows)
      .returning();

    return inserted.map((row) => this.toLocationData(row));
  }

  private toLocationData(row: typeof locations.$inferSelect): LocationData {
    return {
      id: row.id,
      name: row.name,
      code: row.code ?? undefined,
      type: row.type,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      country: row.country ?? undefined,
      postalCode: row.postalCode ?? undefined,
      timezone: row.timezone ?? undefined,
      latitude: row.latitude != null ? Number(row.latitude) : undefined,
      longitude: row.longitude != null ? Number(row.longitude) : undefined,
      geoFenceRadius:
        row.geoFenceRadius != null ? Number(row.geoFenceRadius) : undefined,
      isPrimary: row.isPrimary,
      isActive: row.isActive,
    };
  }
}
