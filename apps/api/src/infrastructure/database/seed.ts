/**
 * Seed script — creates "Acme Corp" demo org with realistic data for all 19 modules.
 *
 * Usage (from monorepo root):
 *   pnpm seed
 *
 * Idempotent: if the org slug "acme-corp" already exists, the script exits early.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from monorepo root before anything else reads process.env
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });
dotenv.config(); // fallback to CWD/.env

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

// Deterministic faker output across runs (recovery: live DB was seeded with this seed).
faker.seed(1503);

import {
  orgs,
  users,
  orgModules,
  departments,
  designations,
  employeeProfiles,
  shifts,
  employeeShiftAssignments,
  attendanceRecords,
  leaveTypes,
  leaveBalances,
  leaveRequests,
  timesheetEntries,
  payrollRuns,
  payrollEntries,
  expenseCategories,
  expenseReports,
  expenseItems,
  // ── Additional populated tables (recovery) ──
  locations,
  grades,
  entities,
  salaryStructures,
  employeeSalaryAssignments,
  benefitPlans,
  benefitEnrollments,
  customFieldDefinitions,
  auditLogs,
  documents,
  selfServiceRequests,
  orgChangeRequests,
  leaveApprovalWorkflows,
  holidayCalendars,
  compOffRecords,
  overtimeRequests,
  attendanceBreaks,
  projects,
  taskCategories,
  projectAssignments,
  timesheetPolicies,
  timesheetSubmissions,
  salaryComponents,
  payrollConfigs,
  statutoryFilings,
  paySlips,
  investmentDeclarations,
  reviewCycles,
  reviewAssignments,
  goals,
  competencyFrameworks,
  developmentPlans,
  oneOnOneMeetings,
  employeeOnboardings,
  employeeOnboardingTasks,
  employeeOffboardings,
  exitInterviews,
  knowledgeTransfers,
  // ── Talent Acquisition ──
  jobRequisitions,
  jobPostings,
  recruitmentPipelineStages,
  candidates,
  applications,
  interviews,
  offerLetters,
  referrals,
} from './schema';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_ORG_SLUG = 'acme-corp';

const MODULE_IDS = [
  'cold-start-setup',
  'core-hr',
  'attendance',
  'leave-management',
  'daily-work-logging',
  'talent-acquisition',
  'onboarding-offboarding',
  'performance-growth',
  'learning-development',
  'compensation-rewards',
  'engagement-culture',
  'platform-experience',
  'payroll-processing',
  'expense-management',
  'compliance-audit',
  'workforce-planning',
  'integrations-api',
  'people-analytics',
  'demo-company',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fixed "today" anchor so every time-relative value is deterministic. */
const SEED_TODAY = new Date('2026-06-09T00:00:00Z');

/** A Date N days after (or before, if negative) the SEED_TODAY anchor. */
function anchorPlusDays(n: number): Date {
  const d = new Date(SEED_TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

/** Return ISO date string YYYY-MM-DD from a Date */
function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Collect weekdays in the last N calendar days, ending at the SEED_TODAY anchor */
function weekdaysInLastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date(SEED_TODAY);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d); // skip Sat/Sun
  }
  return days;
}

