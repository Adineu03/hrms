import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class HolidayCalendarMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(
    orgId: string,
    filters: { year?: string; locationId?: string; type?: string },
  ) {
    const conditions: any[] = [eq(schema.holidayCalendars.orgId, orgId)];

    if (filters.year) {
      conditions.push(eq(schema.holidayCalendars.year, filters.year));
    }
    if (filters.type) {
      conditions.push(eq(schema.holidayCalendars.type, filters.type));
    }

    const rows = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(and(...conditions))
      .orderBy(desc(schema.holidayCalendars.date));

    // Filter by location in-memory (applicableLocations is JSONB array)
    let filtered = rows;
    if (filters.locationId) {
      filtered = filtered.filter((r) => {
        const locations = (r.applicableLocations as string[]) ?? [];
        return locations.length === 0 || locations.includes(filters.locationId!);
      });
    }

    return filtered.map((r) => this.toDto(r));
  }

  async getById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.id, id),
          eq(schema.holidayCalendars.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Holiday not found');
    return this.toDto(row);
  }

  async create(orgId: string, data: Record<string, any>) {
    if (!data.name || !data.date) {
      throw new BadRequestException('name and date are required');
    }

    const dateStr = data.date as string;
    const year = data.year ?? dateStr.substring(0, 4);

    const [created] = await this.db
      .insert(schema.holidayCalendars)
      .values({
        orgId,
        name: data.name,
        date: dateStr,
        type: data.type ?? 'national',
        isOptional: data.isOptional ?? false,
        isFloating: data.isFloating ?? false,
        applicableLocations: data.applicableLocations ?? [],
        applicableDepartments: data.applicableDepartments ?? [],
        year,
        description: data.description ?? null,
      })
      .returning();

    return this.toDto(created);
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.id, id),
          eq(schema.holidayCalendars.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Holiday not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'date', 'type', 'isOptional', 'isFloating',
      'applicableLocations', 'applicableDepartments', 'year', 'description',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    // If date changed but year not explicitly provided, derive year from new date
    if (data.date && !data.year) {
      updates.year = (data.date as string).substring(0, 4);
    }

    const [updated] = await this.db
      .update(schema.holidayCalendars)
      .set(updates)
      .where(
        and(
          eq(schema.holidayCalendars.id, id),
          eq(schema.holidayCalendars.orgId, orgId),
        ),
      )
      .returning();

    return this.toDto(updated);
  }

  async remove(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.id, id),
          eq(schema.holidayCalendars.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Holiday not found');

    await this.db
      .delete(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.id, id),
          eq(schema.holidayCalendars.orgId, orgId),
        ),
      );

    return { success: true, message: 'Holiday deleted' };
  }

  async bulkCreate(orgId: string, data: Record<string, any>) {
    const { holidays } = data;

    if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
      throw new BadRequestException('holidays array is required and must not be empty');
    }

    const values = holidays.map((h: Record<string, any>) => {
      if (!h.name || !h.date) {
        throw new BadRequestException('Each holiday must have name and date');
      }
      const dateStr = h.date as string;
      return {
        orgId,
        name: h.name,
        date: dateStr,
        type: h.type ?? 'national',
        isOptional: h.isOptional ?? false,
        isFloating: h.isFloating ?? false,
        applicableLocations: h.applicableLocations ?? [],
        applicableDepartments: h.applicableDepartments ?? [],
        year: h.year ?? dateStr.substring(0, 4),
        description: h.description ?? null,
      };
    });

    const created = await this.db
      .insert(schema.holidayCalendars)
      .values(values)
      .returning();

    return {
      success: true,
      created: created.length,
      data: created.map((r) => this.toDto(r)),
    };
  }

  async getMultiYear(
    orgId: string,
    filters: { fromYear?: string; toYear?: string },
  ) {
    const currentYear = new Date().getFullYear();
    const fromYear = filters.fromYear ?? String(currentYear - 1);
    const toYear = filters.toYear ?? String(currentYear + 1);

    const rows = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.year, fromYear),
          lte(schema.holidayCalendars.year, toYear),
        ),
      )
      .orderBy(schema.holidayCalendars.date);

    // Group by year
    const byYear: Record<string, any[]> = {};
    for (const row of rows) {
      const year = row.year;
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(this.toDto(row));
    }

    return {
      fromYear,
      toYear,
      totalHolidays: rows.length,
      byYear,
    };
  }

  private toDto(row: typeof schema.holidayCalendars.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      date: row.date,
      type: row.type,
      isOptional: row.isOptional,
      isFloating: row.isFloating,
      applicableLocations: row.applicableLocations,
      applicableDepartments: row.applicableDepartments,
      year: row.year,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
