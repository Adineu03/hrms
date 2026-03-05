import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  EnhancedCompanyProfileData,
  OrgSettingsData,
  CountryDefaults,
  WorkWeekData,
  DepartmentData,
  DesignationData,
} from '@hrms/shared';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { orgs } from '../../infrastructure/database/schema/orgs';
import { orgModules } from '../../infrastructure/database/schema/org-modules';
import { departments } from '../../infrastructure/database/schema/departments';
import { designations } from '../../infrastructure/database/schema/designations';

// ─── Country Defaults (static lookup) ────────────────────────────────────────

const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  IN: {
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    locale: 'en-IN',
    fiscalYearStart: 'april',
    laborLaw: {
      minWage: 26000,
      maxWorkHoursPerWeek: 48,
      mandatoryLeaves: ['Republic Day', 'Independence Day', 'Gandhi Jayanti'],
      probationMaxMonths: 6,
      noticePeriodDays: 30,
      overtimeMultiplier: 2,
    },
  },
  US: {
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    locale: 'en-US',
    fiscalYearStart: 'january',
    laborLaw: {
      minWage: 7.25,
      maxWorkHoursPerWeek: 40,
      mandatoryLeaves: [
        'New Year',
        'Independence Day',
        'Thanksgiving',
        'Christmas',
      ],
      probationMaxMonths: 3,
      noticePeriodDays: 14,
      overtimeMultiplier: 1.5,
    },
  },
  GB: {
    country: 'GB',
    currency: 'GBP',
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    locale: 'en-GB',
    fiscalYearStart: 'april',
    laborLaw: {
      minWage: 10.42,
      maxWorkHoursPerWeek: 48,
      mandatoryLeaves: [
        'New Year',
        'Good Friday',
        'Easter Monday',
        'Christmas',
        'Boxing Day',
      ],
      probationMaxMonths: 6,
      noticePeriodDays: 30,
      overtimeMultiplier: 1.5,
    },
  },
  AE: {
    country: 'AE',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    dateFormat: 'DD/MM/YYYY',
    locale: 'en-AE',
    fiscalYearStart: 'january',
    laborLaw: {
      minWage: 0,
      maxWorkHoursPerWeek: 48,
      mandatoryLeaves: [
        'Eid Al Fitr',
        'Eid Al Adha',
        'UAE National Day',
        'New Year',
      ],
      probationMaxMonths: 6,
      noticePeriodDays: 30,
      overtimeMultiplier: 1.25,
    },
  },
  SG: {
    country: 'SG',
    currency: 'SGD',
    timezone: 'Asia/Singapore',
    dateFormat: 'DD/MM/YYYY',
    locale: 'en-SG',
    fiscalYearStart: 'january',
    laborLaw: {
      minWage: 0,
      maxWorkHoursPerWeek: 44,
      mandatoryLeaves: [
        'New Year',
        'Chinese New Year',
        'Labour Day',
        'National Day',
        'Christmas',
      ],
      probationMaxMonths: 6,
      noticePeriodDays: 30,
      overtimeMultiplier: 1.5,
    },
  },
};

