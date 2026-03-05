import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { customFieldDefinitions, customFieldValues } from '../../../../infrastructure/database/schema/custom-fields';

@Injectable()
export class CustomFieldsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string, entity?: string) {
    const conditions = [eq(customFieldDefinitions.orgId, orgId)];
    if (entity) {
      conditions.push(eq(customFieldDefinitions.entity, entity));
    }

    const rows = await this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(...conditions))
      .orderBy(asc(customFieldDefinitions.sortOrder), asc(customFieldDefinitions.fieldLabel));

    return rows.map((r) => this.toDefinitionDto(r));
  }

  async getById(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)))
      .limit(1);

    if (!row) throw new NotFoundException('Custom field definition not found');
    return this.toDefinitionDto(row);
  }

  async create(orgId: string, data: {
    entity: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    isRequired?: boolean;
    sortOrder?: number;
    options?: any[];
    validationRules?: Record<string, any>;
    defaultValue?: string;
    section?: string;
  }) {
    const now = new Date();
    const [inserted] = await this.db
      .insert(customFieldDefinitions)
      .values({
        orgId,
        entity: data.entity,
        fieldName: data.fieldName,
        fieldLabel: data.fieldLabel,
        fieldType: data.fieldType,
        isRequired: data.isRequired ?? false,
        isActive: true,
        sortOrder: data.sortOrder ?? 0,
        options: data.options ?? [],
        validationRules: data.validationRules ?? {},
        defaultValue: data.defaultValue ?? null,
        section: data.section ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.toDefinitionDto(inserted);
  }

  async update(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Custom field definition not found');

    const now = new Date();
    const updateValues: Record<string, any> = { updatedAt: now };

    if (data.fieldName !== undefined) updateValues.fieldName = data.fieldName;
    if (data.fieldLabel !== undefined) updateValues.fieldLabel = data.fieldLabel;
    if (data.fieldType !== undefined) updateValues.fieldType = data.fieldType;
    if (data.isRequired !== undefined) updateValues.isRequired = data.isRequired;
    if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder;
    if (data.options !== undefined) updateValues.options = data.options;
    if (data.validationRules !== undefined) updateValues.validationRules = data.validationRules;
    if (data.defaultValue !== undefined) updateValues.defaultValue = data.defaultValue;
    if (data.section !== undefined) updateValues.section = data.section;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;

    const [updated] = await this.db
      .update(customFieldDefinitions)
      .set(updateValues)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)))
      .returning();

    return this.toDefinitionDto(updated);
  }

  async deactivate(orgId: string, id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Custom field definition not found');

    const now = new Date();
    await this.db
      .update(customFieldDefinitions)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.orgId, orgId)));
  }

  async getValues(orgId: string, entityId: string) {
    const rows = await this.db
      .select({
        value: customFieldValues,
        definition: customFieldDefinitions,
      })
      .from(customFieldValues)
      .innerJoin(customFieldDefinitions, eq(customFieldValues.fieldId, customFieldDefinitions.id))
      .where(
        and(
          eq(customFieldValues.orgId, orgId),
          eq(customFieldValues.entityId, entityId),
        ),
      );

    return rows.map((r) => ({
      id: r.value.id,
      fieldId: r.value.fieldId,
      entityId: r.value.entityId,
      value: r.value.value,
      fieldName: r.definition.fieldName,
      fieldLabel: r.definition.fieldLabel,
      fieldType: r.definition.fieldType,
      createdAt: r.value.createdAt.toISOString(),
      updatedAt: r.value.updatedAt.toISOString(),
    }));
  }

  private toDefinitionDto(row: typeof customFieldDefinitions.$inferSelect) {
    return {
      id: row.id,
      entity: row.entity,
      fieldName: row.fieldName,
      fieldLabel: row.fieldLabel,
      fieldType: row.fieldType,
      isRequired: row.isRequired,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      options: row.options ?? [],
      validationRules: row.validationRules ?? {},
      defaultValue: row.defaultValue ?? undefined,
      section: row.section ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