/** Map a random [0,1) to an attendance status bucket */
function attendanceStatus(r: number): 'present' | 'late' | 'absent' | 'half_day' {
  if (r < 0.82) return 'present';
  if (r < 0.90) return 'late';
  if (r < 0.95) return 'absent';
  return 'half_day';
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      'ERROR: DATABASE_URL is not set.\n' +
      'Create a .env file at the project root (copy .env.example) and set DATABASE_URL.',
    );
    process.exit(1);
  }

  const client = postgres(dbUrl, { max: 5 });
  const db = drizzle(client);

  try {
    // ── Idempotency: delete the demo org (cascades to every org-scoped table) ──
    // Every org-scoped table has `org_id ... onDelete: cascade`, so this wipes
    // the demo org cleanly and the seed can run fresh every time.
    await db.delete(orgs).where(eq(orgs.slug, DEMO_ORG_SLUG));

    console.log('Seeding Acme Corp demo org...\n');

    // ── 1. Org ───────────────────────────────────────────────────────────────
    const [org] = await db
      .insert(orgs)
      .values({
        name: 'Acme Corp',
        slug: DEMO_ORG_SLUG,
        industry: 'IT Services',
        config: {
          industry: 'it-services',
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          workWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          workHours: '09:00-18:00',
        },
      })
      .returning();

    console.log(`  ✓ Org:     ${org.name}  (${org.id})`);

    // ── 2. Users ─────────────────────────────────────────────────────────────
    const [adminHash, managerHash, empHash] = await Promise.all([
      bcrypt.hash('Admin@123', 10),
      bcrypt.hash('Manager@123', 10),
      bcrypt.hash('Employee@123', 10),
    ]);

    const [adminUser] = await db
      .insert(users)
      .values({
        orgId: org.id,
        email: 'admin@acme.com',
        passwordHash: adminHash,
        role: 'super_admin',
        firstName: 'Alex',
        lastName: 'Kumar',
        isActive: true,
      })
      .returning();

    const [managerUser] = await db
      .insert(users)
      .values({
        orgId: org.id,
        email: 'manager@acme.com',
        passwordHash: managerHash,
        role: 'manager',
        firstName: 'Sarah',
        lastName: 'Mehta',
        isActive: true,
      })
      .returning();

    // 20 employee users
    const empInserts = Array.from({ length: 20 }, (_, i) => ({
      orgId: org.id,
      email: `emp${String(i + 1).padStart(2, '0')}@acme.com`,
      passwordHash: empHash,
      role: 'employee' as const,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      isActive: true,
    }));
    const empUsers = await db.insert(users).values(empInserts).returning();

    console.log(
      `  ✓ Users:   admin@acme.com, manager@acme.com, emp01–emp20@acme.com`,
    );

    // ── 3. Org Modules (all 19, active + completed) ──────────────────────────
    const now = SEED_TODAY;
    await db.insert(orgModules).values(
      MODULE_IDS.map((moduleId) => ({
        orgId: org.id,
        moduleId,
        isActive: true,
        setupStatus: 'completed' as const,
        setupProgress: {},
        config: {},
        activatedAt: now,
        setupCompletedAt: now,
      })),
    );
    console.log(`  ✓ Modules: ${MODULE_IDS.length} modules activated + setup completed`);

    // ── 4. Departments ───────────────────────────────────────────────────────
    const [engDept, salesDept, hrDept, finDept] = await db
      .insert(departments)
      .values([
        { orgId: org.id, name: 'Engineering' },
        { orgId: org.id, name: 'Sales' },
        { orgId: org.id, name: 'Human Resources' },
        { orgId: org.id, name: 'Finance' },
      ])
      .returning();
    console.log(`  ✓ Departments: Engineering, Sales, HR, Finance`);

    // ── 5. Designations ──────────────────────────────────────────────────────
    const [swe, sse, salesExec, snrSales, hrExec, finAnalyst, finMgr, _engMgr] = await db
      .insert(designations)
      .values([
        { orgId: org.id, name: 'Software Engineer', level: 2, departmentId: engDept.id },
        { orgId: org.id, name: 'Senior Software Engineer', level: 3, departmentId: engDept.id },
        { orgId: org.id, name: 'Sales Executive', level: 2, departmentId: salesDept.id },
        { orgId: org.id, name: 'Senior Sales Executive', level: 3, departmentId: salesDept.id },
        { orgId: org.id, name: 'HR Executive', level: 2, departmentId: hrDept.id },
        { orgId: org.id, name: 'Financial Analyst', level: 2, departmentId: finDept.id },
        { orgId: org.id, name: 'Finance Manager', level: 4, departmentId: finDept.id },
        { orgId: org.id, name: 'Engineering Manager', level: 4, departmentId: engDept.id },
      ])
      .returning();
    console.log(`  ✓ Designations: 8 created`);

    // ── 6. Employee Profiles ─────────────────────────────────────────────────
    // emp01–08 → Engineering | emp09–12 → Sales | emp13–16 → HR | emp17–20 → Finance
    const profileInserts = empUsers.map((u, i) => {
      const idx = i + 1; // 1-based

      let deptId: string;
      let desigId: string;
      let employmentType: string;
      let workModel: string;

      if (idx <= 8) {
        deptId = engDept.id;
        desigId = idx <= 5 ? swe.id : sse.id;
        employmentType = idx === 8 ? 'contract' : 'full_time';
        workModel = idx % 2 === 0 ? 'hybrid' : 'remote';
      } else if (idx <= 12) {
        deptId = salesDept.id;
        desigId = idx <= 10 ? salesExec.id : snrSales.id;
        employmentType = 'full_time';
        workModel = 'office';
      } else if (idx <= 16) {
        deptId = hrDept.id;
        desigId = hrExec.id;
        employmentType = 'full_time';
        workModel = 'office';
      } else {
        deptId = finDept.id;
        desigId = idx === 20 ? finMgr.id : finAnalyst.id;
        employmentType = 'full_time';
        workModel = 'office';
      }

      const joinDate = faker.date.between({ from: '2022-01-01', to: '2025-09-01' });
      const probEnd = new Date(joinDate);
      probEnd.setMonth(probEnd.getMonth() + 6);

      return {
        orgId: org.id,
        userId: u.id,
        employeeId: `EMP${String(idx).padStart(3, '0')}`,
        departmentId: deptId,
        designationId: desigId,
        managerId: managerUser.id,
        dateOfJoining: fmt(joinDate),
        probationEndDate: fmt(probEnd),
        employmentType,
        workModel,
        gender: faker.helpers.arrayElement(['male', 'female']),
        phone: `+91${faker.string.numeric(10)}`,
        onboardingStatus: 'completed',
        emergencyContacts: [
          {
            name: `${u.lastName} Family`,
            relation: idx % 2 === 1 ? 'Spouse' : 'Parent',
            phone: `+91987650${String(idx).padStart(4, '0')}`,
          },
        ],
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: `501001${String(idx).padStart(6, '0')}`,
          ifscCode: 'HDFC0001234',
          branchName: 'MG Road, Bengaluru',
        },
        address: {
          line1: `${100 + idx}, 4th Cross`,
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
        },
      };
    });
    await db.insert(employeeProfiles).values(profileInserts);
    console.log(`  ✓ Employee profiles: 20 created`);

    // ── 7. Shifts ────────────────────────────────────────────────────────────
    const [generalShift, morningShift, nightShift] = await db
      .insert(shifts)
      .values([
        {
          orgId: org.id,
          name: 'General Shift',
          code: 'GEN',
          type: 'general',
          startTime: '09:00',
          endTime: '18:00',
          graceMinutesLate: 15,
          graceMinutesEarly: 15,
          isNightShift: false,
          isFlexible: false,
          isDefault: true,
          isActive: true,
        },
        {
          orgId: org.id,
          name: 'Morning Shift',
          code: 'MOR',
          type: 'fixed',
          startTime: '06:00',
          endTime: '14:00',
          graceMinutesLate: 10,
          graceMinutesEarly: 10,
          isNightShift: false,
          isFlexible: false,
          isDefault: false,
          isActive: true,
        },
        {
          orgId: org.id,
          name: 'Night Shift',
          code: 'NGT',
          type: 'fixed',
          startTime: '22:00',
          endTime: '06:00',
          graceMinutesLate: 10,
          graceMinutesEarly: 10,
          isNightShift: true,
          isFlexible: false,
          isDefault: false,
          isActive: true,
        },
      ])
      .returning();
    // suppress unused warnings
    void morningShift;
    void nightShift;
    console.log(`  ✓ Shifts: General, Morning, Night`);

    // ── 8. Employee Shift Assignments ────────────────────────────────────────
    await db.insert(employeeShiftAssignments).values(
      empUsers.map((u) => ({
        orgId: org.id,
        employeeId: u.id,
        shiftId: generalShift.id,
        effectiveFrom: '2025-01-01',
        isCurrent: true,
        assignedBy: adminUser.id,
      })),
    );
    console.log(`  ✓ Shift assignments: 20 employees → General Shift`);

    // ── 9. Attendance Records (last 30 days, weekdays only) ──────────────────
    const weekdays30 = weekdaysInLastNDays(30);
    const attendanceInserts: {
      orgId: string;
      employeeId: string;
      date: string;
      shiftId: string;
      status: string;
      clockIn?: Date;
      clockOut?: Date;
      lateMinutes?: number;
      totalWorkMinutes?: number;
      isHalfDay?: boolean;
      clockInMethod?: string;
      clockOutMethod?: string;
    }[] = [];

    for (const u of empUsers) {
      for (const day of weekdays30) {
        const r = faker.number.float({ min: 0, max: 1 });
        const status = attendanceStatus(r);
        const dateStr = fmt(day);

        if (status === 'absent') {
          attendanceInserts.push({
            orgId: org.id,
            employeeId: u.id,
            date: dateStr,
            shiftId: generalShift.id,
            status,
            totalWorkMinutes: 0,
          });
        } else if (status === 'half_day') {
          const clockIn = new Date(day);
          clockIn.setHours(9, 0, 0, 0);
          const clockOut = new Date(day);
          clockOut.setHours(13, 30, 0, 0);
          attendanceInserts.push({
            orgId: org.id,
            employeeId: u.id,
            date: dateStr,
            shiftId: generalShift.id,
            status,
            clockIn,
            clockOut,
            isHalfDay: true,
            totalWorkMinutes: 270,
            clockInMethod: 'web',
            clockOutMethod: 'web',
          });
        } else {
          const lateMin = status === 'late' ? faker.number.int({ min: 16, max: 60 }) : 0;
          const clockIn = new Date(day);
          clockIn.setHours(9, lateMin, 0, 0);
          const clockOut = new Date(day);
          clockOut.setHours(18, faker.number.int({ min: 0, max: 30 }), 0, 0);
          const totalMin = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
          attendanceInserts.push({
            orgId: org.id,
            employeeId: u.id,
            date: dateStr,
            shiftId: generalShift.id,
            status,
            clockIn,
            clockOut,
            lateMinutes: lateMin,
            totalWorkMinutes: totalMin,
            clockInMethod: 'web',
            clockOutMethod: 'web',
          });
        }
      }
    }

    // Batch in chunks of 500 to stay well under parameter limits
    for (let i = 0; i < attendanceInserts.length; i += 500) {
      await db.insert(attendanceRecords).values(attendanceInserts.slice(i, i + 500));
    }
    console.log(
      `  ✓ Attendance: ${attendanceInserts.length} records` +
      ` (${weekdays30.length} weekdays × 20 employees)`,
    );

    // ── 10. Leave Types ──────────────────────────────────────────────────────
    const [ltCasual, ltSick, ltEarned] = await db
      .insert(leaveTypes)
      .values([
        {
          orgId: org.id,
          name: 'Casual Leave',
          code: 'CL',
          isPaid: true,
          accrualRule: 'annual',
          daysPerYear: '12',
          carryForwardEnabled: false,
          requiresApproval: true,
          requiresDocument: false,
          color: '#4F46E5',
          isActive: true,
        },
        {
          orgId: org.id,
          name: 'Sick Leave',
          code: 'SL',
          isPaid: true,
          accrualRule: 'annual',
          daysPerYear: '12',
          carryForwardEnabled: false,
          requiresApproval: false,
          requiresDocument: false,
          color: '#EF4444',
          isActive: true,
        },
        {
          orgId: org.id,
          name: 'Earned Leave',
          code: 'EL',
          isPaid: true,
          accrualRule: 'annual',
          daysPerYear: '15',
          carryForwardEnabled: true,
          maxCarryForwardDays: 30,
          requiresApproval: true,
          requiresDocument: false,
          color: '#10B981',
          isActive: true,
        },
      ])
      .returning();
    console.log(`  ✓ Leave types: Casual, Sick, Earned`);

    // ── 11. Leave Balances (all employees × 3 types) ─────────────────────────
    const leaveBalanceInserts: {
      orgId: string;
      employeeId: string;
      leaveTypeId: string;
      year: string;
      entitled: string;
      accrued: string;
      used: string;
      pending: string;
      carriedForward: string;
      adjusted: string;
      available: string;
    }[] = [];

    for (const u of empUsers) {
      for (const lt of [ltCasual, ltSick, ltEarned]) {
        const entitled = Number(lt.daysPerYear);
        const used = faker.number.int({ min: 0, max: Math.floor(entitled * 0.4) });
        leaveBalanceInserts.push({
          orgId: org.id,
          employeeId: u.id,
          leaveTypeId: lt.id,
          year: '2026',
          entitled: String(entitled),
          accrued: String(entitled),
          used: String(used),
          pending: '0',
          carriedForward: '0',
          adjusted: '0',
          available: String(entitled - used),
        });
      }
    }
    await db.insert(leaveBalances).values(leaveBalanceInserts);
    console.log(`  ✓ Leave balances: ${leaveBalanceInserts.length} (20 employees × 3 types)`);

    // ── 12. Leave Requests (5 pending + 10 approved), anchored to SEED_TODAY ──
    const allLeaveTypes = [ltCasual, ltSick, ltEarned];

    // Pending: emp01–05, upcoming dates (anchor +3, +5, +7, +9, +11)
    const pendingLeaveReasons = [
      'Amplexus quam utique video at decretum umquam sumo aliquid.',
      'Esse umquam conscendo tabula nesciunt calcar tamen enim defero.',
      'Adamo absens universe velut tribuo carus tricesimus.',
      'Canis tricesimus possimus pecus.',
      'Communis timidus speciosus vulticulus absconditus quis cavus teneo denique.',
    ];
    const pendingLeaveInserts = Array.from({ length: 5 }, (_, i) => {
      const from = anchorPlusDays(3 + i * 2);
      const to = anchorPlusDays(3 + i * 2 + 1);
      return {
        orgId: org.id,
        employeeId: empUsers[i].id,
        leaveTypeId: allLeaveTypes[i % 3].id,
        fromDate: fmt(from),
        toDate: fmt(to),
        totalDays: '2',
        reason: pendingLeaveReasons[i],
        status: 'pending',
      };
    });

    // Approved: emp06–15, recent dates (anchor −2, −6, −10, … −38), approved 3 days prior
    const approvedLeaveReasons = [
      'Certe denego vulgo voveo calculus avarus curis.',
      'Teneo tibi conatus tripudio confido aegrotatio utilis decumbo complectus copia.',
      'Campana absens arceo urbanus triumphus claro.',
      'Amicitia tametsi congregatio suadeo conspergo certe verumtamen.',
      'Comprehendo patior carbo verbera acerbitas combibo.',
      'Accusamus cedo claustrum solitudo thymbra quos alveus.',
      'Adversus tremo provident.',
      'Succurro deputo sequi volubilis suffragium adamo deprecator utrimque curatio.',
      'Adnuo succedo degenero statua.',
      'Qui cunae conor.',
    ];
    const approvedLeaveInserts = Array.from({ length: 10 }, (_, i) => {
      const from = anchorPlusDays(-2 - i * 4);
      const to = anchorPlusDays(-2 - i * 4 + 1);
      return {
        orgId: org.id,
        employeeId: empUsers[i + 5].id,
        leaveTypeId: allLeaveTypes[i % 3].id,
        fromDate: fmt(from),
        toDate: fmt(to),
        totalDays: '2',
        reason: approvedLeaveReasons[i],
        status: 'approved',
        approvedBy: managerUser.id,
        approvedAt: anchorPlusDays(-2 - i * 4 - 3),
        approverComment: 'Approved',
      };
    });

    await db
      .insert(leaveRequests)
      .values([...pendingLeaveInserts, ...approvedLeaveInserts]);
    console.log(`  ✓ Leave requests: 5 pending + 10 approved`);

    // ── 13. Timesheet Entries (last 20 weekdays per employee) ────────────────
    const weekdays20 = weekdaysInLastNDays(30).slice(-20);
    const timesheetInserts: {
      orgId: string;
      employeeId: string;
      date: string;
      hours: string;
      description: string;
      activityType: string;
      status: string;
      isBillable: boolean;
    }[] = [];

    const activities = ['development', 'meeting', 'review', 'documentation', 'testing', 'design'];

    for (const u of empUsers) {
      for (const day of weekdays20) {
        const hours = faker.number.float({ min: 6, max: 8, fractionDigits: 1 });
        timesheetInserts.push({
          orgId: org.id,
          employeeId: u.id,
          date: fmt(day),
          hours: String(hours),
          description: faker.hacker.phrase(),
          activityType: faker.helpers.arrayElement(activities),
          status: 'approved',
          isBillable: true,
        });
      }
    }

    for (let i = 0; i < timesheetInserts.length; i += 500) {
      await db.insert(timesheetEntries).values(timesheetInserts.slice(i, i + 500));
    }
    console.log(`  ✓ Timesheet entries: ${timesheetInserts.length} (20 employees × 20 days)`);

    // ── 14. Payroll Run + Entries (February 2026) ────────────────────────────
    const [payrollRun] = await db
      .insert(payrollRuns)
      .values({
        orgId: org.id,
        month: 2,
        year: 2026,
        status: 'finalized',
        totalEmployees: 20,
        totalGrossPay: '1500000',
        totalDeductions: '228000',
        totalNetPay: '1272000',
        processedBy: adminUser.id,
        approvedBy: adminUser.id,
        processedAt: new Date('2026-02-28T10:00:00Z'),
        approvedAt: new Date('2026-02-28T14:00:00Z'),
        finalizedAt: new Date('2026-02-28T16:00:00Z'),
        isLocked: true,
      })
      .returning();

    // Salary bands by employee index (0-based)
    const salaryBand = (i: number): number => {
      if (i < 5) return 35000;   // Junior SWE
      if (i < 8) return 60000;   // Senior SWE
      if (i < 10) return 40000;  // Sales Exec
      if (i < 12) return 55000;  // Senior Sales
      if (i < 16) return 30000;  // HR / Finance Analyst
      if (i === 19) return 80000; // Finance Manager
      return 35000;
    };

    const payrollEntryInserts = empUsers.map((u, i) => {
      const basic = salaryBand(i);
      const hra = Math.round(basic * 0.4);
      const da = Math.round(basic * 0.1);
      const specialAllowance = Math.round(basic * 0.15);
      const gross = basic + hra + da + specialAllowance;
      const pf = Math.round(basic * 0.12);
      const pt = 200;
      const incomeTax = Math.round(gross * 0.1);
      const totalDed = pf + pt + incomeTax;
      return {
        orgId: org.id,
        payrollRunId: payrollRun.id,
        employeeId: u.id,
        basicSalary: String(basic),
        hra: String(hra),
        da: String(da),
        specialAllowance: String(specialAllowance),
        grossEarnings: String(gross),
        pfDeduction: String(pf),
        ptDeduction: String(pt),
        incomeTax: String(incomeTax),
        totalDeductions: String(totalDed),
        netPay: String(gross - totalDed),
        lossOfPayDays: 0,
        status: 'approved',
        isActive: true,
      };
    });
    await db.insert(payrollEntries).values(payrollEntryInserts);
    console.log(`  ✓ Payroll: 1 finalized run (Feb 2026) + 20 entries`);

    // ── 15. Expense Categories + Reports ─────────────────────────────────────
    const expCatRows = await db
      .insert(expenseCategories)
      .values([
        { orgId: org.id, name: 'Travel', icon: 'Plane', sortOrder: 1 },
        { orgId: org.id, name: 'Meals & Entertainment', icon: 'UtensilsCrossed', sortOrder: 2 },
        { orgId: org.id, name: 'Office Supplies', icon: 'Package', sortOrder: 3 },
        { orgId: org.id, name: 'Training & Certification', icon: 'GraduationCap', sortOrder: 4 },
      ])
      .returning();

    const expenseStatusList = [
      'draft', 'submitted', 'approved',
      'draft', 'submitted', 'approved',
      'approved', 'draft', 'submitted', 'approved',
    ];
    const expenseTitles = [
      'Team Lunch', 'Client Visit Travel', 'AWS Certification',
      'Office Supplies Q1', 'Conference Registration', 'Training Course',
      'Business Travel — Delhi', 'Hardware Purchase', 'Team Offsite', 'Software License',
    ];

    const expReportInserts = expenseStatusList.map((status, i) => ({
      orgId: org.id,
      employeeId: empUsers[i % empUsers.length].id,
      title: expenseTitles[i],
      description: faker.lorem.sentence(),
      totalAmount: String(faker.number.int({ min: 500, max: 15000 })),
      status,
      submittedAt: status !== 'draft' ? new Date('2026-02-20T09:00:00Z') : null,
      approvedAt: status === 'approved' ? new Date('2026-02-25T10:00:00Z') : null,
      isActive: true,
    }));

    const expReports = await db.insert(expenseReports).values(expReportInserts).returning();

    // One expense item per report
    await db.insert(expenseItems).values(
      expReports.map((r, i) => ({
        orgId: org.id,
        reportId: r.id,
        categoryId: expCatRows[i % expCatRows.length].id,
        date: new Date('2026-02-15T00:00:00Z'),
        amount: r.totalAmount,
        description: faker.commerce.productDescription().slice(0, 100),
        vendor: faker.company.name(),
        isActive: true,
      })),
    );

    const draftCount = expenseStatusList.filter((s) => s === 'draft').length;
    const submittedCount = expenseStatusList.filter((s) => s === 'submitted').length;
    const approvedCount = expenseStatusList.filter((s) => s === 'approved').length;
    console.log(
      `  ✓ Expenses: ${expReports.length} reports` +
      ` (${draftCount} draft, ${submittedCount} submitted, ${approvedCount} approved)`,
    );

    // ═════════════════════════════════════════════════════════════════════════
    // ADDITIONAL POPULATED TABLES (recovery — reproduce the live demo DB)
    // ═════════════════════════════════════════════════════════════════════════

    // ── Locations (3) ─────────────────────────────────────────────────────────
    await db.insert(locations).values([
      { orgId: org.id, name: 'Bengaluru HQ', code: 'BLR', type: 'office', address: 'Prestige Tech Park, Marathahalli', city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560037', timezone: 'Asia/Kolkata', isPrimary: true, isActive: true },
      { orgId: org.id, name: 'Mumbai Office', code: 'BOM', type: 'office', address: 'Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400051', timezone: 'Asia/Kolkata', isPrimary: false, isActive: true },
      { orgId: org.id, name: 'Remote — India', code: 'REM', type: 'remote', country: 'India', timezone: 'Asia/Kolkata', isPrimary: false, isActive: true },
    ]);
    console.log('  ✓ Locations: 3');

    // ── Grades (5) ────────────────────────────────────────────────────────────
    const gradeRows = await db.insert(grades).values([
      { orgId: org.id, name: 'L1 — Associate', level: 1, salaryBandMin: '300000', salaryBandMax: '600000', currency: 'INR', description: 'Entry level' },
      { orgId: org.id, name: 'L2 — Engineer', level: 2, salaryBandMin: '600000', salaryBandMax: '1200000', currency: 'INR', description: 'Individual contributor' },
      { orgId: org.id, name: 'L3 — Senior Engineer', level: 3, salaryBandMin: '1200000', salaryBandMax: '2000000', currency: 'INR', description: 'Senior IC' },
      { orgId: org.id, name: 'L4 — Manager / Lead', level: 4, salaryBandMin: '2000000', salaryBandMax: '3200000', currency: 'INR', description: 'People / tech lead' },
      { orgId: org.id, name: 'L5 — Director', level: 5, salaryBandMin: '3200000', salaryBandMax: '5000000', currency: 'INR', description: 'Leadership' },
    ]).returning();
    void gradeRows;
    console.log('  ✓ Grades: 5');

    // ── Talent Acquisition ──
    const pipelineStages = await db.insert(recruitmentPipelineStages).values([
      { orgId: org.id, requisitionId: null, name: 'Sourced', code: 'SOURCED', stageType: 'sourcing', sortOrder: 0, slaDays: 3, interviewerCount: 0, isMandatory: true },
      { orgId: org.id, requisitionId: null, name: 'Screening', code: 'SCREEN', stageType: 'screening', sortOrder: 1, slaDays: 5, interviewerCount: 1, isMandatory: true },
      { orgId: org.id, requisitionId: null, name: 'Interview', code: 'INTERVIEW', stageType: 'interview', sortOrder: 2, slaDays: 7, interviewerCount: 2, isMandatory: true },
      { orgId: org.id, requisitionId: null, name: 'Offer', code: 'OFFER', stageType: 'offer', sortOrder: 3, slaDays: 5, interviewerCount: 0, isMandatory: true },
      { orgId: org.id, requisitionId: null, name: 'Hired', code: 'HIRED', stageType: 'hired', sortOrder: 4, slaDays: 0, interviewerCount: 0, isMandatory: true },
    ]).returning();
    const interviewStage = pipelineStages[2];
    const requisitions = await db.insert(jobRequisitions).values([
      { orgId: org.id, title: 'Senior Software Engineer', departmentId: engDept.id, designationId: sse.id, headcount: 2, filledCount: 1, employmentType: 'full_time', salaryRangeMin: '1400000', salaryRangeMax: '2000000', currency: 'INR', status: 'open', priority: 'high', targetHireDate: fmt(anchorPlusDays(30)), skills: ['TypeScript', 'Node.js', 'PostgreSQL'], createdBy: managerUser.id, approvedBy: adminUser.id, approvedAt: anchorPlusDays(-40), metadata: { openedAt: fmt(anchorPlusDays(-45)), filledAt: fmt(anchorPlusDays(-7)) } },
      { orgId: org.id, title: 'Software Engineer', departmentId: engDept.id, designationId: swe.id, headcount: 3, filledCount: 1, employmentType: 'full_time', salaryRangeMin: '800000', salaryRangeMax: '1200000', currency: 'INR', status: 'open', priority: 'medium', targetHireDate: fmt(anchorPlusDays(45)), skills: ['JavaScript', 'React'], createdBy: managerUser.id, approvedBy: adminUser.id, approvedAt: anchorPlusDays(-30), metadata: { openedAt: fmt(anchorPlusDays(-35)), filledAt: fmt(anchorPlusDays(-5)) } },
      { orgId: org.id, title: 'Sales Executive', departmentId: salesDept.id, designationId: salesExec.id, headcount: 2, filledCount: 0, employmentType: 'full_time', salaryRangeMin: '500000', salaryRangeMax: '800000', currency: 'INR', status: 'approved', priority: 'medium', targetHireDate: fmt(anchorPlusDays(60)), skills: ['Negotiation', 'CRM'], createdBy: managerUser.id, approvedBy: adminUser.id, approvedAt: anchorPlusDays(-15), metadata: { openedAt: fmt(anchorPlusDays(-20)) } },
      { orgId: org.id, title: 'HR Executive', departmentId: hrDept.id, designationId: hrExec.id, headcount: 1, filledCount: 0, employmentType: 'full_time', salaryRangeMin: '450000', salaryRangeMax: '700000', currency: 'INR', status: 'pending_approval', priority: 'low', targetHireDate: fmt(anchorPlusDays(75)), skills: ['Recruitment', 'Onboarding'], createdBy: managerUser.id, currentApproverLevel: 1, approvalChain: [{ level: 1, approverId: adminUser.id, role: 'admin' }], metadata: { openedAt: fmt(anchorPlusDays(-8)) } },
      { orgId: org.id, title: 'Engineering Lead', departmentId: engDept.id, designationId: sse.id, headcount: 1, filledCount: 1, employmentType: 'full_time', salaryRangeMin: '2400000', salaryRangeMax: '3200000', currency: 'INR', status: 'closed', priority: 'high', targetHireDate: fmt(anchorPlusDays(-10)), skills: ['Leadership', 'System Design'], createdBy: managerUser.id, approvedBy: adminUser.id, approvedAt: anchorPlusDays(-70), metadata: { openedAt: fmt(anchorPlusDays(-75)), filledAt: fmt(anchorPlusDays(-25)) } },
    ]).returning();
    const postings = await db.insert(jobPostings).values(
      requisitions.slice(0, 3).map((r, i) => ({ orgId: org.id, requisitionId: r.id, title: r.title, description: `We are hiring a ${r.title}. Join our growing team at Acme Corp.`, requirements: 'Relevant experience and a collaborative mindset.', skills: (r.skills as string[]) ?? [], postingType: 'external', channels: ['careers_page', 'linkedin'], status: 'published', publishedAt: anchorPlusDays(-30 + i), salaryVisible: false, createdBy: managerUser.id }))
    ).returning();
    const candidateSeed = [
      { first: 'Rahul', last: 'Sharma', title: 'Software Engineer', company: 'Infosys', exp: '5.0' },
      { first: 'Priya', last: 'Nair', title: 'Frontend Developer', company: 'TCS', exp: '3.5' },
      { first: 'Arjun', last: 'Reddy', title: 'Sales Associate', company: 'Wipro', exp: '4.0' },
      { first: 'Sneha', last: 'Iyer', title: 'Senior Engineer', company: 'Flipkart', exp: '7.0' },
      { first: 'Vikram', last: 'Singh', title: 'Backend Developer', company: 'Zoho', exp: '4.5' },
    ];
    const seededCandidates = await db.insert(candidates).values(
      candidateSeed.map((c, i) => ({ orgId: org.id, firstName: c.first, lastName: c.last, email: `${c.first.toLowerCase()}.${c.last.toLowerCase()}@example.com`, phone: `+9199${String(10000000 + i).padStart(8, '0')}`, currentTitle: c.title, currentCompany: c.company, experienceYears: c.exp, skills: ['JavaScript', 'TypeScript'], source: 'linkedin', currentLocation: 'Bengaluru', status: 'active' }))
    ).returning();
    const appSeed = [
      { cand: 0, req: 0, posting: 0, status: 'interviewing', score: '8.50' },
      { cand: 1, req: 1, posting: 1, status: 'shortlisted', score: '7.80' },
      { cand: 2, req: 2, posting: 2, status: 'screening', score: '7.20' },
      { cand: 3, req: 0, posting: 0, status: 'interviewing', score: '9.10' },
      { cand: 4, req: 1, posting: 1, status: 'new', score: '8.00' },
    ];
    const seededApplications = await db.insert(applications).values(
      appSeed.map((a) => ({ orgId: org.id, candidateId: seededCandidates[a.cand].id, jobPostingId: postings[a.posting].id, requisitionId: requisitions[a.req].id, source: 'linkedin', status: a.status, overallScore: a.score, currentStageId: interviewStage.id, appliedAt: anchorPlusDays(-20) }))
    ).returning();
    await db.insert(interviews).values([
      { orgId: org.id, applicationId: seededApplications[0].id, stageId: interviewStage.id, candidateId: seededCandidates[0].id, scheduledAt: anchorPlusDays(3), duration: 60, location: 'Google Meet', interviewType: 'video', status: 'scheduled', panelMembers: [{ userId: managerUser.id, name: 'Sarah Mehta', role: 'interviewer' }] },
      { orgId: org.id, applicationId: seededApplications[3].id, stageId: interviewStage.id, candidateId: seededCandidates[3].id, scheduledAt: anchorPlusDays(5), duration: 45, location: 'Bengaluru HQ — Room 3', interviewType: 'in_person', status: 'scheduled', panelMembers: [{ userId: managerUser.id, name: 'Sarah Mehta', role: 'interviewer' }] },
      { orgId: org.id, applicationId: seededApplications[1].id, stageId: interviewStage.id, candidateId: seededCandidates[1].id, scheduledAt: anchorPlusDays(7), duration: 60, location: 'Zoom', interviewType: 'video', status: 'scheduled', panelMembers: [{ userId: managerUser.id, name: 'Sarah Mehta', role: 'interviewer' }] },
    ]);
    await db.insert(offerLetters).values([
      { orgId: org.id, applicationId: seededApplications[0].id, candidateId: seededCandidates[0].id, requisitionId: requisitions[0].id, designation: 'Senior Software Engineer', department: 'Engineering', location: 'Bengaluru', employmentType: 'full_time', salaryAmount: '1800000', currency: 'INR', joiningDate: fmt(anchorPlusDays(25)), probationMonths: 6, status: 'accepted', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-10), sentAt: anchorPlusDays(-9), acceptedAt: anchorPlusDays(-7), createdBy: managerUser.id },
      { orgId: org.id, applicationId: seededApplications[3].id, candidateId: seededCandidates[3].id, requisitionId: requisitions[1].id, designation: 'Software Engineer', department: 'Engineering', location: 'Bengaluru', employmentType: 'full_time', salaryAmount: '1100000', currency: 'INR', joiningDate: fmt(anchorPlusDays(35)), probationMonths: 6, status: 'accepted', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-8), sentAt: anchorPlusDays(-7), acceptedAt: anchorPlusDays(-5), createdBy: managerUser.id },
      { orgId: org.id, applicationId: seededApplications[1].id, candidateId: seededCandidates[1].id, requisitionId: requisitions[1].id, designation: 'Software Engineer', department: 'Engineering', location: 'Bengaluru', employmentType: 'full_time', salaryAmount: '1000000', currency: 'INR', joiningDate: fmt(anchorPlusDays(40)), probationMonths: 6, status: 'sent', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-3), sentAt: anchorPlusDays(-2), createdBy: managerUser.id },
    ]);
    await db.insert(referrals).values([
      { orgId: org.id, referrerId: managerUser.id, jobPostingId: postings[0].id, candidateName: 'Karan Malhotra', candidateEmail: 'karan.malhotra@example.com', candidatePhone: '+919900112233', relationship: 'Former colleague', notes: 'Strong backend engineer.', status: 'hired', bonusAmount: '50000', bonusCurrency: 'INR', bonusStatus: 'paid', bonusPaidAt: anchorPlusDays(-3) },
      { orgId: org.id, referrerId: managerUser.id, jobPostingId: postings[1].id, candidateName: 'Anita Desai', candidateEmail: 'anita.desai@example.com', candidatePhone: '+919900445566', relationship: 'University classmate', notes: 'Great culture fit.', status: 'interviewing', bonusAmount: '40000', bonusCurrency: 'INR', bonusStatus: 'approved' },
      { orgId: org.id, referrerId: empUsers[0].id, jobPostingId: postings[2].id, candidateName: 'Mohit Verma', candidateEmail: 'mohit.verma@example.com', candidatePhone: '+919900778899', relationship: 'Friend', notes: 'Experienced sales rep.', status: 'submitted', bonusStatus: 'not_eligible' },
    ]);
    console.log('  ✓ Talent Acquisition: 5 requisitions, 5 stages, 3 postings, 5 candidates, 5 applications, 3 interviews, 3 offers, 3 referrals');

    // ── Entities (2) ──────────────────────────────────────────────────────────
    await db.insert(entities).values([
      { orgId: org.id, name: 'Acme Corp India', legalName: 'Acme Corporation India Private Limited', registrationNumber: 'U72900KA2020PTC123456', taxId: '29AABCA1234A1Z5', country: 'India', address: 'Prestige Tech Park, Marathahalli', city: 'Bengaluru', state: 'Karnataka', currency: 'INR', isPrimary: true, isActive: true },
      { orgId: org.id, name: 'Acme Corp US', legalName: 'Acme Corporation Inc.', registrationNumber: 'DE-5589321', taxId: '47-1234567', country: 'United States', address: '500 Market Street, Suite 400', city: 'San Francisco', state: 'California', currency: 'USD', isPrimary: false, isActive: true },
    ]);
    console.log('  ✓ Entities: 2');

    // ── Salary Structures (3) + Employee Salary Assignments (20) ──────────────
    const baseStructComponents = [
      { name: 'Basic', type: 'earning', calculationType: 'percentage', value: 50, isStatutory: false },
      { name: 'HRA', type: 'earning', calculationType: 'percentage', value: 20, isStatutory: false },
      { name: 'Special Allowance', type: 'earning', calculationType: 'percentage', value: 30, isStatutory: false },
      { name: 'Provident Fund', type: 'deduction', calculationType: 'percentage', value: 12, isStatutory: true },
      { name: 'Professional Tax', type: 'deduction', calculationType: 'fixed', value: 200, isStatutory: true },
    ];
    const [engStruct, salesStruct, corpStruct] = await db.insert(salaryStructures).values([
      { orgId: org.id, name: 'Engineering Grade', description: 'Standard structure for Engineering', isActive: true, components: baseStructComponents },
      { orgId: org.id, name: 'Sales Grade', description: 'Structure for Sales (incl. incentive)', isActive: true, components: [...baseStructComponents, { name: 'Sales Incentive', type: 'earning', calculationType: 'fixed', value: 10000, isStatutory: false }] },
      { orgId: org.id, name: 'Corporate Grade', description: 'HR / Finance corporate structure', isActive: true, components: baseStructComponents },
    ]).returning();
    // basic salary band per employee index (0-based) — mirrors payroll salaryBand()
    const empBasic = (i: number): number => {
      if (i < 5) return 35000;
      if (i < 8) return 60000;
      if (i < 10) return 40000;
      if (i < 12) return 55000;
      if (i < 16) return 30000;
      if (i === 19) return 80000;
      return 35000;
    };
    await db.insert(employeeSalaryAssignments).values(
      empUsers.map((u, i) => {
        const basic = empBasic(i);
        const struct = i < 8 ? engStruct : i < 12 ? salesStruct : corpStruct;
        return {
          orgId: org.id,
          employeeId: u.id,
          salaryStructureId: struct.id,
          ctc: String(basic * 12 * 1.5),
          basicSalary: String(basic),
          effectiveFrom: new Date('2025-01-01T00:00:00Z'),
          componentOverrides: {},
        };
      }),
    );
    console.log('  ✓ Salary structures: 3, salary assignments: 20');

    // ── Benefit Plans (4) + Enrollments (50) ──────────────────────────────────
    const [healthPlan, lifePlan, dentalPlan, wellnessPlan] = await db.insert(benefitPlans).values([
      { orgId: org.id, name: 'Group Health Insurance', type: 'health', description: 'Family floater — ₹5L cover', provider: 'Star Health', isActive: true, employerContribution: '100', employerContributionType: 'percentage', employeeContribution: '0', employeeContributionType: 'fixed' },
      { orgId: org.id, name: 'Group Term Life', type: 'life', description: '3x annual CTC life cover', provider: 'LIC of India', isActive: true, employerContribution: '100', employerContributionType: 'percentage', employeeContribution: '0', employeeContributionType: 'fixed' },
      { orgId: org.id, name: 'Dental & Vision', type: 'dental', description: 'Annual dental + vision allowance', provider: 'ICICI Lombard', isActive: true, employerContribution: '80', employerContributionType: 'percentage', employeeContribution: '20', employeeContributionType: 'percentage' },
      { orgId: org.id, name: 'Wellness Program', type: 'wellness', description: 'Gym + mental-wellness membership', provider: 'Cult.fit', isActive: true, employerContribution: '5000', employerContributionType: 'fixed', employeeContribution: '0', employeeContributionType: 'fixed' },
    ]).returning();
    void wellnessPlan;
    const benefitEnrollmentInserts: {
      orgId: string; employeeId: string; planId: string; status: string;
      enrolledAt: Date; effectiveFrom: Date; dependents: unknown[];
    }[] = [];
    for (let i = 0; i < empUsers.length; i++) {
      const u = empUsers[i];
      // every employee: Health + Term Life; odd 1-based index also gets Dental
      const plans = [healthPlan, lifePlan];
      if ((i + 1) % 2 === 1) plans.unshift(dentalPlan);
      for (const p of plans) {
        benefitEnrollmentInserts.push({
          orgId: org.id, employeeId: u.id, planId: p.id, status: 'active',
          enrolledAt: SEED_TODAY, effectiveFrom: new Date('2025-01-01T00:00:00Z'), dependents: [],
        });
      }
    }
    await db.insert(benefitEnrollments).values(benefitEnrollmentInserts);
    console.log(`  ✓ Benefit plans: 4, enrollments: ${benefitEnrollmentInserts.length}`);

    // ── Custom Field Definitions (5) ──────────────────────────────────────────
    await db.insert(customFieldDefinitions).values([
      { orgId: org.id, entity: 'employee', fieldName: 'blood_group', fieldLabel: 'Blood Group', fieldType: 'select', isRequired: false, isActive: true, sortOrder: 1, options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], section: 'Personal' },
      { orgId: org.id, entity: 'department', fieldName: 'cost_center', fieldLabel: 'Cost Center Code', fieldType: 'text', isRequired: false, isActive: true, sortOrder: 1, options: [], section: 'Finance' },
      { orgId: org.id, entity: 'employee', fieldName: 'tshirt_size', fieldLabel: 'T-Shirt Size', fieldType: 'select', isRequired: false, isActive: true, sortOrder: 2, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], section: 'Personal' },
      { orgId: org.id, entity: 'employee', fieldName: 'emergency_contact', fieldLabel: 'Emergency Contact No.', fieldType: 'text', isRequired: true, isActive: true, sortOrder: 3, options: [], section: 'Personal' },
      { orgId: org.id, entity: 'employee', fieldName: 'linkedin_url', fieldLabel: 'LinkedIn Profile', fieldType: 'text', isRequired: false, isActive: true, sortOrder: 4, options: [], section: 'Professional' },
    ]);
    console.log('  ✓ Custom field definitions: 5');

    // ── Audit Logs (24) ───────────────────────────────────────────────────────
    const auditActionEntity: { action: string; entity: string }[] = [
      { action: 'view', entity: 'payroll_run' },
      { action: 'delete', entity: 'custom_field' },
      { action: 'create', entity: 'leave_request' },
      { action: 'update', entity: 'benefit_plan' },
      { action: 'export', entity: 'document' },
      { action: 'view', entity: 'salary_structure' },
      { action: 'update', entity: 'department' },
      { action: 'create', entity: 'employee' },
    ];
    const auditUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    const auditLogInserts = Array.from({ length: 24 }, (_, k) => {
      const ae = auditActionEntity[k % 8];
      const actor = k % 3 === 2 ? adminUser : managerUser;
      const actorName = actor === adminUser ? 'Alex Kumar' : 'Sarah Mehta';
      // oldest first: anchor − 3 days 09:00 + k×3h
      const ts = new Date(SEED_TODAY);
      ts.setUTCDate(ts.getUTCDate() - 3);
      ts.setUTCHours(9 + k * 3, 0, 0, 0);
      return {
        orgId: org.id,
        userId: actor.id,
        action: ae.action,
        entity: ae.entity,
        entityId: faker.string.uuid(),
        description: `${actorName} performed "${ae.action}" on a ${ae.entity.replace(/_/g, ' ')} record`,
        ipAddress: `10.0.${(33 - k) % 5}.${33 - k}`,
        userAgent: auditUA,
        createdAt: ts,
      };
    });
    await db.insert(auditLogs).values(auditLogInserts);
    console.log('  ✓ Audit logs: 24');

    // ── Documents (62) ────────────────────────────────────────────────────────
    type DocRow = {
      orgId: string; employeeId: string; category: string; name: string;
      description: string; fileUrl: string; fileSize: string | null;
      mimeType: string | null; expiryDate: string | null; isVerified: boolean; version: string;
    };
    const docInserts: DocRow[] = [];
    const baseDoc = (u: typeof empUsers[number], category: string, name: string, isVerified: boolean): DocRow => ({
      orgId: org.id, employeeId: u.id, category, name, description: `${name} on file`,
      fileUrl: `https://files.acme.test/${faker.string.uuid()}/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
      fileSize: '248 KB', mimeType: 'application/pdf', expiryDate: null, isVerified, version: '1',
    });
    const extraDocCycle: { category: string; name: string; verified: boolean; expiry: string | null }[] = [
      { category: 'identity', name: 'PAN Card', verified: true, expiry: null },
      { category: 'certificates', name: 'Degree Certificate', verified: false, expiry: null },
      { category: 'letters', name: 'Offer Letter', verified: true, expiry: null },
      { category: 'identity', name: 'Passport', verified: true, expiry: '2030-07-18' },
    ];
    for (let i = 0; i < empUsers.length; i++) {
      const u = empUsers[i];
      docInserts.push(baseDoc(u, 'contracts', 'Employment Agreement', true));
      docInserts.push(baseDoc(u, 'identity', 'Aadhaar Card', true));
      const extra = extraDocCycle[i % 4];
      const extraDoc = baseDoc(u, extra.category, extra.name, extra.verified);
      extraDoc.expiryDate = extra.expiry;
      docInserts.push(extraDoc);
    }
    // Special extras: emp01 AWS cert, emp02 Work Visa
    docInserts.push({ orgId: org.id, employeeId: empUsers[0].id, category: 'certificates', name: 'AWS Certification', description: 'Expiring soon', fileUrl: 'https://files.acme.test/cert-aws.pdf', fileSize: null, mimeType: null, expiryDate: fmt(anchorPlusDays(20)), isVerified: true, version: '1' });
    docInserts.push({ orgId: org.id, employeeId: empUsers[1].id, category: 'identity', name: 'Work Visa', description: 'Expired — needs renewal', fileUrl: `https://files.acme.test/${faker.string.uuid()}/work-visa.pdf`, fileSize: null, mimeType: null, expiryDate: fmt(anchorPlusDays(-15)), isVerified: true, version: '1' });
    await db.insert(documents).values(docInserts);
    console.log(`  ✓ Documents: ${docInserts.length}`);

    // ── Self-Service Requests (12) ────────────────────────────────────────────
    const reviewedSsr = [
      { empIdx: 9, type: 'noc', status: 'rejected', priority: 'normal', subject: 'NOC for higher education' },
      { empIdx: 8, type: 'address_change', status: 'completed', priority: 'high', subject: 'Update residential address' },
      { empIdx: 7, type: 'salary_certificate', status: 'approved', priority: 'normal', subject: 'Salary certificate for visa application' },
      { empIdx: 4, type: 'noc', status: 'rejected', priority: 'high', subject: 'NOC for higher education' },
      { empIdx: 3, type: 'address_change', status: 'completed', priority: 'normal', subject: 'Update residential address' },
      { empIdx: 2, type: 'salary_certificate', status: 'approved', priority: 'normal', subject: 'Salary certificate for visa application' },
    ];
    const openSsr = [
      { empIdx: 11, type: 'experience_letter', status: 'in_review', priority: 'normal', subject: 'Experience letter request' },
      { empIdx: 10, type: 'employment_verification', status: 'pending', priority: 'normal', subject: 'Employment verification for bank loan' },
      { empIdx: 6, type: 'experience_letter', status: 'in_review', priority: 'normal', subject: 'Experience letter request' },
      { empIdx: 5, type: 'employment_verification', status: 'pending', priority: 'normal', subject: 'Employment verification for bank loan' },
      { empIdx: 1, type: 'experience_letter', status: 'in_review', priority: 'normal', subject: 'Experience letter request' },
      { empIdx: 0, type: 'employment_verification', status: 'pending', priority: 'high', subject: 'Employment verification for bank loan' },
    ];
    await db.insert(selfServiceRequests).values([
      ...reviewedSsr.map((s) => ({
        orgId: org.id, employeeId: empUsers[s.empIdx].id, type: s.type, status: s.status,
        priority: s.priority, subject: s.subject, description: faker.lorem.sentence(),
        data: {}, attachments: [], reviewedBy: managerUser.id, reviewedAt: anchorPlusDays(-3),
        completedAt: s.status === 'completed' ? anchorPlusDays(-2) : null,
      })),
      ...openSsr.map((s) => ({
        orgId: org.id, employeeId: empUsers[s.empIdx].id, type: s.type, status: s.status,
        priority: s.priority, subject: s.subject, description: faker.lorem.sentence(),
        data: {}, attachments: [],
      })),
    ]);
    console.log('  ✓ Self-service requests: 12');

    // ── Org Change Requests (5) ───────────────────────────────────────────────
    await db.insert(orgChangeRequests).values([
      { orgId: org.id, requestedBy: managerUser.id, type: 'transfer', employeeId: empUsers[8].id, status: 'approved', currentData: {}, proposedData: { toDepartment: 'Engineering' }, justification: 'Internal mobility request.', approvedBy: adminUser.id, approvedAt: new Date('2026-02-20T10:00:00Z') },
      { orgId: org.id, requestedBy: managerUser.id, type: 'role_change', employeeId: empUsers[3].id, status: 'implemented', currentData: {}, proposedData: { newRole: 'Tech Lead' }, justification: 'Stepping into a lead role.', approvedBy: adminUser.id, approvedAt: new Date('2026-01-15T10:00:00Z'), implementedAt: new Date('2026-02-01T00:00:00Z') },
      { orgId: org.id, requestedBy: managerUser.id, type: 'reporting_change', employeeId: empUsers[5].id, status: 'rejected', currentData: {}, proposedData: { newManager: 'Sarah Mehta' }, justification: 'Requested reporting line change.', rejectionReason: 'Org structure unchanged this quarter.' },
      { orgId: org.id, requestedBy: managerUser.id, type: 'salary_change', employeeId: empUsers[2].id, status: 'pending', currentData: {}, proposedData: { hikePercent: 12 }, justification: 'Annual merit increase.', budgetImpact: '+₹8,400/mo' },
      { orgId: org.id, requestedBy: managerUser.id, type: 'promotion', employeeId: empUsers[0].id, status: 'pending', currentData: {}, proposedData: { newLevel: 3, newDesignation: 'Senior Software Engineer' }, justification: 'Consistently exceeds expectations; led two major releases.', budgetImpact: '+₹15,000/mo' },
    ]);
    console.log('  ✓ Org change requests: 5');

    // ── Leave Approval Workflows (2) ──────────────────────────────────────────
    await db.insert(leaveApprovalWorkflows).values([
      { orgId: org.id, name: 'Standard Single-Level Approval', levels: [{ level: 1, approverType: 'reporting_manager' }], applicableLeaveTypes: [ltCasual.id, ltSick.id], applicableDepartments: [], minDaysForMultiLevel: 3, isDefault: true, isActive: true },
      { orgId: org.id, name: 'Extended Leave Two-Level', levels: [{ level: 1, approverType: 'reporting_manager' }, { level: 2, approverType: 'department_head' }], applicableLeaveTypes: [ltEarned.id], applicableDepartments: [engDept.id, salesDept.id], minDaysForMultiLevel: 5, isDefault: false, isActive: true },
    ]);
    console.log('  ✓ Leave approval workflows: 2');

    // ── Holiday Calendars (12) ────────────────────────────────────────────────
    await db.insert(holidayCalendars).values([
      { orgId: org.id, name: "New Year's Day", date: '2026-01-01', type: 'national', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Republic Day', date: '2026-01-26', type: 'national', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Holi', date: '2026-03-04', type: 'religious', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Good Friday', date: '2026-04-03', type: 'religious', isOptional: true, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'May Day', date: '2026-05-01', type: 'national', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: "Founder's Day (Acme)", date: '2026-07-15', type: 'company', isOptional: false, isFloating: false, year: '2026', description: 'Company-declared holiday' },
      { orgId: org.id, name: 'Independence Day', date: '2026-08-15', type: 'national', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Floating Holiday', date: '2026-09-05', type: 'restricted', isOptional: true, isFloating: true, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Gandhi Jayanti', date: '2026-10-02', type: 'national', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Dussehra', date: '2026-10-20', type: 'religious', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Diwali', date: '2026-11-08', type: 'religious', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
      { orgId: org.id, name: 'Christmas', date: '2026-12-25', type: 'national', isOptional: false, isFloating: false, year: '2026', description: 'Public holiday' },
    ]);
    console.log('  ✓ Holiday calendars: 12');

    // ── Comp-Off Records (8) ──────────────────────────────────────────────────
    const compOffWorkTypes = ['weekend', 'holiday', 'extra_hours'];
    await db.insert(compOffRecords).values(
      Array.from({ length: 8 }, (_, i) => {
        const workType = compOffWorkTypes[i % 3];
        const earned = anchorPlusDays(-45 + i * 5);
        const used = i % 3 === 0;
        return {
          orgId: org.id, employeeId: empUsers[i].id, earnedDate: fmt(earned),
          reason: `Worked on ${workType.replace('_', ' ')} for release support`,
          workType, daysEarned: '1', daysUsed: used ? '1' : '0', daysAvailable: used ? '0' : '1',
          expiryDate: fmt(anchorPlusDays(-45 + i * 5 + 90)), status: used ? 'used' : 'active',
          approvedBy: managerUser.id, approvedAt: anchorPlusDays(-45 + i * 5 + 2), metadata: {},
        };
      }),
    );
    console.log('  ✓ Comp-off records: 8');

    // ── Overtime Requests (5) ─────────────────────────────────────────────────
    await db.insert(overtimeRequests).values([
      { orgId: org.id, employeeId: empUsers[0].id, date: fmt(anchorPlusDays(-2)), type: 'pre_approval', estimatedHours: 3, actualHours: 3, reason: 'Production release support', reasonCode: 'release', status: 'approved', reviewedBy: managerUser.id, reviewedAt: anchorPlusDays(-3), reviewerComment: 'Approved', overtimeRate: '1.5x', compOffEligible: 'no', metadata: {} },
      { orgId: org.id, employeeId: empUsers[0].id, date: fmt(anchorPlusDays(-8)), type: 'pre_approval', estimatedHours: 4, reason: 'Sprint deadline', reasonCode: 'deadline', status: 'rejected', reviewedBy: managerUser.id, reviewedAt: anchorPlusDays(-9), reviewerComment: 'Defer to next sprint', compOffEligible: 'no', metadata: {} },
      { orgId: org.id, employeeId: empUsers[0].id, date: fmt(anchorPlusDays(-1)), type: 'post_facto', estimatedHours: 2, actualHours: 2, reason: 'Client escalation fix', reasonCode: 'support', status: 'pending', compOffEligible: 'yes', metadata: {} },
      { orgId: org.id, employeeId: empUsers[1].id, date: fmt(anchorPlusDays(-3)), type: 'pre_approval', estimatedHours: 2, actualHours: 2, reason: 'Data migration', reasonCode: 'migration', status: 'approved', reviewedBy: managerUser.id, reviewedAt: anchorPlusDays(-4), compOffEligible: 'yes', metadata: {} },
      { orgId: org.id, employeeId: empUsers[2].id, date: fmt(anchorPlusDays(-5)), type: 'post_facto', estimatedHours: 3, actualHours: 3, reason: 'Month-end reporting', reasonCode: 'reporting', status: 'pending', compOffEligible: 'no', metadata: {} },
    ]);
    console.log('  ✓ Overtime requests: 5');

    // ── Attendance Breaks (14) — emp01, last 7 non-absent weekdays × 2 breaks ──
    const emp01Recent = await db
      .select({ id: attendanceRecords.id, date: attendanceRecords.date, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.employeeId, empUsers[0].id));
    const emp01BreakDays = emp01Recent
      .filter((r) => r.status !== 'absent')
      .sort((a, b) => (a.date < b.date ? 1 : -1)) // newest first
      .slice(0, 7);
    const breakInserts: {
      orgId: string; attendanceRecordId: string; breakType: string;
      startTime: Date; endTime: Date; durationMinutes: number;
    }[] = [];
    for (const rec of emp01BreakDays) {
      breakInserts.push(
        { orgId: org.id, attendanceRecordId: rec.id, breakType: 'lunch', startTime: new Date(`${rec.date}T13:00:00.000Z`), endTime: new Date(`${rec.date}T13:30:00.000Z`), durationMinutes: 30 },
        { orgId: org.id, attendanceRecordId: rec.id, breakType: 'tea', startTime: new Date(`${rec.date}T16:00:00.000Z`), endTime: new Date(`${rec.date}T16:10:00.000Z`), durationMinutes: 10 },
      );
    }
    await db.insert(attendanceBreaks).values(breakInserts);
    console.log(`  ✓ Attendance breaks: ${breakInserts.length}`);

    // ── Projects (5) + Task Categories (6) + Assignments (20) ─────────────────
    const projStart = fmt(anchorPlusDays(-90));
    const projEnd = fmt(anchorPlusDays(90));
    const projectRows = await db.insert(projects).values([
      { orgId: org.id, name: 'Apollo Platform Rebuild', code: 'APOLLO', clientName: 'Internal', description: 'Apollo Platform Rebuild engagement', startDate: projStart, endDate: projEnd, budgetHours: '1200', isBillable: true, billableRate: '85', currency: 'USD', status: 'active', color: '#4F46E5', isActive: true },
      { orgId: org.id, name: 'Helios Data Migration', code: 'HELIOS', clientName: 'Globex Corp', description: 'Helios Data Migration engagement', startDate: projStart, endDate: projEnd, budgetHours: '600', isBillable: true, billableRate: '85', currency: 'USD', status: 'active', color: '#10B981', isActive: true },
      { orgId: org.id, name: 'Internal Tooling', code: 'INTOOL', description: 'Internal Tooling engagement', startDate: projStart, endDate: projEnd, budgetHours: '400', isBillable: false, currency: 'USD', status: 'active', color: '#F59E0B', isActive: true },
      { orgId: org.id, name: 'Orion Mobile App', code: 'ORION', clientName: 'Northwind Traders', description: 'Orion Mobile App engagement', startDate: projStart, endDate: projEnd, budgetHours: '800', isBillable: true, billableRate: '85', currency: 'USD', status: 'active', color: '#0EA5E9', isActive: true },
      { orgId: org.id, name: 'Zephyr Analytics', code: 'ZEPHYR', clientName: 'Initech', description: 'Zephyr Analytics engagement', startDate: projStart, endDate: projEnd, budgetHours: '500', isBillable: true, billableRate: '85', currency: 'USD', status: 'active', color: '#EC4899', isActive: true },
    ]).returning();
    const projByCode = (code: string) => projectRows.find((p) => p.code === code)!;
    const taskCategoryRows = await db.insert(taskCategories).values([
      { orgId: org.id, name: 'Development', code: 'DEV', type: 'billable', isBillable: true, color: '#4F46E5', sortOrder: 1, isActive: true },
      { orgId: org.id, name: 'Meetings', code: 'MTG', type: 'general', isBillable: false, color: '#8B5CF6', sortOrder: 2, isActive: true },
      { orgId: org.id, name: 'Code Review', code: 'REV', type: 'billable', isBillable: true, color: '#F97316', sortOrder: 3, isActive: true },
      { orgId: org.id, name: 'Testing / QA', code: 'QA', type: 'billable', isBillable: true, color: '#10B981', sortOrder: 4, isActive: true },
      { orgId: org.id, name: 'Documentation', code: 'DOC', type: 'general', isBillable: false, color: '#EAB308', sortOrder: 5, isActive: true },
      { orgId: org.id, name: 'Admin', code: 'ADM', type: 'internal', isBillable: false, color: '#6B7280', sortOrder: 6, isActive: true },
    ]).returning();
    // per-employee project rotation (insert order, not alphabetical)
    const assignProjOrder = ['APOLLO', 'ORION', 'HELIOS', 'INTOOL', 'ZEPHYR'];
    const empProject = (i: number) => projByCode(assignProjOrder[i % 5]);
    await db.insert(projectAssignments).values(
      empUsers.map((u, i) => ({
        orgId: org.id, projectId: empProject(i).id, employeeId: u.id,
        role: i % 5 === 0 ? 'Tech Lead' : 'Contributor', allocationPercentage: '100',
        startDate: fmt(anchorPlusDays(-60)), isBillable: true, isActive: true,
      })),
    );
    console.log('  ✓ Projects: 5, task categories: 6, project assignments: 20');

    // ── Link timesheet entries to projects + categories (deterministic) ───────
    // project = employee's assigned project; category index = (empIdx + dayOfMonth) % 6
    {
      const allTimesheets = await db
        .select({ id: timesheetEntries.id, employeeId: timesheetEntries.employeeId, date: timesheetEntries.date })
        .from(timesheetEntries)
        .where(eq(timesheetEntries.orgId, org.id));
      const empIdxById = new Map(empUsers.map((u, i) => [u.id, i]));
      for (const te of allTimesheets) {
        const i = empIdxById.get(te.employeeId);
        if (i === undefined) continue;
        const dom = new Date(`${te.date}T00:00:00.000Z`).getUTCDate();
        const cat = taskCategoryRows[(i + dom) % 6];
        await db
          .update(timesheetEntries)
          .set({ projectId: empProject(i).id, taskCategoryId: cat.id })
          .where(eq(timesheetEntries.id, te.id));
      }
    }
    console.log('  ✓ Timesheet entries linked to projects + categories');

    // ── Timesheet Policy (1) ──────────────────────────────────────────────────
    await db.insert(timesheetPolicies).values({
      orgId: org.id, name: 'Default Timesheet Policy', submissionFrequency: 'weekly',
      submissionDeadline: 'end_of_week', minHoursPerDay: '8', maxHoursPerDay: '12',
      minHoursPerWeek: '40', maxHoursPerWeek: '60', roundingRule: 'none', roundingInterval: 15,
      lockAfterApproval: true, gracePeriodDays: 2, dailyMandatory: false, requireDescription: false,
      autoApprovalEnabled: true, autoApprovalRules: ['Total weekly hours between 38 and 45', 'No future-dated entries'],
      escalationEnabled: true, escalationHours: 48,
      approvalLevels: [
        { id: 'lvl-1', level: 1, isRequired: true, approverRole: '', approverType: 'direct_manager' },
        { id: 'lvl-2', level: 2, isRequired: false, approverRole: '', approverType: 'department_head' },
      ],
      delegationRules: [{ id: 'del-1', toRole: 'team_lead', fromRole: 'manager', condition: 'on_leave' }],
      metadata: {}, isDefault: true, isActive: true,
    });
    console.log('  ✓ Timesheet policy: 1');

    // ── Timesheet Submissions (2) ─────────────────────────────────────────────
    await db.insert(timesheetSubmissions).values([
      { orgId: org.id, employeeId: empUsers[0].id, periodStart: fmt(anchorPlusDays(-7)), periodEnd: fmt(anchorPlusDays(-1)), totalHours: '40', billableHours: '36', nonBillableHours: '4', status: 'rejected', summaryNote: 'Weekly timesheet', approvalChain: [], currentApproverLevel: 1, submittedAt: anchorPlusDays(-1), dayBreakdown: [], metadata: { disputeReason: 'Employee contests rejected overtime hours', disputeStatus: 'open' } },
      { orgId: org.id, employeeId: empUsers[1].id, periodStart: fmt(anchorPlusDays(-14)), periodEnd: fmt(anchorPlusDays(-8)), totalHours: '40', billableHours: '36', nonBillableHours: '4', status: 'rejected', summaryNote: 'Weekly timesheet', approvalChain: [], currentApproverLevel: 1, submittedAt: anchorPlusDays(-8), dayBreakdown: [], metadata: { disputeReason: 'Employee disputes project code requirement', disputeStatus: 'open' } },
    ]);
    console.log('  ✓ Timesheet submissions: 2');

    // ── Salary Components (7) ─────────────────────────────────────────────────
    await db.insert(salaryComponents).values([
      { orgId: org.id, name: 'Basic', type: 'earning', category: 'basic', calculationType: 'percentage', calculationValue: '50', isStatutory: false, isTaxable: true, sortOrder: 1, isActive: true },
      { orgId: org.id, name: 'House Rent Allowance', type: 'earning', category: 'hra', calculationType: 'percentage', calculationValue: '40', percentageOf: 'basic', isStatutory: false, isTaxable: true, sortOrder: 2, isActive: true },
      { orgId: org.id, name: 'Dearness Allowance', type: 'earning', category: 'da', calculationType: 'percentage', calculationValue: '10', percentageOf: 'basic', isStatutory: false, isTaxable: true, sortOrder: 3, isActive: true },
      { orgId: org.id, name: 'Special Allowance', type: 'earning', category: 'special_allowance', calculationType: 'percentage', calculationValue: '15', percentageOf: 'basic', isStatutory: false, isTaxable: true, sortOrder: 4, isActive: true },
      { orgId: org.id, name: 'Provident Fund', type: 'deduction', category: 'statutory', calculationType: 'percentage', calculationValue: '12', percentageOf: 'basic', isStatutory: true, isTaxable: false, sortOrder: 5, isActive: true },
      { orgId: org.id, name: 'Professional Tax', type: 'deduction', category: 'tax', calculationType: 'fixed', calculationValue: '200', isStatutory: true, isTaxable: false, sortOrder: 6, isActive: true },
      { orgId: org.id, name: 'Income Tax (TDS)', type: 'deduction', category: 'tax', calculationType: 'percentage', calculationValue: '10', percentageOf: 'gross', isStatutory: true, isTaxable: false, sortOrder: 7, isActive: true },
    ]);
    console.log('  ✓ Salary components: 7');

    // ── Payroll Config (1) ────────────────────────────────────────────────────
    await db.insert(payrollConfigs).values({
      orgId: org.id, payrollCycleDay: 1, paymentDay: 28, taxRegime: 'new',
      pfEnabled: true, pfEmployerRate: '12', pfEmployeeRate: '12',
      esiEnabled: false, esiEmployerRate: '3.25', esiEmployeeRate: '0.75',
      ptEnabled: true, lwfEnabled: false, autoProcessEnabled: false, approvalRequired: true, isActive: true,
    });
    console.log('  ✓ Payroll config: 1');

    // ── Statutory Filings (7) ─────────────────────────────────────────────────
    await db.insert(statutoryFilings).values([
      { orgId: org.id, type: 'pf', period: '2026-02', dueDate: new Date('2026-03-15T00:00:00Z'), status: 'filed', amount: '102000', challanNumber: 'EPF-2026-02-ACME', filedAt: new Date('2026-03-10T00:00:00Z'), filedBy: adminUser.id, remarks: 'EPF ECR filed for Feb 2026', isActive: true },
      { orgId: org.id, type: 'esi', period: '2026-02', dueDate: new Date('2026-03-15T00:00:00Z'), status: 'filed', amount: '0', challanNumber: 'ESI-2026-02-ACME', filedAt: new Date('2026-03-12T00:00:00Z'), filedBy: adminUser.id, remarks: 'ESI nil return', isActive: true },
      { orgId: org.id, type: 'pt', period: '2026-02', dueDate: new Date('2026-03-20T00:00:00Z'), status: 'filed', amount: '4000', challanNumber: 'PT-2026-02-KA', filedAt: new Date('2026-03-18T00:00:00Z'), filedBy: adminUser.id, remarks: 'Karnataka PT remitted', isActive: true },
      { orgId: org.id, type: 'tds', period: '2025-26', dueDate: new Date('2026-05-31T00:00:00Z'), status: 'filed', amount: '420750', challanNumber: 'TDS-24Q-Q4-2526', filedAt: new Date('2026-05-28T00:00:00Z'), filedBy: adminUser.id, remarks: 'Form 24Q Q4 FY2025-26', isActive: true },
      { orgId: org.id, type: 'tds', period: '2026-05', dueDate: new Date('2026-06-07T00:00:00Z'), status: 'pending', amount: '150000', remarks: 'Monthly TDS deposit (overdue)', isActive: true },
      { orgId: org.id, type: 'pf', period: '2026-05', dueDate: new Date('2026-06-15T00:00:00Z'), status: 'pending', amount: '102000', remarks: 'EPF ECR due for May 2026', isActive: true },
      { orgId: org.id, type: 'pt', period: '2026-05', dueDate: new Date('2026-06-20T00:00:00Z'), status: 'pending', amount: '4000', remarks: 'Karnataka PT due for May 2026', isActive: true },
    ]);
    console.log('  ✓ Statutory filings: 7');

    // ── Pay Slips (80) — 20 employees × Feb–May 2026 ──────────────────────────
    const paySlipMonths = [2, 3, 4, 5];
    const paySlipInserts = empUsers.flatMap((u, i) => {
      const basic = empBasic(i);
      const hra = Math.round(basic * 0.4);
      const da = Math.round(basic * 0.1);
      const special = Math.round(basic * 0.15);
      const gross = basic + hra + da + special;
      const pf = Math.round(basic * 0.12);
      const pt = 200;
      const incomeTax = Math.round(gross * 0.1);
      const totalDed = pf + pt + incomeTax;
      return paySlipMonths.map((m) => ({
        orgId: org.id, employeeId: u.id, month: m, year: 2026,
        basicSalary: String(basic), hra: String(hra), da: String(da), specialAllowance: String(special),
        otherEarnings: '0', grossEarnings: String(gross), pfDeduction: String(pf), esiDeduction: '0',
        ptDeduction: String(pt), incomeTax: String(incomeTax), otherDeductions: '0',
        totalDeductions: String(totalDed), netPay: String(gross - totalDed), status: 'published',
        generatedAt: new Date(`2026-${String(m).padStart(2, '0')}-28T16:00:00Z`), isActive: true,
      }));
    });
    await db.insert(paySlips).values(paySlipInserts);
    console.log(`  ✓ Pay slips: ${paySlipInserts.length}`);

    // ── Investment Declarations (12) ──────────────────────────────────────────
    const investmentInserts = Array.from({ length: 12 }, (_, i) => {
      const isOld = i % 2 === 0;
      const ppf = 50000 + i * 5000;
      const selfPremium = [18000, 21000, 24000][i % 3];
      const nps = isOld ? 50000 : 0;
      const total = ppf + 50000 + 24000 + selfPremium + nps;
      const status = i < 4 ? 'submitted' : i < 8 ? 'verified' : 'draft';
      return {
        orgId: org.id, employeeId: empUsers[i].id, fiscalYear: '2025-26',
        taxRegime: isOld ? 'old' : 'new',
        section80c: { ppf, elss: 50000, lifeInsurance: 24000 },
        section80d: { selfPremium },
        hraExemption: { cityType: 'metro', rentPaid: 120000 + i * 6000, monthsResiding: 12 },
        otherDeductions: { nps80ccd: nps },
        totalDeclared: String(total), totalVerified: '0', status,
        submittedAt: status === 'draft' ? null : new Date('2026-04-15T00:00:00Z'),
        verifiedBy: status === 'verified' ? adminUser.id : null, isActive: true,
      };
    });
    await db.insert(investmentDeclarations).values(investmentInserts);
    console.log('  ✓ Investment declarations: 12');

    // ── Review Cycle (1) + Review Assignments (10) ────────────────────────────
    const [reviewCycle] = await db.insert(reviewCycles).values({
      orgId: org.id, name: 'Annual Review FY2025-26', description: 'Year-end performance review cycle for FY2025-26.',
      type: 'annual', reviewTypes: ['self', 'manager'], ratingScaleType: '1-5', ratingScaleConfig: {},
      componentWeightage: {}, startDate: fmt(anchorPlusDays(-45)), endDate: fmt(anchorPlusDays(15)),
      status: 'active', autoNotifications: true, notificationConfig: {}, createdBy: adminUser.id,
      metadata: {}, isActive: true,
    }).returning();
    const fullAchievements = ['Delivered key project on time', 'Mentored a junior teammate'];
    const fullImprovement = ['Stakeholder communication'];
    const selfComment = 'Met most of my goals this cycle and grew in key areas.';
    const mgrComment = 'Solid, dependable contributor; keep stretching on ownership.';
    const reviewSeed = [
      { empIdx: 0, status: 'submitted', self: '4.00', mgr: '4.00', final: '4.00' },
      { empIdx: 1, status: 'submitted', self: '5.00', mgr: '5.00', final: '5.00' },
      { empIdx: 2, status: 'submitted', self: '3.00', mgr: '3.00', final: '3.00' },
      { empIdx: 3, status: 'submitted', self: '4.00', mgr: '3.00', final: '3.00' },
      { empIdx: 4, status: 'submitted', self: '2.00', mgr: '2.00', final: '2.00' },
      { empIdx: 5, status: 'self_review_submitted', self: '4.00', mgr: null, final: null },
      { empIdx: 6, status: 'pending', self: null, mgr: null, final: null },
      { empIdx: 8, status: 'submitted', self: '4.00', mgr: '4.00', final: '4.00' },
      { empIdx: 9, status: 'submitted', self: '3.00', mgr: '4.00', final: '4.00' },
      { empIdx: 12, status: 'submitted', self: '3.00', mgr: '3.00', final: '3.00' },
    ];
    await db.insert(reviewAssignments).values(
      reviewSeed.map((r) => {
        const submitted = r.status === 'submitted';
        const selfDone = submitted || r.status === 'self_review_submitted';
        return {
          orgId: org.id, cycleId: reviewCycle.id, employeeId: empUsers[r.empIdx].id,
          reviewerId: managerUser.id, reviewerType: 'manager', status: r.status,
          selfRating: r.self, managerRating: r.mgr, finalRating: r.final,
          selfComments: selfDone ? selfComment : null,
          managerComments: submitted ? mgrComment : null,
          achievements: submitted ? fullAchievements : [],
          improvementAreas: submitted ? fullImprovement : [],
          competencyRatings: {}, isActive: true,
        };
      }),
    );
    console.log('  ✓ Review cycle: 1, review assignments: 10');

    // ── Goals (10) ────────────────────────────────────────────────────────────
    const goalSeed = [
      { empIdx: 0, title: 'Ship v2 of the billing API', category: 'business', status: 'on_track', progress: '65.00', due: 40 },
      { empIdx: 0, title: 'Improve unit-test coverage to 80%', category: 'technical', status: 'at_risk', progress: '45.00', due: 25 },
      { empIdx: 0, title: 'Complete Advanced TypeScript course', category: 'professional', status: 'completed', progress: '100.00', due: -10 },
      { empIdx: 1, title: 'Lead the search re-architecture', category: 'technical', status: 'on_track', progress: '70.00', due: 50 },
      { empIdx: 2, title: 'Reduce p95 latency by 20%', category: 'business', status: 'on_track', progress: '55.00', due: 30 },
      { empIdx: 3, title: 'Onboard two new engineers', category: 'leadership', status: 'completed', progress: '100.00', due: -5 },
      { empIdx: 4, title: 'Close 15 enterprise deals', category: 'business', status: 'at_risk', progress: '40.00', due: 35 },
      { empIdx: 8, title: 'Grow regional pipeline by 30%', category: 'business', status: 'on_track', progress: '60.00', due: 45 },
      { empIdx: 9, title: 'Launch partner referral program', category: 'business', status: 'on_track', progress: '50.00', due: 60 },
      { empIdx: 12, title: 'Roll out new onboarding checklist', category: 'operational', status: 'completed', progress: '100.00', due: -15 },
    ];
    await db.insert(goals).values(
      goalSeed.map((g) => ({
        orgId: org.id, employeeId: empUsers[g.empIdx].id, title: g.title,
        description: `${g.title} — tracked for the FY2025-26 cycle.`, category: g.category,
        framework: 'okr', weightage: '100', currentValue: '0', priority: 'medium',
        startDate: fmt(anchorPlusDays(-60)), dueDate: fmt(anchorPlusDays(g.due)), status: g.status,
        progress: g.progress, createdBy: managerUser.id, isTemplate: false, successMetrics: [], isActive: true,
      })),
    );
    console.log('  ✓ Goals: 10');

    // ── Competency Frameworks (6) ─────────────────────────────────────────────
    const proficiencyLevels = [
      { name: 'Beginner', description: 'Developing foundational skills.', behavioralIndicators: 'Needs guidance.' },
      { name: 'Intermediate', description: 'Applies skills independently.', behavioralIndicators: 'Works without supervision.' },
      { name: 'Advanced', description: 'Coaches others and sets standards.', behavioralIndicators: 'Recognized expert.' },
    ];
    await db.insert(competencyFrameworks).values([
      { name: 'Communication', description: 'Clear written and verbal communication.', category: 'core' },
      { name: 'Customer Focus', description: 'Puts the customer at the center of decisions.', category: 'functional' },
      { name: 'Leadership', description: 'Inspires, aligns, and develops others.', category: 'leadership' },
      { name: 'Ownership & Accountability', description: 'Takes end-to-end responsibility for outcomes.', category: 'behavioral' },
      { name: 'Problem Solving', description: 'Analyzes and resolves complex problems.', category: 'core' },
      { name: 'Technical Excellence', description: 'Depth of craft and engineering rigor.', category: 'technical' },
    ].map((c) => ({
      orgId: org.id, name: c.name, description: c.description, category: c.category,
      proficiencyLevels, departmentIds: [], gradeIds: [], roleMapping: {}, isDefault: false,
      status: 'active', createdBy: adminUser.id, metadata: {}, isActive: true,
    })));
    console.log('  ✓ Competency frameworks: 6');

    // ── Development Plans (5) ──────────────────────────────────────────────────
    const devPlanSeed = [
      { empIdx: 0, title: 'IDP — Path to Senior Engineer', targetRole: 'Senior Software Engineer', skills: ['System Design', 'Mentoring'], progress: '55.00' },
      { empIdx: 1, title: 'IDP — Technical Leadership', targetRole: 'Engineering Manager', skills: ['People Management', 'Architecture'], progress: '40.00' },
      { empIdx: 2, title: 'IDP — Backend Mastery', targetRole: 'Senior Software Engineer', skills: ['Distributed Systems'], progress: '35.00' },
      { empIdx: 8, title: 'IDP — Sales Leadership', targetRole: 'Senior Sales Executive', skills: ['Negotiation', 'Forecasting'], progress: '50.00' },
      { empIdx: 12, title: 'IDP — HR Business Partner', targetRole: 'HR Manager', skills: ['Employee Relations'], progress: '45.00' },
    ];
    await db.insert(developmentPlans).values(
      devPlanSeed.map((d) => ({
        orgId: org.id, employeeId: empUsers[d.empIdx].id, title: d.title,
        description: `Individual development plan targeting ${d.targetRole}.`, type: 'idp',
        activities: [
          { type: 'training', title: 'Complete relevant training', status: 'in_progress' },
          { type: 'mentoring', title: 'Shadow a senior team member', status: 'pending' },
        ],
        skills: d.skills, certifications: [],
        careerAspiration: `Grow into a ${d.targetRole} role over the next 12–18 months.`,
        targetRole: d.targetRole, status: 'active', progress: d.progress,
        startDate: fmt(anchorPlusDays(-30)), targetDate: fmt(anchorPlusDays(180)),
        mentorId: managerUser.id, createdBy: managerUser.id, isActive: true,
      })),
    );
    console.log('  ✓ Development plans: 5');

    // ── One-on-One Meetings (5) ───────────────────────────────────────────────
    const oneOnOneAgenda = ['Progress on goals', 'Blockers', 'Career & growth'];
    await db.insert(oneOnOneMeetings).values([
      { orgId: org.id, managerId: managerUser.id, employeeId: empUsers[0].id, scheduledAt: anchorPlusDays(-7), duration: 30, isRecurring: true, recurrencePattern: 'weekly', agenda: oneOnOneAgenda, notes: 'Discussed goal progress; on track overall.', actionItems: [{ title: 'Share design doc by Friday', status: 'open' }], status: 'completed', completedAt: anchorPlusDays(-7) },
      { orgId: org.id, managerId: managerUser.id, employeeId: empUsers[1].id, scheduledAt: anchorPlusDays(-3), duration: 30, isRecurring: true, recurrencePattern: 'weekly', agenda: oneOnOneAgenda, notes: 'Discussed goal progress; on track overall.', actionItems: [{ title: 'Share design doc by Friday', status: 'open' }], status: 'completed', completedAt: anchorPlusDays(-3) },
      { orgId: org.id, managerId: managerUser.id, employeeId: empUsers[2].id, scheduledAt: anchorPlusDays(5), duration: 30, isRecurring: true, recurrencePattern: 'weekly', agenda: oneOnOneAgenda, actionItems: [], status: 'scheduled' },
      { orgId: org.id, managerId: managerUser.id, employeeId: empUsers[0].id, scheduledAt: anchorPlusDays(7), duration: 30, isRecurring: true, recurrencePattern: 'weekly', agenda: oneOnOneAgenda, actionItems: [], status: 'scheduled' },
      { orgId: org.id, managerId: managerUser.id, employeeId: empUsers[8].id, scheduledAt: anchorPlusDays(10), duration: 30, isRecurring: true, recurrencePattern: 'weekly', agenda: oneOnOneAgenda, actionItems: [], status: 'scheduled' },
    ]);
    console.log('  ✓ One-on-one meetings: 5');

    // ── Employee Onboarding (1) + Tasks (9) ───────────────────────────────────
    const [emp01Onboarding] = await db.insert(employeeOnboardings).values({
      orgId: org.id, employeeId: empUsers[0].id, status: 'in_progress',
      startDate: fmt(anchorPlusDays(-5)), targetCompletionDate: fmt(anchorPlusDays(25)),
      progressPercentage: '44.00', buddyId: empUsers[1].id,
      firstDayInfo: { desk: 'D-312', wifi: 'ACME-CORP / guest pass at reception', floor: '3rd', parking: 'Level B1, Slot 47', section: 'Engineering Pod B', building: 'Bengaluru HQ', facilities: ['Cafeteria (G floor)', 'Gym (Level 2)', 'Wellness room (3rd)'] },
      probationEndDate: fmt(anchorPlusDays(175)), probationStatus: 'pending',
      totalTasks: 9, completedTasks: 4, initiatedBy: managerUser.id,
      orientationSchedule: [
        { type: 'orientation', title: 'Company Overview & Culture', status: 'completed', duration: '90 min', location: 'Bengaluru HQ — Auditorium', presenter: 'Sarah Mehta', description: 'Welcome session with leadership', scheduledAt: fmt(anchorPlusDays(-3)) },
        { type: 'training', title: 'IT Setup & Security Training', status: 'completed', duration: '60 min', location: 'Online', presenter: 'IT Helpdesk', description: 'Accounts, VPN, security policies', scheduledAt: fmt(anchorPlusDays(-2)) },
        { type: 'training', title: 'Product Deep Dive', status: 'scheduled', duration: '120 min', location: 'Bengaluru HQ — Room 4', presenter: 'Product Team', description: 'Walkthrough of core product modules', scheduledAt: fmt(anchorPlusDays(2)) },
      ],
      checkinSchedule: [
        { status: 'upcoming', dayMark: '30-Day Check-In', managerNotes: null, scheduledDate: fmt(anchorPlusDays(27)), feedbackSubmitted: false },
        { status: 'upcoming', dayMark: '60-Day Check-In', managerNotes: null, scheduledDate: fmt(anchorPlusDays(57)), feedbackSubmitted: false },
        { status: 'upcoming', dayMark: '90-Day Check-In', managerNotes: null, scheduledDate: fmt(anchorPlusDays(87)), feedbackSubmitted: false },
      ],
      isActive: true,
    }).returning();
    const onboardingTaskSeed = [
      { title: 'Upload Educational Certificates', description: 'Degree & latest mark sheet', taskType: 'document_upload', status: 'completed', due: -4, verification: 'verified' },
      { title: 'Upload Government ID (Aadhaar/PAN)', description: 'Identity proof for HR records', taskType: 'document_upload', status: 'completed', due: -4, verification: 'verified' },
      { title: 'Acknowledge Code of Conduct', description: 'Read and accept the company code of conduct', taskType: 'policy_acknowledgement', status: 'completed', due: -3, verification: null },
      { title: 'Set Up Direct Deposit', description: 'Submit bank details for payroll', taskType: 'general', status: 'completed', due: -2, verification: null },
      { title: 'Complete Security Awareness Training', description: 'Mandatory e-learning module', taskType: 'training', status: 'completed', due: -1, verification: null },
      { title: 'Acknowledge IT & Security Policy', description: 'Read and accept the acceptable-use policy', taskType: 'policy_acknowledgement', status: 'pending', due: 2, verification: null },
      { title: 'Upload Previous Employment Letter', description: 'Relieving / experience letter', taskType: 'document_upload', status: 'pending', due: 3, verification: null },
      { title: 'Complete Data Privacy (GDPR) Training', description: 'Privacy fundamentals e-learning', taskType: 'training', status: 'in_progress', due: 4, verification: null },
      { title: 'Complete Product 101 Training', description: 'Intro to the ACME product suite', taskType: 'training', status: 'pending', due: 6, verification: null },
    ];
    await db.insert(employeeOnboardingTasks).values(
      onboardingTaskSeed.map((t) => ({
        orgId: org.id, onboardingId: emp01Onboarding.id, employeeId: empUsers[0].id,
        title: t.title, description: t.description, taskType: t.taskType, taskOwner: 'employee',
        status: t.status, dueDate: fmt(anchorPlusDays(t.due)),
        completedAt: t.status === 'completed' ? anchorPlusDays(-1) : null,
        verificationStatus: t.verification, isActive: true,
      })),
    );
    console.log('  ✓ Employee onboarding: 1, onboarding tasks: 9');

    // ── Employee Offboardings (2) ─────────────────────────────────────────────
    const offboardingRows = await db.insert(employeeOffboardings).values([
      { orgId: org.id, employeeId: empUsers[18].id, exitType: 'resignation', exitReason: 'Career growth opportunity elsewhere', resignationDate: fmt(anchorPlusDays(-10)), lastWorkingDate: fmt(anchorPlusDays(20)), noticePeriodDays: 30, clearanceStatus: {}, assetReturnStatus: [], settlementStatus: 'pending', settlementEstimate: {}, handoverStatus: 'in_progress', status: 'in_progress', initiatedBy: managerUser.id, isActive: true },
      { orgId: org.id, employeeId: empUsers[19].id, exitType: 'resignation', exitReason: 'Relocating to another city', resignationDate: fmt(anchorPlusDays(-5)), lastWorkingDate: fmt(anchorPlusDays(25)), noticePeriodDays: 30, clearanceStatus: {}, assetReturnStatus: [], settlementStatus: 'pending', settlementEstimate: {}, handoverStatus: 'pending', status: 'initiated', initiatedBy: managerUser.id, isActive: true },
    ]).returning();
    console.log('  ✓ Employee offboardings: 2');

    // ── Exit Interviews (1) ───────────────────────────────────────────────────
    await db.insert(exitInterviews).values({
      orgId: org.id, employeeId: empUsers[18].id, offboardingId: offboardingRows[0].id,
      interviewerId: managerUser.id, scheduledAt: anchorPlusDays(12),
      questionnaire: ['What prompted your decision to leave?', 'How was your overall experience?', 'Would you recommend us as an employer?'],
      responses: {}, themes: [], exitReasons: [], status: 'scheduled', metadata: {}, isActive: true,
    });
    console.log('  ✓ Exit interviews: 1');

    // ── Knowledge Transfers (1) ───────────────────────────────────────────────
    await db.insert(knowledgeTransfers).values({
      orgId: org.id, employeeId: empUsers[0].id, assignedTo: empUsers[1].id,
      title: 'Onboarding Knowledge Handover', description: 'Handover of ongoing responsibilities and access.',
      items: [
        { id: '11111111-1111-4111-8111-111111111111', title: 'Document current sprint board status', status: 'pending', addedAt: fmt(anchorPlusDays(-2)), priority: 'high', description: 'Summary of in-flight tickets and owners' },
        { id: '22222222-2222-4222-8222-222222222222', title: 'Share API integration runbook', status: 'pending', addedAt: fmt(anchorPlusDays(-2)), priority: 'critical', description: 'Steps + secrets location for the billing integration' },
        { id: '33333333-3333-4333-8333-333333333333', title: 'Walkthrough of deployment pipeline', status: 'pending', addedAt: fmt(anchorPlusDays(-1)), priority: 'medium', description: 'CI/CD stages and on-call rota' },
      ],
      documentLinks: [],
      handoverDocument: { credentials: 'Jira board: PROJ — admin via SSO\nGrafana: read-only, request via #it-help\nShared mailbox: support@acme.com (1Password vault: Support)' },
      pendingItems: [], accessCredentials: [], status: 'draft', dueDate: fmt(anchorPlusDays(15)),
      metadata: {}, isActive: true,
    });
    console.log('  ✓ Knowledge transfers: 1');

    // ── Done ─────────────────────────────────────────────────────────────────
    console.log('\n✅ Seed complete!\n');
    console.log('  Credentials:');
    console.log('    admin@acme.com     / Admin@123    (super_admin)');
    console.log('    manager@acme.com   / Manager@123  (manager)');
    console.log('    emp01@acme.com ... emp20@acme.com / Employee@123  (employee)');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