@Injectable()
export class ColdStartService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ─── Company Profile ──────────────────────────────────────────────

  async saveCompanyProfile(
    orgId: string,
    data: EnhancedCompanyProfileData,
  ): Promise<EnhancedCompanyProfileData> {
    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const existingConfig = (org.config as Record<string, any>) ?? {};
    const updatedConfig = {
      ...existingConfig,
      companyProfile: {
        legalName: data.legalName ?? '',
        tradeLicense: data.tradeLicense ?? '',
        registrationNumber: data.registrationNumber ?? '',
        taxId: data.taxId ?? '',
        logoUrl: data.logoUrl ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        website: data.website ?? '',
        brandColor: data.brandColor ?? '',
        companySizeBracket: data.companySizeBracket ?? '',
      },
    };

    const now = new Date();
    await this.db
      .update(orgs)
      .set({
        name: data.name,
        config: updatedConfig,
        updatedAt: now,
      })
      .where(eq(orgs.id, orgId));

    return data;
  }

  async getCompanyProfile(
    orgId: string,
  ): Promise<EnhancedCompanyProfileData> {
    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const config = (org.config as Record<string, any>) ?? {};
    const profile = config.companyProfile ?? {};

    return {
      name: org.name,
      legalName: profile.legalName ?? '',
      tradeLicense: profile.tradeLicense ?? '',
      registrationNumber: profile.registrationNumber ?? '',
      taxId: profile.taxId ?? '',
      logoUrl: profile.logoUrl ?? '',
      address: profile.address ?? '',
      phone: profile.phone ?? '',
      website: profile.website ?? '',
      brandColor: profile.brandColor ?? '',
      companySizeBracket: profile.companySizeBracket ?? '',
    };
  }

  // ─── Organization Settings ──────────────────────────────────────────

  async saveOrgSettings(
    orgId: string,
    data: OrgSettingsData,
  ): Promise<OrgSettingsData> {
    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const existingConfig = (org.config as Record<string, any>) ?? {};
    const updatedConfig = {
      ...existingConfig,
      orgSettings: data,
    };

    const now = new Date();
    await this.db
      .update(orgs)
      .set({
        config: updatedConfig,
        updatedAt: now,
      })
      .where(eq(orgs.id, orgId));

    return data;
  }

  async getOrgSettings(orgId: string): Promise<OrgSettingsData | null> {
    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const config = (org.config as Record<string, any>) ?? {};
    return config.orgSettings ?? null;
  }

  // ─── Country Defaults ──────────────────────────────────────────────

  getCountryDefaults(countryCode: string): CountryDefaults | null {
    return COUNTRY_DEFAULTS[countryCode.toUpperCase()] ?? null;
  }

  // ─── Work Week ────────────────────────────────────────────────────

  async saveWorkWeek(orgId: string, data: WorkWeekData): Promise<WorkWeekData> {
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        "Module 'cold-start-setup' not found for this organization",
      );
    }

    const existingConfig = (row.config as Record<string, any>) ?? {};
    const updatedConfig = {
      ...existingConfig,
      workWeek: data,
    };

    const now = new Date();
    await this.db
      .update(orgModules)
      .set({
        config: updatedConfig,
        updatedAt: now,
      })
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      );

    return data;
  }

  async getWorkWeek(orgId: string): Promise<WorkWeekData | null> {
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        "Module 'cold-start-setup' not found for this organization",
      );
    }

    const config = (row.config as Record<string, any>) ?? {};
    return config.workWeek ?? null;
  }

  // ─── Departments ──────────────────────────────────────────────────

  async saveDepartments(
    orgId: string,
    deptList: DepartmentData[],
  ): Promise<DepartmentData[]> {
    // Delete existing departments for this org
    await this.db
      .delete(departments)
      .where(eq(departments.orgId, orgId));

    if (deptList.length === 0) {
      return [];
    }

    // Insert new departments
    const now = new Date();
    const rows = deptList.map((dept) => ({
      orgId,
      name: dept.name,
      parentId: dept.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const inserted = await this.db
      .insert(departments)
      .values(rows)
      .returning();

    return inserted.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
    }));
  }

  async getDepartments(orgId: string): Promise<DepartmentData[]> {
    const rows = await this.db
      .select()
      .from(departments)
      .where(eq(departments.orgId, orgId));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
    }));
  }

  async deleteDepartment(orgId: string, departmentId: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(departments)
      .where(
        and(eq(departments.id, departmentId), eq(departments.orgId, orgId)),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    await this.db
      .delete(departments)
      .where(
        and(eq(departments.id, departmentId), eq(departments.orgId, orgId)),
      );
  }

  // ─── Designations ────────────────────────────────────────────────

  async saveDesignations(
    orgId: string,
    desList: DesignationData[],
  ): Promise<DesignationData[]> {
    // Delete existing designations for this org
    await this.db
      .delete(designations)
      .where(eq(designations.orgId, orgId));

    if (desList.length === 0) {
      return [];
    }

    // Insert new designations
    const now = new Date();
    const rows = desList.map((des) => ({
      orgId,
      name: des.name,
      level: des.level,
      departmentId: des.departmentId ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const inserted = await this.db
      .insert(designations)
      .values(rows)
      .returning();

    return inserted.map((row) => ({
      id: row.id,
      name: row.name,
      level: row.level,
      departmentId: row.departmentId,
    }));
  }

  async getDesignations(orgId: string): Promise<DesignationData[]> {
    const rows = await this.db
      .select()
      .from(designations)
      .where(eq(designations.orgId, orgId));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      level: row.level,
      departmentId: row.departmentId,
    }));
  }

  async deleteDesignation(
    orgId: string,
    designationId: string,
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(designations)
      .where(
        and(
          eq(designations.id, designationId),
          eq(designations.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Designation not found');
    }

    await this.db
      .delete(designations)
      .where(
        and(
          eq(designations.id, designationId),
          eq(designations.orgId, orgId),
        ),
      );
  }

  // ─── Invite Employees ─────────────────────────────────────────────

  async saveInvitedEmails(orgId: string, emails: string[]): Promise<string[]> {
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        "Module 'cold-start-setup' not found for this organization",
      );
    }

    const existingConfig = (row.config as Record<string, any>) ?? {};
    const updatedConfig = {
      ...existingConfig,
      invitedEmails: emails,
    };

    const now = new Date();
    await this.db
      .update(orgModules)
      .set({
        config: updatedConfig,
        updatedAt: now,
      })
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      );

    return emails;
  }

  async getInvitedEmails(orgId: string): Promise<string[]> {
    const [row] = await this.db
      .select()
      .from(orgModules)
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        "Module 'cold-start-setup' not found for this organization",
      );
    }

    const config = (row.config as Record<string, any>) ?? {};
    return config.invitedEmails ?? [];
  }
}
