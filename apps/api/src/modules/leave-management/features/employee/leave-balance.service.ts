import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveBalanceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── All Balances Dashboard ──────────────────────────────────────────────
  async getAllBalances(orgId: string, userId: string, year?: string) {
    const targetYear = year || new Date().getFullYear().toString();

    const balances = await this.db
      .select({
        id: schema.leaveBalances.id,
        leaveTypeId: schema.leaveBalances.leaveTypeId,
        year: schema.leaveBalances.year,
        entitled: schema.leaveBalances.entitled,
        accrued: schema.leaveBalances.accrued,
        used: schema.leaveBalances.used,
        pending: schema.leaveBalances.pending,
        carriedForward: schema.leaveBalances.carriedForward,
        adjusted: schema.leaveBalances.adjusted,
        available: schema.leaveBalances.available,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
        isPaid: schema.leaveTypes.isPaid,
        isCompOff: schema.leaveTypes.isCompOff,
      })
      .from(schema.leaveBalances)
      .innerJoin(schema.leaveTypes, eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.year, targetYear),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .orderBy(schema.leaveTypes.name);

    return {
      year: targetYear,
      balances: balances.map((b) => ({
        id: b.id,
        leaveTypeId: b.leaveTypeId,
        leaveTypeName: b.leaveTypeName,
        leaveTypeCode: b.leaveTypeCode,
        leaveTypeColor: b.leaveTypeColor,
        isPaid: b.isPaid,
        isCompOff: b.isCompOff,
        entitled: Number(b.entitled),
        accrued: Number(b.accrued),
        used: Number(b.used),
        pending: Number(b.pending),
        carriedForward: Number(b.carriedForward),
        adjusted: Number(b.adjusted),
        available: Number(b.available),
      })),
      totalEntitled: balances.reduce((sum, b) => sum + Number(b.entitled), 0),
      totalUsed: balances.reduce((sum, b) => sum + Number(b.used), 0),
      totalPending: balances.reduce((sum, b) => sum + Number(b.pending), 0),
      totalAvailable: balances.reduce((sum, b) => sum + Number(b.available), 0),
    };
  }

  // ── Accrual Schedule ────────────────────────────────────────────────────
  async getAccrualSchedule(orgId: string, userId: string) {
    const year = new Date().getFullYear().toString();

    // Get all leave types with accrual rules
    const leaveTypes = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      );

    // Get current balances
    const balances = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.year, year),
        ),
      );

    const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed

    const schedules = leaveTypes.map((lt) => {
      const balance = balanceMap.get(lt.id);
      const daysPerYear = Number(lt.daysPerYear);
      const accrualRule = lt.accrualRule;
      const accrued = balance ? Number(balance.accrued) : 0;

      let nextCreditDate: string | null = null;
      let nextCreditAmount = 0;

      if (accrualRule === 'monthly') {
        // Monthly accrual: credit on 1st of next month
        const nextMonth = new Date(now.getFullYear(), currentMonth + 1, 1);
        nextCreditDate = nextMonth.toISOString().slice(0, 10);
        nextCreditAmount = Math.round((daysPerYear / 12) * 10) / 10;
      } else if (accrualRule === 'quarterly') {
        // Quarterly accrual: credit on 1st of next quarter
        const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
        const nextQuarter = new Date(now.getFullYear(), nextQuarterMonth, 1);
        nextCreditDate = nextQuarter.toISOString().slice(0, 10);
        nextCreditAmount = Math.round((daysPerYear / 4) * 10) / 10;
      } else if (accrualRule === 'annual') {
        // Annual: credit on Jan 1 of next year
        const nextYear = new Date(now.getFullYear() + 1, 0, 1);
        nextCreditDate = nextYear.toISOString().slice(0, 10);
        nextCreditAmount = daysPerYear;
      } else if (accrualRule === 'biannual') {
        // Bi-annual: credit on Jul 1 or Jan 1
        if (currentMonth < 6) {
          nextCreditDate = `${now.getFullYear()}-07-01`;
        } else {
          nextCreditDate = `${now.getFullYear() + 1}-01-01`;
        }
        nextCreditAmount = Math.round((daysPerYear / 2) * 10) / 10;
      }

      // Remaining accrual for the year
      const maxAccrual = lt.maxAccrualPerPeriod ? Number(lt.maxAccrualPerPeriod) : daysPerYear;
      const remainingAccrual = Math.max(0, maxAccrual - accrued);

      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        accrualRule,
        daysPerYear,
        accruedSoFar: accrued,
        remainingAccrual,
        nextCreditDate,
        nextCreditAmount,
      };
    });

    return { year, schedules };
  }

  // ── Historical Utilization ──────────────────────────────────────────────
  async getHistory(orgId: string, userId: string) {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    // Get approved leave requests for last 12 months
    const requests = await this.db
      .select({
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          eq(schema.leaveRequests.status, 'approved'),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
        ),
      )
      .orderBy(schema.leaveRequests.fromDate);

    // Aggregate by month
    const monthlyData: Record<string, { totalDays: number; count: number; byType: Record<string, number> }> = {};

    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { totalDays: 0, count: 0, byType: {} };
    }

    for (const r of requests) {
      const monthKey = r.fromDate.slice(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].totalDays += Number(r.totalDays);
        monthlyData[monthKey].count++;
        const typeName = r.leaveTypeName;
        monthlyData[monthKey].byType[typeName] = (monthlyData[monthKey].byType[typeName] || 0) + Number(r.totalDays);
      }
    }

    const months = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      totalDays: data.totalDays,
      requestCount: data.count,
      byType: data.byType,
    }));

    return { months };
  }

  // ── Policy Summary ──────────────────────────────────────────────────────
  async getPolicySummary(orgId: string) {
    const leaveTypes = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
        ),
      )
      .orderBy(schema.leaveTypes.name);

    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      )
      .limit(1);

    return {
      policy: policy
        ? {
            name: policy.name,
            leaveYearStart: policy.leaveYearStart,
            sandwichRuleEnabled: policy.sandwichRuleEnabled,
            halfDayEnabled: policy.halfDayEnabled,
            backdatedLeaveDays: policy.backdatedLeaveDays,
            minDaysBeforeRequest: policy.minDaysBeforeRequest,
            negativeBalanceAllowed: policy.negativeBalanceAllowed,
            maxNegativeBalanceDays: policy.maxNegativeBalanceDays,
          }
        : null,
      leaveTypes: leaveTypes.map((lt) => ({
        id: lt.id,
        name: lt.name,
        code: lt.code,
        color: lt.color,
        isPaid: lt.isPaid,
        daysPerYear: Number(lt.daysPerYear),
        accrualRule: lt.accrualRule,
        carryForwardEnabled: lt.carryForwardEnabled,
        maxCarryForwardDays: lt.maxCarryForwardDays,
        encashmentEnabled: lt.encashmentEnabled,
        maxEncashableDays: lt.maxEncashableDays,
        requiresApproval: lt.requiresApproval,
        requiresDocument: lt.requiresDocument,
        documentThresholdDays: lt.documentThresholdDays,
        minConsecutiveDays: lt.minConsecutiveDays,
        maxConsecutiveDays: lt.maxConsecutiveDays,
        applicableGender: lt.applicableGender,
        isCompOff: lt.isCompOff,
        probationAllowed: lt.probationAllowed,
      })),
    };
  }

  // ── Encashment Eligibility ──────────────────────────────────────────────
  async getEncashmentEligibility(orgId: string, userId: string) {
    const year = new Date().getFullYear().toString();

    // Get leave types with encashment enabled
    const encashableTypes = await this.db
      .select()
      .from(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.orgId, orgId),
          eq(schema.leaveTypes.isActive, true),
          eq(schema.leaveTypes.encashmentEnabled, true),
        ),
      );

    if (encashableTypes.length === 0) {
      return { eligibleTypes: [], totalEncashableDays: 0 };
    }

    // Get balances for encashable types
    const typeIds = encashableTypes.map((t) => t.id);
    const balances = await this.db
      .select()
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.year, year),
        ),
      );

    const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));

    let totalEncashableDays = 0;
    const eligibleTypes = encashableTypes.map((lt) => {
      const balance = balanceMap.get(lt.id);
      const available = balance ? Number(balance.available) : 0;
      const maxEncashable = lt.maxEncashableDays || 0;
      const eligibleDays = Math.min(available, maxEncashable);
      totalEncashableDays += Math.max(0, eligibleDays);

      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        available,
        maxEncashableDays: maxEncashable,
        eligibleDays: Math.max(0, eligibleDays),
        isPaid: lt.isPaid,
      };
    });

    return {
      year,
      eligibleTypes,
      totalEncashableDays,
    };
  }

  // ── Upcoming Holidays ──────────────────────────────────────────────────
  async getUpcomingHolidays(orgId: string, userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear().toString();

    // Get employee location for filtering
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    const locationId = profile?.locationId;

    // Get upcoming holidays
    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, today),
          eq(schema.holidayCalendars.year, year),
        ),
      )
      .orderBy(schema.holidayCalendars.date);

    // Filter by location if applicable
    const filtered = holidays.filter((h) => {
      const applicableLocations = h.applicableLocations as string[];
      if (!applicableLocations || applicableLocations.length === 0) return true;
      if (!locationId) return true;
      return applicableLocations.includes(locationId);
    });

    return {
      holidays: filtered.map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date,
        type: h.type,
        description: h.description,
        isOptional: h.isOptional,
        isFloating: h.isFloating,
        dayOfWeek: new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' }),
      })),
      totalUpcoming: filtered.length,
    };
  }
}
