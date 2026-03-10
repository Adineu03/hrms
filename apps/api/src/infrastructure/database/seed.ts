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

/** Return ISO date string YYYY-MM-DD from a Date */
function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Collect weekdays in the last N calendar days (today = 2026-03-10) */
function weekdaysInLastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date('2026-03-10');
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
    // ── Idempotency check ────────────────────────────────────────────────────
    const [existing] = await db
      .select({ id: orgs.id })
      .from(orgs)
      .where(eq(orgs.slug, DEMO_ORG_SLUG))
      .limit(1);

    if (existing) {
      console.log(`✓ Org "${DEMO_ORG_SLUG}" already seeded — nothing to do.`);
      return;
    }

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
    const now = new Date();
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
        const r = Math.random();
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

    // ── 12. Leave Requests (5 pending + 10 approved) ─────────────────────────
    const allLeaveTypes = [ltCasual, ltSick, ltEarned];

    const pendingLeaveInserts = Array.from({ length: 5 }, (_, i) => ({
      orgId: org.id,
      employeeId: empUsers[i].id,
      leaveTypeId: allLeaveTypes[i % 3].id,
      fromDate: '2026-03-12',
      toDate: '2026-03-13',
      totalDays: '2',
      reason: faker.lorem.sentence(),
      status: 'pending',
    }));

    const approvedLeaveInserts = Array.from({ length: 10 }, (_, i) => {
      const day = faker.number.int({ min: 3, max: 20 });
      const dayStr = String(day).padStart(2, '0');
      const dayEndStr = String(day + 1).padStart(2, '0');
      return {
        orgId: org.id,
        employeeId: empUsers[i + 5].id,
        leaveTypeId: allLeaveTypes[i % 3].id,
        fromDate: `2026-02-${dayStr}`,
        toDate: `2026-02-${dayEndStr}`,
        totalDays: '2',
        reason: faker.lorem.sentence(),
        status: 'approved',
        approvedBy: managerUser.id,
        approvedAt: new Date('2026-02-05T10:00:00Z'),
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
