import { Inject, Injectable } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamLeaveBalanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMembersWithNames(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        departmentName: schema.departments.name,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .leftJoin(schema.departments, eq(schema.employeeProfiles.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getTeamBalances(orgId: string, managerId: string, year: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { year, employees: [] };
    }

    // Get all leave types for the org
    const leaveTypes = await this.db
      .select({
        id: schema.leaveTypes.id,
        name: schema.leaveTypes.name,
        code: schema.leaveTypes.code,
        color: schema.leaveTypes.color,
      })
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      );

    // Get all balances for team in the given year
    const balances = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          inArray(schema.leaveBalances.employeeId, teamIds),
          eq(schema.leaveBalances.year, year),
        ),
      );

    // Build balance map: employeeId -> leaveTypeId -> balance
    const balanceMap = new Map<string, Map<string, any>>();
    for (const bal of balances) {
      if (!balanceMap.has(bal.employeeId)) {
        balanceMap.set(bal.employeeId, new Map());
      }
      balanceMap.get(bal.employeeId)!.set(bal.leaveTypeId, {
        entitled: Number(bal.entitled),
        accrued: Number(bal.accrued),
        used: Number(bal.used),
        pending: Number(bal.pending),
        carriedForward: Number(bal.carriedForward),
        adjusted: Number(bal.adjusted),
        available: Number(bal.available),
      });
    }

    const employees = teamMembers.map((member) => {
      const memberBalances = balanceMap.get(member.userId) ?? new Map();
      const leaveBalancesData = leaveTypes.map((lt) => {
        const bal = memberBalances.get(lt.id) ?? {
          entitled: 0,
          accrued: 0,
          used: 0,
          pending: 0,
          carriedForward: 0,
          adjusted: 0,
          available: 0,
        };
        return {
          leaveTypeId: lt.id,
          leaveTypeName: lt.name,
          leaveTypeCode: lt.code,
          leaveTypeColor: lt.color,
          ...bal,
        };
      });

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        department: member.departmentName ?? 'Unassigned',
        balances: leaveBalancesData,
      };
    });

    return { year, leaveTypes, employees };
  }

  async getExcessiveUnused(orgId: string, managerId: string, year: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { year, threshold: 80, employees: [] };
    }

    // Get all balances for the year
    const balances = await this.db
      .select({
        employeeId: schema.leaveBalances.employeeId,
        leaveTypeId: schema.leaveBalances.leaveTypeId,
        entitled: schema.leaveBalances.entitled,
        used: schema.leaveBalances.used,
        available: schema.leaveBalances.available,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
      })
      .from(schema.leaveBalances)
      .innerJoin(schema.leaveTypes, eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          inArray(schema.leaveBalances.employeeId, teamIds),
          eq(schema.leaveBalances.year, year),
        ),
      );

    // Find employees with > 80% unused for any leave type
    const excessiveMap = new Map<string, any[]>();

    for (const bal of balances) {
      const entitled = Number(bal.entitled);
      const available = Number(bal.available);

      if (entitled <= 0) continue;

      const unusedPercent = (available / entitled) * 100;
      if (unusedPercent > 80) {
        if (!excessiveMap.has(bal.employeeId)) {
          excessiveMap.set(bal.employeeId, []);
        }
        excessiveMap.get(bal.employeeId)!.push({
          leaveType: bal.leaveTypeName,
          leaveTypeCode: bal.leaveTypeCode,
          entitled,
          used: Number(bal.used),
          available,
          unusedPercent: Math.round(unusedPercent),
        });
      }
    }

    const memberMap = new Map(teamMembers.map((m) => [m.userId, m]));
    const employees: any[] = [];

    for (const [employeeId, excessiveLeaves] of excessiveMap.entries()) {
      const member = memberMap.get(employeeId);
      if (member) {
        employees.push({
          employeeId,
          employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
          email: member.email,
          department: member.departmentName ?? 'Unassigned',
          burnoutRisk: true,
          excessiveLeaves,
        });
      }
    }

    return {
      year,
      threshold: 80,
      totalFlagged: employees.length,
      employees,
    };
  }

  async getYearEndSummary(orgId: string, managerId: string, year: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { year, summary: { totalEmployees: 0, aggregates: {} }, employees: [] };
    }

    // Get all balances for the year
    const balances = await this.db
      .select({
        employeeId: schema.leaveBalances.employeeId,
        leaveTypeId: schema.leaveBalances.leaveTypeId,
        entitled: schema.leaveBalances.entitled,
        accrued: schema.leaveBalances.accrued,
        used: schema.leaveBalances.used,
        pending: schema.leaveBalances.pending,
        carriedForward: schema.leaveBalances.carriedForward,
        adjusted: schema.leaveBalances.adjusted,
        available: schema.leaveBalances.available,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
      })
      .from(schema.leaveBalances)
      .innerJoin(schema.leaveTypes, eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          inArray(schema.leaveBalances.employeeId, teamIds),
          eq(schema.leaveBalances.year, year),
        ),
      );

    // Aggregate by leave type across all employees
    const aggregates: Record<string, {
      leaveType: string;
      leaveTypeCode: string;
      totalEntitled: number;
      totalUsed: number;
      totalPending: number;
      totalAvailable: number;
      totalCarriedForward: number;
    }> = {};

    for (const bal of balances) {
      if (!aggregates[bal.leaveTypeId]) {
        aggregates[bal.leaveTypeId] = {
          leaveType: bal.leaveTypeName,
          leaveTypeCode: bal.leaveTypeCode,
          totalEntitled: 0,
          totalUsed: 0,
          totalPending: 0,
          totalAvailable: 0,
          totalCarriedForward: 0,
        };
      }
      const agg = aggregates[bal.leaveTypeId];
      agg.totalEntitled += Number(bal.entitled);
      agg.totalUsed += Number(bal.used);
      agg.totalPending += Number(bal.pending);
      agg.totalAvailable += Number(bal.available);
      agg.totalCarriedForward += Number(bal.carriedForward);
    }

    // Per-employee summary
    const employeeBalanceMap = new Map<string, any[]>();
    for (const bal of balances) {
      if (!employeeBalanceMap.has(bal.employeeId)) {
        employeeBalanceMap.set(bal.employeeId, []);
      }
      employeeBalanceMap.get(bal.employeeId)!.push({
        leaveType: bal.leaveTypeName,
        leaveTypeCode: bal.leaveTypeCode,
        entitled: Number(bal.entitled),
        used: Number(bal.used),
        pending: Number(bal.pending),
        available: Number(bal.available),
        carriedForward: Number(bal.carriedForward),
      });
    }

    const employees = teamMembers.map((member) => ({
      employeeId: member.userId,
      employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
      email: member.email,
      department: member.departmentName ?? 'Unassigned',
      balances: employeeBalanceMap.get(member.userId) ?? [],
    }));

    return {
      year,
      summary: {
        totalEmployees: teamMembers.length,
        aggregates: Object.values(aggregates),
      },
      employees,
    };
  }

  async exportTeamBalance(orgId: string, managerId: string, year: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { year, headers: [], rows: [] };
    }

    // Get all leave types
    const leaveTypes = await this.db
      .select({
        id: schema.leaveTypes.id,
        name: schema.leaveTypes.name,
        code: schema.leaveTypes.code,
      })
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      );

    // Get all balances
    const balances = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          inArray(schema.leaveBalances.employeeId, teamIds),
          eq(schema.leaveBalances.year, year),
        ),
      );

    const balanceMap = new Map<string, Map<string, any>>();
    for (const bal of balances) {
      if (!balanceMap.has(bal.employeeId)) {
        balanceMap.set(bal.employeeId, new Map());
      }
      balanceMap.get(bal.employeeId)!.set(bal.leaveTypeId, bal);
    }

    // Build CSV-compatible headers
    const baseHeaders = ['Employee Name', 'Email', 'Department'];
    const leaveHeaders: string[] = [];
    for (const lt of leaveTypes) {
      leaveHeaders.push(`${lt.name} - Entitled`);
      leaveHeaders.push(`${lt.name} - Used`);
      leaveHeaders.push(`${lt.name} - Pending`);
      leaveHeaders.push(`${lt.name} - Available`);
    }
    const headers = [...baseHeaders, ...leaveHeaders];

    // Build rows
    const rows = teamMembers.map((member) => {
      const memberBalances = balanceMap.get(member.userId) ?? new Map();
      const row: (string | number)[] = [
        `${member.firstName} ${member.lastName ?? ''}`.trim(),
        member.email,
        member.departmentName ?? 'Unassigned',
      ];

      for (const lt of leaveTypes) {
        const bal = memberBalances.get(lt.id);
        row.push(bal ? Number(bal.entitled) : 0);
        row.push(bal ? Number(bal.used) : 0);
        row.push(bal ? Number(bal.pending) : 0);
        row.push(bal ? Number(bal.available) : 0);
      }

      return row;
    });

    return { year, headers, rows };
  }
}
