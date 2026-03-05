import {
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveBalanceMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(
    orgId: string,
    filters: {
      employeeId?: string;
      leaveTypeId?: string;
      year?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const conditions: any[] = [eq(schema.leaveBalances.orgId, orgId)];

    if (filters.employeeId) {
      conditions.push(eq(schema.leaveBalances.employeeId, filters.employeeId));
    }
    if (filters.leaveTypeId) {
      conditions.push(eq(schema.leaveBalances.leaveTypeId, filters.leaveTypeId));
    }
    if (filters.year) {
      conditions.push(eq(schema.leaveBalances.year, filters.year));
    }

    const rows = await this.db
      .select({
        balance: schema.leaveBalances,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        departmentId: schema.employeeProfiles.departmentId,
      })
      .from(schema.leaveBalances)
      .leftJoin(
        schema.users,
        and(
          eq(schema.leaveBalances.employeeId, schema.users.id),
          eq(schema.leaveBalances.orgId, schema.users.orgId),
        ),
      )
      .leftJoin(
        schema.leaveTypes,
        and(
          eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id),
          eq(schema.leaveBalances.orgId, schema.leaveTypes.orgId),
        ),
      )
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.leaveBalances.employeeId, schema.employeeProfiles.userId),
          eq(schema.leaveBalances.orgId, schema.employeeProfiles.orgId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.leaveBalances.updatedAt));

    // Filter by department in-memory (since it comes from a joined table)
    let filtered = rows;
    if (filters.departmentId) {
      filtered = filtered.filter((r) => r.departmentId === filters.departmentId);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => ({
        ...this.toBalanceDto(r.balance),
        employee: {
          id: r.balance.employeeId,
          firstName: r.employeeFirstName,
          lastName: r.employeeLastName,
          email: r.employeeEmail,
        },
        leaveType: {
          id: r.balance.leaveTypeId,
          name: r.leaveTypeName,
          code: r.leaveTypeCode,
        },
        departmentId: r.departmentId,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async bulkCredit(orgId: string, data: Record<string, any>) {
    const { leaveTypeId, year, days, employeeIds } = data;

    if (!leaveTypeId || !year || days === undefined || !employeeIds?.length) {
      throw new BadRequestException(
        'leaveTypeId, year, days, and employeeIds[] are required',
      );
    }

    const creditDays = Number(days);
    if (isNaN(creditDays) || creditDays <= 0) {
      throw new BadRequestException('days must be a positive number');
    }

    const now = new Date();
    const results: string[] = [];
    const errors: { employeeId: string; error: string }[] = [];

    await this.db.transaction(async (tx) => {
      for (const employeeId of employeeIds) {
        // Check if balance record exists
        const [existing] = await tx
          .select()
          .from(schema.leaveBalances)
          .where(
            and(
              eq(schema.leaveBalances.orgId, orgId),
              eq(schema.leaveBalances.employeeId, employeeId),
              eq(schema.leaveBalances.leaveTypeId, leaveTypeId),
              eq(schema.leaveBalances.year, year),
            ),
          )
          .limit(1);

        if (existing) {
          // Update existing balance
          const newEntitled = Number(existing.entitled) + creditDays;
          const newAvailable = Number(existing.available) + creditDays;

          await tx
            .update(schema.leaveBalances)
            .set({
              entitled: String(newEntitled),
              available: String(newAvailable),
              updatedAt: now,
            })
            .where(
              and(
                eq(schema.leaveBalances.id, existing.id),
                eq(schema.leaveBalances.orgId, orgId),
              ),
            );

          results.push(employeeId);
        } else {
          // Create new balance record
          await tx
            .insert(schema.leaveBalances)
            .values({
              orgId,
              employeeId,
              leaveTypeId,
              year,
              entitled: String(creditDays),
              accrued: '0',
              used: '0',
              pending: '0',
              carriedForward: '0',
              adjusted: '0',
              available: String(creditDays),
            });

          results.push(employeeId);
        }
      }
    });

    return {
      success: true,
      credited: results.length,
      errors: errors.length > 0 ? errors : undefined,
      employeeIds: results,
      days: creditDays,
      leaveTypeId,
      year,
    };
  }

  async bulkDebit(orgId: string, data: Record<string, any>) {
    const { leaveTypeId, year, days, employeeIds, reason } = data;

    if (!leaveTypeId || !year || days === undefined || !employeeIds?.length) {
      throw new BadRequestException(
        'leaveTypeId, year, days, and employeeIds[] are required',
      );
    }

    const debitDays = Number(days);
    if (isNaN(debitDays) || debitDays <= 0) {
      throw new BadRequestException('days must be a positive number');
    }

    const now = new Date();
    const results: string[] = [];
    const errors: { employeeId: string; error: string }[] = [];

    await this.db.transaction(async (tx) => {
      for (const employeeId of employeeIds) {
        const [existing] = await tx
          .select()
          .from(schema.leaveBalances)
          .where(
            and(
              eq(schema.leaveBalances.orgId, orgId),
              eq(schema.leaveBalances.employeeId, employeeId),
              eq(schema.leaveBalances.leaveTypeId, leaveTypeId),
              eq(schema.leaveBalances.year, year),
            ),
          )
          .limit(1);

        if (!existing) {
          errors.push({ employeeId, error: 'No balance record found' });
          continue;
        }

        const currentAvailable = Number(existing.available);
        if (currentAvailable < debitDays) {
          errors.push({
            employeeId,
            error: `Insufficient balance: available=${currentAvailable}, requested=${debitDays}`,
          });
          continue;
        }

        const newEntitled = Number(existing.entitled) - debitDays;
        const newAvailable = currentAvailable - debitDays;

        await tx
          .update(schema.leaveBalances)
          .set({
            entitled: String(newEntitled),
            available: String(newAvailable),
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.leaveBalances.id, existing.id),
              eq(schema.leaveBalances.orgId, orgId),
            ),
          );

        results.push(employeeId);
      }
    });

    return {
      success: true,
      debited: results.length,
      errors: errors.length > 0 ? errors : undefined,
      employeeIds: results,
      days: debitDays,
      reason: reason ?? null,
      leaveTypeId,
      year,
    };
  }

  async adjust(orgId: string, data: Record<string, any>) {
    const { employeeId, leaveTypeId, year, adjustment, reason } = data;

    if (!employeeId || !leaveTypeId || !year || adjustment === undefined) {
      throw new BadRequestException(
        'employeeId, leaveTypeId, year, and adjustment are required',
      );
    }

    const adjustDays = Number(adjustment);
    if (isNaN(adjustDays) || adjustDays === 0) {
      throw new BadRequestException('adjustment must be a non-zero number');
    }

    const now = new Date();

    const [existing] = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, employeeId),
          eq(schema.leaveBalances.leaveTypeId, leaveTypeId),
          eq(schema.leaveBalances.year, year),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new BadRequestException(
        'No balance record found for this employee, leave type, and year',
      );
    }

    const newAdjusted = Number(existing.adjusted) + adjustDays;
    const newAvailable = Number(existing.available) + adjustDays;

    const [updated] = await this.db
      .update(schema.leaveBalances)
      .set({
        adjusted: String(newAdjusted),
        available: String(newAvailable),
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.leaveBalances.id, existing.id),
          eq(schema.leaveBalances.orgId, orgId),
        ),
      )
      .returning();

    return {
      ...this.toBalanceDto(updated),
      adjustmentApplied: adjustDays,
      reason: reason ?? null,
    };
  }

  async reportsByDepartment(
    orgId: string,
    filters: { year?: string; departmentId?: string },
  ) {
    const currentYear = filters.year ?? new Date().getFullYear().toString();

    const rows = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        lt.id AS leave_type_id,
        lt.name AS leave_type_name,
        lt.code AS leave_type_code,
        COUNT(DISTINCT lb.employee_id) AS employee_count,
        COALESCE(SUM(lb.entitled::numeric), 0) AS total_entitled,
        COALESCE(SUM(lb.used::numeric), 0) AS total_used,
        COALESCE(SUM(lb.pending::numeric), 0) AS total_pending,
        COALESCE(SUM(lb.available::numeric), 0) AS total_available,
        COALESCE(SUM(lb.carried_forward::numeric), 0) AS total_carried_forward,
        COALESCE(SUM(lb.adjusted::numeric), 0) AS total_adjusted,
        CASE WHEN SUM(lb.entitled::numeric) > 0
          THEN ROUND(
            (SUM(lb.used::numeric) / SUM(lb.entitled::numeric)) * 100,
            2
          )
          ELSE 0
        END AS utilization_rate
      FROM departments d
      JOIN employee_profiles ep ON ep.department_id = d.id AND ep.org_id = d.org_id
      JOIN leave_balances lb ON lb.employee_id = ep.user_id AND lb.org_id = d.org_id
        AND lb.year = ${currentYear}
      JOIN leave_types lt ON lt.id = lb.leave_type_id AND lt.org_id = d.org_id
      WHERE d.org_id = ${orgId}
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
      GROUP BY d.id, d.name, lt.id, lt.name, lt.code
      ORDER BY d.name ASC, lt.name ASC
    `);

    return {
      year: currentYear,
      data: rows,
    };
  }

  async yearEndProcessing(orgId: string, data: Record<string, any>) {
    const { fromYear, toYear } = data;

    if (!fromYear || !toYear) {
      throw new BadRequestException('fromYear and toYear are required');
    }

    const now = new Date();
    let processed = 0;
    let created = 0;
    let lapsed = 0;

    // Get all leave types for this org
    const leaveTypesList = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      );

    // Get all balances for the fromYear
    const balances = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.year, fromYear),
        ),
      );

    await this.db.transaction(async (tx) => {
      for (const balance of balances) {
        const leaveType = leaveTypesList.find((lt) => lt.id === balance.leaveTypeId);
        if (!leaveType) continue;

        processed++;
        const available = Number(balance.available);

        let carryForward = 0;
        if (leaveType.carryForwardEnabled && available > 0) {
          const maxCarry = leaveType.maxCarryForwardDays ?? Infinity;
          carryForward = Math.min(available, maxCarry);
        }

        const lapsedDays = available - carryForward;
        if (lapsedDays > 0) lapsed++;

        // Check if new year balance already exists
        const [existingNew] = await tx
          .select()
          .from(schema.leaveBalances)
          .where(
            and(
              eq(schema.leaveBalances.orgId, orgId),
              eq(schema.leaveBalances.employeeId, balance.employeeId),
              eq(schema.leaveBalances.leaveTypeId, balance.leaveTypeId),
              eq(schema.leaveBalances.year, toYear),
            ),
          )
          .limit(1);

        const daysPerYear = Number(leaveType.daysPerYear);

        if (existingNew) {
          // Update existing new year balance with carry-forward
          const newCarriedForward = Number(existingNew.carriedForward) + carryForward;
          const newAvailable = Number(existingNew.available) + carryForward;

          await tx
            .update(schema.leaveBalances)
            .set({
              carriedForward: String(newCarriedForward),
              available: String(newAvailable),
              updatedAt: now,
            })
            .where(
              and(
                eq(schema.leaveBalances.id, existingNew.id),
                eq(schema.leaveBalances.orgId, orgId),
              ),
            );
        } else {
          // Create new year balance
          await tx
            .insert(schema.leaveBalances)
            .values({
              orgId,
              employeeId: balance.employeeId,
              leaveTypeId: balance.leaveTypeId,
              year: toYear,
              entitled: String(daysPerYear),
              accrued: '0',
              used: '0',
              pending: '0',
              carriedForward: String(carryForward),
              adjusted: '0',
              available: String(daysPerYear + carryForward),
            });

          created++;
        }
      }
    });

    return {
      success: true,
      fromYear,
      toYear,
      processed,
      newBalancesCreated: created,
      balancesWithLapse: lapsed,
    };
  }

  private toBalanceDto(row: typeof schema.leaveBalances.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      leaveTypeId: row.leaveTypeId,
      year: row.year,
      entitled: Number(row.entitled),
      accrued: Number(row.accrued),
      used: Number(row.used),
      pending: Number(row.pending),
      carriedForward: Number(row.carriedForward),
      adjusted: Number(row.adjusted),
      available: Number(row.available),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
