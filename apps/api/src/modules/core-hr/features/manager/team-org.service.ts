import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { orgChangeRequests } from '../../../../infrastructure/database/schema/org-change-requests';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { users } from '../../../../infrastructure/database/schema/users';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { designations } from '../../../../infrastructure/database/schema/designations';
import { locations } from '../../../../infrastructure/database/schema/locations';
import { grades } from '../../../../infrastructure/database/schema/grades';

interface CreateRequestData {
  type: string;
  employeeId: string;
  proposedData: Record<string, any>;
  justification?: string;
  budgetImpact?: string;
  effectiveDate?: string;
}

@Injectable()
export class TeamOrgService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listRequests(orgId: string, managerId: string) {
    const rows = await this.db
      .select()
      .from(orgChangeRequests)
      .where(
        and(
          eq(orgChangeRequests.orgId, orgId),
          eq(orgChangeRequests.requestedBy, managerId),
        ),
      )
      .orderBy(orgChangeRequests.createdAt);

    return { data: rows, total: rows.length };
  }

  async getRequest(orgId: string, managerId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(orgChangeRequests)
      .where(
        and(
          eq(orgChangeRequests.id, id),
          eq(orgChangeRequests.orgId, orgId),
          eq(orgChangeRequests.requestedBy, managerId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Change request not found');
    }

    return row;
  }

  async createRequest(orgId: string, managerId: string, data: CreateRequestData) {
    // Snapshot current employee data
    const [employee] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        departmentId: employeeProfiles.departmentId,
        departmentName: departments.name,
        designationId: employeeProfiles.designationId,
        designationName: designations.name,
        locationId: employeeProfiles.locationId,
        locationName: locations.name,
        gradeId: employeeProfiles.gradeId,
        gradeName: grades.name,
        employmentType: employeeProfiles.employmentType,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
      .leftJoin(designations, eq(employeeProfiles.designationId, designations.id))
      .leftJoin(locations, eq(employeeProfiles.locationId, locations.id))
      .leftJoin(grades, eq(employeeProfiles.gradeId, grades.id))
      .where(and(eq(users.id, data.employeeId), eq(users.orgId, orgId)))
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const [created] = await this.db
      .insert(orgChangeRequests)
      .values({
        orgId,
        requestedBy: managerId,
        type: data.type,
        employeeId: data.employeeId,
        currentData: employee,
        proposedData: data.proposedData,
        justification: data.justification,
        budgetImpact: data.budgetImpact,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
      })
      .returning();

    return created;
  }

  async getImpact(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(orgChangeRequests)
      .where(
        and(
          eq(orgChangeRequests.id, id),
          eq(orgChangeRequests.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Change request not found');
    }

    return {
      requestId: row.id,
      type: row.type,
      employeeId: row.employeeId,
      current: row.currentData,
      proposed: row.proposedData,
      effectiveDate: row.effectiveDate,
      status: row.status,
    };
  }
}
