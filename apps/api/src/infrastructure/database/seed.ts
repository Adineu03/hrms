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
import { and, eq } from 'drizzle-orm';
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
  leaveDelegations,
  feedbackRecords,
  attendanceRegularizations,
  shiftSwapRequests,
  reimbursementClaims,
  policyViolations,
  auditEvidence,
  onboardingWorkflows,
  onboardingWorkflowTasks,
  offboardingWorkflows,
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
  // Sprint 4 (Demo-Readiness) — Learning, Compensation, Expense gap tables
  courses,
  courseEnrollments,
  learningPaths,
  learningPathItems,
  certifications,
  learningBudgets,
  trainingSessions,
  recognitionPrograms,
  recognitionNominations,
  recognitionPoints,
  recognitionPointTransactions,
  compensationRevisions,
  compensationRevisionItems,
  expensePolicies,
  // Sprint 5 (Demo-Readiness) — Engagement & Culture gap tables
  surveys,
  surveyResponses,
  cultureValues,
  wellnessPrograms,
  wellnessParticipations,
  socialPosts,
  socialGroups,
  engagementScores,
  // Sprint 5 (Demo-Readiness) — Workforce Planning gap tables
  workforceHeadcountPlans,
  workforceBudgets,
  successionPlans,
  successionCandidates,
  internalTransferRequests,
  roleGradeDefinitions,
  // Sprint 5 (Demo-Readiness) — Compliance & Audit gap tables
  compliancePolicies,
  policyAcknowledgments,
  complianceTrainings,
  trainingCompletions,
  ethicsComplaints,
  auditTrailConfigs,
  complianceChecklists,
  // Sprint 6 (Demo-Readiness) — People Analytics gap tables
  analyticsKpis,
  analyticsReports,
  analyticsSnapshots,
  // Sprint 6 (Demo-Readiness) — Demo Company gap tables
  demoOrgs,
  demoTours,
  demoSessions,
  // Sprint 6 (Demo-Readiness) — Platform & Experience gap tables
  notificationTemplates,
  notifications,
  customDashboards,
  dashboardWidgets,
  bookmarks,
  // Sprint 6 (Demo-Readiness) — Integrations & API gap tables
  integrationConnectors,
  integrationLogs,
  apiKeys,
  webhooks,
  oauthApps,
  dataSyncConfigs,
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

    // Two more managers for a believable 2-level org chart.
    // NOTE: fixed literals only — a faker call here would shift the seeded
    // faker stream and change every downstream generated value.
    const [salesManagerUser] = await db
      .insert(users)
      .values({
        orgId: org.id,
        email: 'manager2@acme.com',
        passwordHash: managerHash,
        role: 'manager',
        firstName: 'Vikram',
        lastName: 'Rao',
        isActive: true,
      })
      .returning();

    const [opsManagerUser] = await db
      .insert(users)
      .values({
        orgId: org.id,
        email: 'manager3@acme.com',
        passwordHash: managerHash,
        role: 'manager',
        firstName: 'Meera',
        lastName: 'Joshi',
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

    // Reporting hierarchy (0-based empUsers index):
    //   emp01–08 → Sarah Mehta (Engineering) | emp09–12 → Vikram Rao (Sales)
    //   emp13–20 → Meera Joshi (HR + Finance)
    const managerForIdx = (i: number) =>
      i < 8 ? managerUser.id : i < 12 ? salesManagerUser.id : opsManagerUser.id;

    console.log(
      `  ✓ Users:   admin@acme.com, manager@acme.com, manager2@acme.com, manager3@acme.com, emp01–emp20@acme.com`,
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
        { orgId: org.id, name: 'Engineering', headId: managerUser.id },
        { orgId: org.id, name: 'Sales', headId: salesManagerUser.id },
        { orgId: org.id, name: 'Human Resources', headId: opsManagerUser.id },
        { orgId: org.id, name: 'Finance', headId: opsManagerUser.id },
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
    // emp01–08 → Engineering (mgr: Sarah) | emp09–12 → Sales (mgr: Vikram)
    // emp13–16 → HR (mgr: Meera) | emp17–20 → Finance (mgr: Meera)
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
        managerId: managerForIdx(i),
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
        approvedBy: managerForIdx(i + 5),
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

    // Reports map index→emp01–10; keep all 3 'submitted' inside emp01–08 so
    // Sarah's expense-approval queue stays populated (emp09/10 are Vikram's).
    const expenseStatusList = [
      'draft', 'submitted', 'approved',
      'draft', 'submitted', 'approved',
      'approved', 'submitted', 'draft', 'approved',
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

    // ── Expense Policies (4) — org-wide rules (expense-management) ────────────
    await db.insert(expensePolicies).values([
      { orgId: org.id, name: 'Travel Expense Policy', categoryId: expCatRows[0].id, maxAmountPerClaim: '25000.00', maxAmountPerMonth: '60000.00', requiresReceipt: true, receiptMinAmount: '500.00', perDiemRate: '2000.00', approvalLevels: 2, description: 'Covers flights, cabs, trains and lodging for business travel.', isActive: true },
      { orgId: org.id, name: 'Meals & Entertainment Policy', categoryId: expCatRows[1].id, maxAmountPerClaim: '5000.00', maxAmountPerMonth: '15000.00', requiresReceipt: true, receiptMinAmount: '250.00', perDiemRate: null, approvalLevels: 1, description: 'Client meals and team events. Itemised bill required above the receipt threshold.', isActive: true },
      { orgId: org.id, name: 'Office Supplies Policy', categoryId: expCatRows[2].id, maxAmountPerClaim: '10000.00', maxAmountPerMonth: '20000.00', requiresReceipt: true, receiptMinAmount: '0.00', perDiemRate: null, approvalLevels: 1, description: 'Stationery, peripherals and consumables for office use.', isActive: true },
      { orgId: org.id, name: 'Training & Certification Policy', categoryId: expCatRows[3].id, maxAmountPerClaim: '40000.00', maxAmountPerMonth: '40000.00', requiresReceipt: true, receiptMinAmount: '0.00', perDiemRate: null, approvalLevels: 2, description: 'Courses, certifications and conference fees for professional development.', isActive: true },
    ]);
    console.log('  ✓ Expense Policies: 4');

    // ═════════════════════════════════════════════════════════════════════════
    // ADDITIONAL POPULATED TABLES (recovery — reproduce the live demo DB)
    // ═════════════════════════════════════════════════════════════════════════

    // ── Locations (3) ─────────────────────────────────────────────────────────
    const locationRows = await db.insert(locations).values([
      { orgId: org.id, name: 'Bengaluru HQ', code: 'BLR', type: 'office', address: 'Prestige Tech Park, Marathahalli', city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560037', timezone: 'Asia/Kolkata', isPrimary: true, isActive: true },
      { orgId: org.id, name: 'Mumbai Office', code: 'BOM', type: 'office', address: 'Bandra Kurla Complex', city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400051', timezone: 'Asia/Kolkata', isPrimary: false, isActive: true },
      { orgId: org.id, name: 'Remote — India', code: 'REM', type: 'remote', country: 'India', timezone: 'Asia/Kolkata', isPrimary: false, isActive: true },
    ]).returning();
    console.log('  ✓ Locations: 3');

    // ── Grades (5) ────────────────────────────────────────────────────────────
    const gradeRows = await db.insert(grades).values([
      { orgId: org.id, name: 'L1 — Associate', level: 1, salaryBandMin: '300000', salaryBandMax: '600000', currency: 'INR', description: 'Entry level' },
      { orgId: org.id, name: 'L2 — Engineer', level: 2, salaryBandMin: '600000', salaryBandMax: '1200000', currency: 'INR', description: 'Individual contributor' },
      { orgId: org.id, name: 'L3 — Senior Engineer', level: 3, salaryBandMin: '1200000', salaryBandMax: '2000000', currency: 'INR', description: 'Senior IC' },
      { orgId: org.id, name: 'L4 — Manager / Lead', level: 4, salaryBandMin: '2000000', salaryBandMax: '3200000', currency: 'INR', description: 'People / tech lead' },
      { orgId: org.id, name: 'L5 — Director', level: 5, salaryBandMin: '3200000', salaryBandMax: '5000000', currency: 'INR', description: 'Leadership' },
    ]).returning();
    console.log('  ✓ Grades: 5');

    // Backfill grade + location onto the 20 employee profiles (deterministic):
    // grade follows the designation level (L2 IC / L3 senior / L4 manager);
    // location follows the work model (remote Eng → REM), Sales sits in Mumbai.
    const gradeByLevel: Record<number, string> = {
      2: gradeRows[1].id,
      3: gradeRows[2].id,
      4: gradeRows[3].id,
    };
    for (let i = 0; i < empUsers.length; i++) {
      const idx = i + 1; // 1-based, same convention as the profile insert
      const level =
        idx <= 8 ? (idx <= 5 ? 2 : 3)
        : idx <= 12 ? (idx <= 10 ? 2 : 3)
        : idx <= 16 ? 2
        : idx === 20 ? 4
        : 2;
      const locId =
        idx <= 8 ? (idx % 2 === 1 ? locationRows[2].id : locationRows[0].id)
        : idx <= 12 ? locationRows[1].id
        : locationRows[0].id;
      await db
        .update(employeeProfiles)
        .set({ gradeId: gradeByLevel[level], locationId: locId })
        .where(and(eq(employeeProfiles.orgId, org.id), eq(employeeProfiles.userId, empUsers[i].id)));
    }
    console.log('  ✓ Employee profiles: grade + location backfilled');

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

    // ── Compensation Revisions + Recognition (compensation-rewards) ──────────
    const compEmpBasic = (i: number): number => {
      if (i < 5) return 35000;
      if (i < 8) return 60000;
      if (i < 10) return 40000;
      if (i < 12) return 55000;
      if (i < 16) return 30000;
      if (i === 19) return 80000;
      return 35000;
    };
    const ctcOf = (i: number): number => compEmpBasic(i) * 12 * 1.5;

    const [annualRevision] = await db.insert(compensationRevisions).values({
      orgId: org.id, title: 'FY 2026-27 Annual Increment Cycle', type: 'annual', fiscalYear: '2026-27',
      status: 'in_progress', effectiveDate: anchorPlusDays(30), totalBudget: '2500000', allocatedBudget: '1530000', spentBudget: '0',
      meritMatrix: { ratings: [
        { rating: 5, label: 'Outstanding', incrementMin: 12, incrementMax: 18 },
        { rating: 4, label: 'Exceeds', incrementMin: 9, incrementMax: 12 },
        { rating: 3, label: 'Meets', incrementMin: 6, incrementMax: 9 },
        { rating: 2, label: 'Below', incrementMin: 3, incrementMax: 6 },
      ] },
      departments: [], grades: [], createdBy: adminUser.id,
    }).returning();

    await db.insert(compensationRevisionItems).values(empUsers.map((u, i) => {
      const current = ctcOf(i);
      const incrementPct = [6, 9, 12, 15][i % 4];
      const incrementAmount = Math.round((incrementPct / 100) * current);
      const proposed = current + incrementAmount;
      const status = ['proposed', 'proposed', 'approved', 'pending'][i % 4];
      return {
        orgId: org.id, revisionId: annualRevision.id, employeeId: u.id,
        currentCtc: String(current), proposedCtc: String(proposed),
        incrementPercent: String(incrementPct), incrementAmount: String(incrementAmount),
        meritScore: (i % 4) + 2, status, proposedBy: managerForIdx(i),
        approvedBy: status === 'approved' ? adminUser.id : null,
        remarks: status === 'approved' ? 'Strong performer; promotion track.' : 'Pending review.',
      };
    }));

    const [spotProgram, quarterlyProgram, peerProgram] = await db.insert(recognitionPrograms).values([
      { orgId: org.id, name: 'Spot Award', type: 'spot', description: 'On-the-spot recognition for exceptional work.', frequency: 'anytime', pointsValue: 100, budget: '200000', spentBudget: '0', createdBy: adminUser.id },
      { orgId: org.id, name: 'Quarterly Star Performer', type: 'quarterly', description: 'Top performer each quarter.', frequency: 'quarterly', pointsValue: 500, budget: '300000', spentBudget: '0', createdBy: adminUser.id },
      { orgId: org.id, name: 'Peer Appreciation', type: 'peer', description: 'Peer-to-peer kudos for collaboration.', frequency: 'anytime', pointsValue: 50, budget: '100000', spentBudget: '0', createdBy: adminUser.id },
    ]).returning();

    const compProgramByIdx = [spotProgram, quarterlyProgram, peerProgram];
    const compNominationSeed = [
      { nominee: 0, nominator: 1, prog: 0, category: 'Innovation', reason: 'Shipped the billing integration ahead of schedule.', status: 'approved', points: 100 },
      { nominee: 2, nominator: 3, prog: 1, category: 'Excellence', reason: 'Best Q2 sales numbers across the team.', status: 'approved', points: 500 },
      { nominee: 4, nominator: 0, prog: 2, category: 'Teamwork', reason: 'Always available to unblock teammates.', status: 'approved', points: 50 },
      { nominee: 1, nominator: 2, prog: 0, category: 'Customer Focus', reason: 'Resolved a critical customer escalation overnight.', status: 'approved', points: 100 },
      { nominee: 5, nominator: 6, prog: 2, category: 'Leadership', reason: 'Mentored two new joiners through onboarding.', status: 'pending', points: 0 },
      { nominee: 3, nominator: 4, prog: 0, category: 'Innovation', reason: 'Automated the weekly reporting pipeline.', status: 'pending', points: 0 },
      { nominee: 7, nominator: 1, prog: 1, category: 'Excellence', reason: 'Outstanding code quality this quarter.', status: 'pending', points: 0 },
      { nominee: 6, nominator: 5, prog: 2, category: 'Teamwork', reason: 'Coordinated the cross-team release smoothly.', status: 'approved', points: 50 },
    ];
    const compInsertedNominations = await db.insert(recognitionNominations).values(
      compNominationSeed.map((n, idx) => ({
        orgId: org.id, programId: compProgramByIdx[n.prog].id, nomineeId: empUsers[n.nominee].id, nominatorId: empUsers[n.nominator].id,
        category: n.category, reason: n.reason, status: n.status,
        approvedBy: n.status === 'approved' ? managerUser.id : null, pointsAwarded: n.points,
        awardDate: n.status === 'approved' ? anchorPlusDays(-10 + idx) : null,
      })),
    ).returning();

    const compEarnedByEmp = new Map<string, number>();
    compInsertedNominations.forEach((n) => {
      if (n.status === 'approved' && (n.pointsAwarded ?? 0) > 0) {
        compEarnedByEmp.set(n.nomineeId, (compEarnedByEmp.get(n.nomineeId) ?? 0) + (n.pointsAwarded ?? 0));
      }
    });
    for (const [employeeId, earned] of compEarnedByEmp.entries()) {
      const redeemed = employeeId === empUsers[1].id ? 50 : 0;
      const [account] = await db.insert(recognitionPoints).values({
        orgId: org.id, employeeId, totalEarned: earned, totalRedeemed: redeemed, balance: earned - redeemed,
      }).returning();
      const empNoms = compInsertedNominations.filter((n) => n.nomineeId === employeeId && n.status === 'approved' && (n.pointsAwarded ?? 0) > 0);
      for (const n of empNoms) {
        await db.insert(recognitionPointTransactions).values({
          orgId: org.id, employeeId, pointsAccountId: account.id, type: 'earned', points: n.pointsAwarded ?? 0,
          reason: `Recognition: ${n.category}`, nominationId: n.id,
        });
      }
      if (redeemed > 0) {
        await db.insert(recognitionPointTransactions).values({
          orgId: org.id, employeeId, pointsAccountId: account.id, type: 'redeemed', points: redeemed,
          reason: 'Redeemed for: Amazon voucher', redeemedItem: 'Amazon voucher',
        });
      }
    }
    console.log('  ✓ Comp: 1 revision (+20 items), 3 programs, 8 nominations, points/txns');

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
    // Vary actors so the dashboard activity feed reads as real org motion.
    const auditActors = [adminUser, managerUser, salesManagerUser, opsManagerUser, empUsers[0], empUsers[4]];
    const auditLogInserts = Array.from({ length: 24 }, (_, k) => {
      const ae = auditActionEntity[k % 8];
      const actor = auditActors[k % auditActors.length];
      const actorName = `${actor.firstName} ${actor.lastName ?? ''}`.trim();
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
        data: {}, attachments: [], reviewedBy: managerForIdx(s.empIdx), reviewedAt: anchorPlusDays(-3),
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
      { orgId: org.id, requestedBy: salesManagerUser.id, type: 'transfer', employeeId: empUsers[8].id, status: 'approved', currentData: {}, proposedData: { toDepartment: 'Engineering' }, justification: 'Internal mobility request.', approvedBy: adminUser.id, approvedAt: new Date('2026-02-20T10:00:00Z') },
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

    // ── Timesheet Submissions (4: 2 rejected/disputed + 2 pending approval) ──
    await db.insert(timesheetSubmissions).values([
      { orgId: org.id, employeeId: empUsers[0].id, periodStart: fmt(anchorPlusDays(-7)), periodEnd: fmt(anchorPlusDays(-1)), totalHours: '40', billableHours: '36', nonBillableHours: '4', status: 'rejected', summaryNote: 'Weekly timesheet', approvalChain: [], currentApproverLevel: 1, submittedAt: anchorPlusDays(-1), dayBreakdown: [], metadata: { disputeReason: 'Employee contests rejected overtime hours', disputeStatus: 'open' } },
      { orgId: org.id, employeeId: empUsers[1].id, periodStart: fmt(anchorPlusDays(-14)), periodEnd: fmt(anchorPlusDays(-8)), totalHours: '40', billableHours: '36', nonBillableHours: '4', status: 'rejected', summaryNote: 'Weekly timesheet', approvalChain: [], currentApproverLevel: 1, submittedAt: anchorPlusDays(-8), dayBreakdown: [], metadata: { disputeReason: 'Employee disputes project code requirement', disputeStatus: 'open' } },
      // Pending submissions from Sarah's team so her approval queue is populated (#30)
      { orgId: org.id, employeeId: empUsers[2].id, periodStart: fmt(anchorPlusDays(-7)), periodEnd: fmt(anchorPlusDays(-1)), totalHours: '41', billableHours: '37', nonBillableHours: '4', status: 'submitted', summaryNote: 'Weekly timesheet', approvalChain: [], currentApproverLevel: 1, submittedAt: anchorPlusDays(-1), dayBreakdown: [], metadata: {} },
      { orgId: org.id, employeeId: empUsers[4].id, periodStart: fmt(anchorPlusDays(-7)), periodEnd: fmt(anchorPlusDays(-1)), totalHours: '39', billableHours: '35', nonBillableHours: '4', status: 'submitted', summaryNote: 'Weekly timesheet', approvalChain: [], currentApproverLevel: 1, submittedAt: anchorPlusDays(-1), dayBreakdown: [], metadata: {} },
    ]);
    console.log('  ✓ Timesheet submissions: 4 (2 disputed, 2 pending)');

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
          reviewerId: managerForIdx(r.empIdx), reviewerType: 'manager', status: r.status,
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
        progress: g.progress, createdBy: managerForIdx(g.empIdx), isTemplate: false, successMetrics: [], isActive: true,
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
        mentorId: managerForIdx(d.empIdx), createdBy: managerForIdx(d.empIdx), isActive: true,
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
      { orgId: org.id, managerId: salesManagerUser.id, employeeId: empUsers[8].id, scheduledAt: anchorPlusDays(10), duration: 30, isRecurring: true, recurrencePattern: 'weekly', agenda: oneOnOneAgenda, actionItems: [], status: 'scheduled' },
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
    // emp08 (Sarah's contract engineer) keeps her team-offboarding view populated;
    // emp20 belongs to Meera's team.
    const offboardingRows = await db.insert(employeeOffboardings).values([
      { orgId: org.id, employeeId: empUsers[7].id, exitType: 'resignation', exitReason: 'Career growth opportunity elsewhere', resignationDate: fmt(anchorPlusDays(-10)), lastWorkingDate: fmt(anchorPlusDays(20)), noticePeriodDays: 30, clearanceStatus: {}, assetReturnStatus: [], settlementStatus: 'pending', settlementEstimate: {}, handoverStatus: 'in_progress', status: 'in_progress', initiatedBy: managerUser.id, isActive: true },
      { orgId: org.id, employeeId: empUsers[19].id, exitType: 'resignation', exitReason: 'Relocating to another city', resignationDate: fmt(anchorPlusDays(-5)), lastWorkingDate: fmt(anchorPlusDays(25)), noticePeriodDays: 30, clearanceStatus: {}, assetReturnStatus: [], settlementStatus: 'pending', settlementEstimate: {}, handoverStatus: 'pending', status: 'initiated', initiatedBy: opsManagerUser.id, isActive: true },
    ]).returning();
    console.log('  ✓ Employee offboardings: 2');

    // ── Exit Interviews (1) ───────────────────────────────────────────────────
    await db.insert(exitInterviews).values({
      orgId: org.id, employeeId: empUsers[7].id, offboardingId: offboardingRows[0].id,
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

    // ── Learning & Development (learning-development) ─────────────────────────
    const courseSeed = [
      { title: 'TypeScript Fundamentals', type: 'internal', format: 'video', difficulty: 'beginner', duration: 180, provider: null as string | null, skills: ['TypeScript', 'JavaScript'], topics: ['Types', 'Generics', 'Modules'], isMandatory: false, complianceCategory: null as string | null },
      { title: 'Advanced React Patterns', type: 'internal', format: 'mixed', difficulty: 'advanced', duration: 240, provider: null, skills: ['React', 'Hooks', 'Performance'], topics: ['Render props', 'Suspense', 'Memoization'], isMandatory: false, complianceCategory: null },
      { title: 'Node.js & Backend Architecture', type: 'internal', format: 'video', difficulty: 'intermediate', duration: 300, provider: null, skills: ['Node.js', 'REST', 'PostgreSQL'], topics: ['Express', 'Auth', 'Caching'], isMandatory: false, complianceCategory: null },
      { title: 'Effective Communication at Work', type: 'internal', format: 'slides', difficulty: 'beginner', duration: 90, provider: null, skills: ['Communication', 'Collaboration'], topics: ['Active listening', 'Feedback'], isMandatory: false, complianceCategory: null },
      { title: 'POSH — Prevention of Sexual Harassment', type: 'internal', format: 'interactive', difficulty: 'beginner', duration: 60, provider: null, skills: ['Compliance'], topics: ['Policy', 'Reporting'], isMandatory: true, complianceCategory: 'posh' },
      { title: 'Data Privacy & GDPR Essentials', type: 'internal', format: 'interactive', difficulty: 'beginner', duration: 75, provider: null, skills: ['Compliance', 'Security'], topics: ['PII', 'Consent', 'Breaches'], isMandatory: true, complianceCategory: 'data_privacy' },
      { title: 'Leadership for New Managers', type: 'internal', format: 'mixed', difficulty: 'intermediate', duration: 210, provider: null, skills: ['Leadership', 'People Management'], topics: ['1:1s', 'Delegation', 'Coaching'], isMandatory: false, complianceCategory: null },
      { title: 'Sales Negotiation Masterclass', type: 'external', format: 'video', difficulty: 'advanced', duration: 150, provider: 'udemy', skills: ['Negotiation', 'CRM'], topics: ['Objection handling', 'Closing'], isMandatory: false, complianceCategory: null },
      { title: 'Financial Modeling with Excel', type: 'external', format: 'video', difficulty: 'intermediate', duration: 200, provider: 'coursera', skills: ['Finance', 'Excel'], topics: ['DCF', 'Forecasting'], isMandatory: false, complianceCategory: null },
      { title: 'Cloud Fundamentals (AWS)', type: 'external', format: 'mixed', difficulty: 'beginner', duration: 260, provider: 'pluralsight', skills: ['AWS', 'Cloud'], topics: ['EC2', 'S3', 'IAM'], isMandatory: false, complianceCategory: null },
    ];
    const seededCourses = await db.insert(courses).values(
      courseSeed.map((c) => ({
        orgId: org.id, title: c.title,
        description: `${c.title}: a ${c.difficulty}-level ${c.format} course covering ${c.topics.join(', ')}.`,
        type: c.type, format: c.format, provider: c.provider,
        externalUrl: c.type === 'external' ? `https://learn.example.com/${c.title.toLowerCase().replace(/[^a-z]+/g, '-')}` : null,
        duration: c.duration, difficulty: c.difficulty, skills: c.skills, topics: c.topics,
        isMandatory: c.isMandatory, complianceCategory: c.complianceCategory,
        avgRating: 4, totalEnrollments: 0, createdBy: adminUser.id, isActive: true,
      })),
    ).returning();

    type EnrollSpec = { empIdx: number; courseIdx: number; status: string; progress: number; assignmentType: string; timeSpent: number; rating?: number; review?: string; completedOffset?: number; deadlineOffset?: number };
    const enrollSpecs: EnrollSpec[] = [
      { empIdx: 0, courseIdx: 0, status: 'completed', progress: 100, assignmentType: 'self', timeSpent: 180, rating: 5, review: 'Excellent intro — clear and practical.', completedOffset: -40 },
      { empIdx: 0, courseIdx: 4, status: 'completed', progress: 100, assignmentType: 'manager', timeSpent: 60, completedOffset: -20, deadlineOffset: -10 },
      { empIdx: 0, courseIdx: 1, status: 'in_progress', progress: 45, assignmentType: 'self', timeSpent: 95 },
      { empIdx: 0, courseIdx: 5, status: 'enrolled', progress: 0, assignmentType: 'manager', timeSpent: 0, deadlineOffset: 14 },
    ];
    for (let i = 1; i < 20; i++) {
      const courseA = i % seededCourses.length;
      const courseB = (i + 3) % seededCourses.length;
      const statusCycle = ['completed', 'in_progress', 'enrolled', 'completed'][i % 4];
      const progress = statusCycle === 'completed' ? 100 : statusCycle === 'in_progress' ? 30 + (i % 5) * 12 : 0;
      enrollSpecs.push({
        empIdx: i, courseIdx: courseA, status: statusCycle, progress,
        assignmentType: i % 3 === 0 ? 'manager' : 'self',
        timeSpent: statusCycle === 'completed' ? 120 + (i % 4) * 30 : statusCycle === 'in_progress' ? 40 + (i % 6) * 10 : 0,
        rating: statusCycle === 'completed' ? 3 + (i % 3) : undefined,
        completedOffset: statusCycle === 'completed' ? -(15 + (i % 20)) : undefined,
        deadlineOffset: i % 3 === 0 ? (i % 5 === 0 ? -7 : 21) : undefined,
      });
      enrollSpecs.push({
        empIdx: i, courseIdx: 4, status: i % 2 === 0 ? 'completed' : 'in_progress',
        progress: i % 2 === 0 ? 100 : 50, assignmentType: 'manager',
        timeSpent: i % 2 === 0 ? 60 : 30, completedOffset: i % 2 === 0 ? -(10 + i) : undefined, deadlineOffset: 30,
      });
      if (i % 4 === 0) enrollSpecs.push({ empIdx: i, courseIdx: courseB, status: 'enrolled', progress: 0, assignmentType: 'self', timeSpent: 0 });
    }
    await db.insert(courseEnrollments).values(
      enrollSpecs.map((e) => ({
        orgId: org.id, courseId: seededCourses[e.courseIdx].id, employeeId: empUsers[e.empIdx].id,
        assignedBy: e.assignmentType === 'manager' ? managerForIdx(e.empIdx) : null, assignmentType: e.assignmentType,
        status: e.status, progress: e.progress, score: e.status === 'completed' ? 80 + (e.empIdx % 20) : null,
        completedAt: e.completedOffset !== undefined ? anchorPlusDays(e.completedOffset) : null,
        deadline: e.deadlineOffset !== undefined ? anchorPlusDays(e.deadlineOffset) : null,
        timeSpent: e.timeSpent, lastAccessedAt: e.status !== 'enrolled' ? anchorPlusDays(-(e.empIdx % 10) - 1) : null,
        rating: e.rating ?? null, review: e.review ?? null, isActive: true,
      })),
    );

    const pathSeed = [
      { empIdx: 0, title: 'Full-Stack Engineer Track', targetRole: 'Senior Software Engineer', skills: ['TypeScript', 'React', 'Node.js'], items: [0, 1, 2], progress: 40, completed: 1 },
      { empIdx: 1, title: 'Frontend Specialist Path', targetRole: 'Senior Software Engineer', skills: ['React', 'Performance'], items: [0, 1], progress: 50, completed: 1 },
      { empIdx: 6, title: 'New Manager Onboarding', targetRole: 'Engineering Manager', skills: ['Leadership'], items: [6, 3], progress: 0, completed: 0 },
      { empIdx: 8, title: 'Sales Excellence Path', targetRole: 'Senior Sales Executive', skills: ['Negotiation'], items: [7, 3], progress: 100, completed: 2 },
      { empIdx: 16, title: 'Finance Analyst Growth', targetRole: 'Finance Manager', skills: ['Finance', 'Excel'], items: [8, 3], progress: 25, completed: 0 },
    ];
    for (const p of pathSeed) {
      const [path] = await db.insert(learningPaths).values({
        orgId: org.id, employeeId: empUsers[p.empIdx].id, title: p.title,
        description: `Curated path toward ${p.targetRole}.`, type: 'role_based', targetRole: p.targetRole, skills: p.skills,
        totalItems: p.items.length, completedItems: p.completed, progress: p.progress,
        estimatedHours: p.items.reduce((s, idx) => s + Math.round((seededCourses[idx].duration ?? 60) / 60), 0),
        status: p.progress >= 100 ? 'completed' : 'active', completedAt: p.progress >= 100 ? anchorPlusDays(-5) : null,
        createdBy: managerForIdx(p.empIdx), metadata: { createdByManager: true }, isActive: true,
      }).returning();
      await db.insert(learningPathItems).values(
        p.items.map((courseIdx, order) => ({
          orgId: org.id, learningPathId: path.id, courseId: seededCourses[courseIdx].id, itemType: 'course',
          title: seededCourses[courseIdx].title, order: order + 1, isRequired: true,
          status: order < p.completed ? 'completed' : 'pending', completedAt: order < p.completed ? anchorPlusDays(-10) : null, isActive: true,
        })),
      );
    }

    const certSeed = [
      { empIdx: 0, name: 'AWS Certified Solutions Architect — Associate', issuingBody: 'Amazon Web Services', issueOffset: -400, expiryOffset: 25, cpe: 40, status: 'active' },
      { empIdx: 0, name: 'Certified Scrum Master (CSM)', issuingBody: 'Scrum Alliance', issueOffset: -300, expiryOffset: 200, cpe: 20, status: 'active' },
      { empIdx: 1, name: 'Professional Scrum Developer', issuingBody: 'Scrum.org', issueOffset: -200, expiryOffset: 55, cpe: 15, status: 'active' },
      { empIdx: 2, name: 'MongoDB Associate Developer', issuingBody: 'MongoDB', issueOffset: -500, expiryOffset: -20, cpe: 10, status: 'expired' },
      { empIdx: 8, name: 'Salesforce Certified Administrator', issuingBody: 'Salesforce', issueOffset: -150, expiryOffset: 320, cpe: 25, status: 'active' },
      { empIdx: 16, name: 'Financial Modeling & Valuation Analyst (FMVA)', issuingBody: 'CFI', issueOffset: -100, expiryOffset: 85, cpe: 30, status: 'active' },
    ];
    await db.insert(certifications).values(
      certSeed.map((c, i) => ({
        orgId: org.id, employeeId: empUsers[c.empIdx].id, name: c.name, issuingBody: c.issuingBody,
        credentialId: `CRED-${String(1000 + i)}`, credentialUrl: `https://verify.example.com/cred/${1000 + i}`,
        issueDate: fmt(anchorPlusDays(c.issueOffset)), expiryDate: fmt(anchorPlusDays(c.expiryOffset)),
        cpeCredits: c.cpe, cpeEarned: Math.round(c.cpe / 2), status: c.status,
        proofUrl: `https://files.example.com/certs/${1000 + i}.pdf`, proofFileName: `certificate-${1000 + i}.pdf`, isActive: true,
      })),
    );

    const deptBudgetSeed = [
      { dept: engDept.id, total: 500000, spent: 180000 },
      { dept: salesDept.id, total: 250000, spent: 90000 },
      { dept: hrDept.id, total: 150000, spent: 40000 },
      { dept: finDept.id, total: 200000, spent: 75000 },
    ];
    await db.insert(learningBudgets).values(
      deptBudgetSeed.map((b) => ({
        orgId: org.id, type: 'department', departmentId: b.dept, fiscalYear: '2026',
        totalBudget: b.total.toFixed(2), allocatedAmount: b.total.toFixed(2), spentAmount: b.spent.toFixed(2),
        remainingAmount: (b.total - b.spent).toFixed(2), currency: 'INR', rolloverEnabled: true, rolloverAmount: '0.00', status: 'active', isActive: true,
      })),
    );
    await db.insert(learningBudgets).values({
      orgId: org.id, type: 'individual', employeeId: empUsers[0].id, fiscalYear: '2026',
      totalBudget: '50000.00', allocatedAmount: '50000.00', spentAmount: '18000.00', remainingAmount: '32000.00',
      currency: 'INR', rolloverEnabled: false, rolloverAmount: '0.00', status: 'active',
      spendHistory: [
        { courseName: 'Advanced React Patterns (Frontend Masters)', provider: 'Frontend Masters', cost: 12000, currency: 'INR', status: 'approved', requestedAt: anchorPlusDays(-40).toISOString() },
        { courseName: 'System Design Interview Prep', provider: 'Educative', cost: 6000, currency: 'INR', status: 'reimbursed', requestedAt: anchorPlusDays(-20).toISOString() },
        { courseName: 'Kubernetes Deep Dive', provider: 'Udemy', cost: 8000, currency: 'INR', status: 'pending_approval', requestedAt: anchorPlusDays(-3).toISOString() },
      ], isActive: true,
    });

    await db.insert(trainingSessions).values([
      { orgId: org.id, courseId: seededCourses[1].id, title: 'Advanced React Workshop', description: 'Hands-on patterns workshop.', type: 'ilt', instructorName: 'Sarah Mehta', location: 'Bengaluru HQ', roomName: 'Training Room A', startTime: anchorPlusDays(5), endTime: anchorPlusDays(5), maxCapacity: 25, enrolledCount: 12, status: 'scheduled', createdBy: adminUser.id, isActive: true },
      { orgId: org.id, courseId: seededCourses[6].id, title: 'Leadership Bootcamp (Virtual)', description: 'For new and aspiring managers.', type: 'virtual', instructorName: 'Alex Kumar', virtualLink: 'https://zoom.example.com/leadership', startTime: anchorPlusDays(10), endTime: anchorPlusDays(10), maxCapacity: 40, enrolledCount: 18, status: 'scheduled', createdBy: adminUser.id, isActive: true },
      { orgId: org.id, courseId: seededCourses[4].id, title: 'Mandatory POSH Refresher', description: 'Annual compliance session.', type: 'ilt', instructorName: 'External Counsel', location: 'Bengaluru HQ', roomName: 'Auditorium', startTime: anchorPlusDays(-7), endTime: anchorPlusDays(-7), maxCapacity: 50, enrolledCount: 48, status: 'completed', createdBy: adminUser.id, isActive: true },
    ]);
    console.log('  ✓ L&D: 10 courses, enrollments, 5 paths, 6 certs, 5 budgets, 3 sessions');

    // ── Engagement & Culture ─────────────────────────────────────────────────
    // Hierarchy: emp01–08 Eng → Sarah, emp09–12 Sales → Vikram, emp13–20 HR/Fin → Meera.
    {
      // ---- Culture Values ----
      const cultureValueRows = [
        { name: 'Customer Obsession', description: 'We start with the customer and work backwards.', icon: '🎯', sortOrder: 1, recognitionCount: 14 },
        { name: 'Ownership', description: 'We act on behalf of the whole company, never "that’s not my job".', icon: '🛠️', sortOrder: 2, recognitionCount: 11 },
        { name: 'Innovation', description: 'We seek new ideas and embrace experimentation.', icon: '💡', sortOrder: 3, recognitionCount: 9 },
        { name: 'Integrity', description: 'We are honest, transparent, and do the right thing.', icon: '🤝', sortOrder: 4, recognitionCount: 7 },
        { name: 'Teamwork', description: 'We win together and support each other.', icon: '🌟', sortOrder: 5, recognitionCount: 12 },
      ];
      await db.insert(cultureValues).values(
        cultureValueRows.map((c) => ({ orgId: org.id, ...c, isActive: true })),
      );

      // ---- Surveys (1 active engagement, 2 active pulse, 1 feedback, 1 closed) ----
      const ratingQ = (id: string, text: string) => ({ id, text, type: 'rating' as const });
      const textQ = (id: string, text: string) => ({ id, text, type: 'text' as const });
      const surveyRows = await db.insert(surveys).values([
        {
          orgId: org.id, title: 'Q2 2026 Employee Engagement Survey', type: 'engagement', status: 'active',
          description: 'Help us understand how engaged and supported you feel at Acme Corp.',
          questions: [
            ratingQ('q1', 'How satisfied are you with your role overall?'),
            ratingQ('q2', 'How likely are you to recommend Acme as a place to work?'),
            textQ('q3', 'What is one thing we could do to improve your experience?'),
          ],
          targetAudience: { all: true }, isAnonymous: false, responseCount: 0,
          closesAt: anchorPlusDays(14), createdBy: adminUser.id,
        },
        {
          orgId: org.id, title: 'Weekly Pulse — How are you feeling?', type: 'pulse', status: 'active',
          description: 'A quick 2-question pulse check.',
          questions: [ratingQ('p1', 'How was your week?'), textQ('p2', 'Anything on your mind?')],
          targetAudience: { all: true }, isAnonymous: false, responseCount: 0,
          closesAt: anchorPlusDays(3), createdBy: adminUser.id,
        },
        {
          orgId: org.id, title: 'Pulse — Workload & Balance', type: 'pulse', status: 'active',
          description: 'Tell us about your current workload.',
          questions: [ratingQ('p3', 'Is your workload manageable?'), textQ('p4', 'What would help most?')],
          targetAudience: { all: true }, isAnonymous: false, responseCount: 0,
          closesAt: anchorPlusDays(2), createdBy: adminUser.id,
        },
        {
          orgId: org.id, title: 'Manager Feedback — Q1', type: 'feedback', status: 'active',
          description: 'Share feedback for your manager and team.',
          questions: [textQ('f1', 'What is going well?'), textQ('f2', 'What could be better?')],
          targetAudience: { all: true }, isAnonymous: false, responseCount: 0,
          closesAt: anchorPlusDays(10), createdBy: managerUser.id,
        },
        {
          orgId: org.id, title: 'Q1 2026 Engagement Survey (Closed)', type: 'engagement', status: 'closed',
          description: 'Previous quarter engagement survey.',
          questions: [ratingQ('cq1', 'Overall satisfaction?')],
          targetAudience: { all: true }, isAnonymous: false, responseCount: 0,
          closesAt: anchorPlusDays(-30), createdBy: adminUser.id,
        },
      ]).returning();
      const [engSurvey, pulse1, pulse2, fbSurvey] = surveyRows;

      // ---- Survey Responses (free-text + sentiment, from team members) ----
      const sentiments = ['positive', 'neutral', 'negative'] as const;
      const posComments = ['Love the team culture and flexibility.', 'Great support from my manager.', 'Exciting projects and good growth.'];
      const neuComments = ['Things are fine, no major complaints.', 'Workload is okay most weeks.', 'Neutral about the new process.'];
      const negComments = ['Workload has been too high lately.', 'Communication could be clearer.', 'Feeling a bit burned out this sprint.'];
      const responseInserts: any[] = [];
      // 16 of 20 respond to the engagement survey
      empUsers.slice(0, 16).forEach((u, i) => {
        const sentiment = sentiments[i % 3];
        const comment = sentiment === 'positive' ? posComments[i % 3] : sentiment === 'neutral' ? neuComments[i % 3] : negComments[i % 3];
        responseInserts.push({
          orgId: org.id, surveyId: engSurvey.id, respondentId: u.id,
          answers: [{ questionId: 'q1', value: 3 + (i % 3) }, { questionId: 'q3', value: comment }],
          sentiment, submittedAt: anchorPlusDays(-2 - (i % 5)), isActive: true,
        });
      });
      // 12 respond to pulse1, 10 to pulse2
      empUsers.slice(0, 12).forEach((u, i) => {
        const sentiment = sentiments[i % 3];
        responseInserts.push({
          orgId: org.id, surveyId: pulse1.id, respondentId: u.id,
          answers: [{ questionId: 'p1', value: 3 + (i % 3) }, { questionId: 'p2', value: sentiment === 'negative' ? negComments[i % 3] : posComments[i % 3] }],
          sentiment, submittedAt: anchorPlusDays(-1 - (i % 3)), isActive: true,
        });
      });
      empUsers.slice(0, 10).forEach((u, i) => {
        responseInserts.push({
          orgId: org.id, surveyId: pulse2.id, respondentId: u.id,
          answers: [{ questionId: 'p3', value: 2 + (i % 4) }, { questionId: 'p4', value: neuComments[i % 3] }],
          sentiment: sentiments[(i + 1) % 3], submittedAt: anchorPlusDays(-1 - (i % 2)), isActive: true,
        });
      });
      // 8 respond to feedback survey
      empUsers.slice(0, 8).forEach((u, i) => {
        responseInserts.push({
          orgId: org.id, surveyId: fbSurvey.id, respondentId: u.id,
          answers: [{ questionId: 'f1', value: posComments[i % 3] }, { questionId: 'f2', value: negComments[i % 3] }],
          sentiment: sentiments[i % 3], submittedAt: anchorPlusDays(-3 - (i % 4)), isActive: true,
        });
      });
      await db.insert(surveyResponses).values(responseInserts);
      // sync responseCount
      await db.update(surveys).set({ responseCount: 16 }).where(eq(surveys.id, engSurvey.id));
      await db.update(surveys).set({ responseCount: 12 }).where(eq(surveys.id, pulse1.id));
      await db.update(surveys).set({ responseCount: 10 }).where(eq(surveys.id, pulse2.id));
      await db.update(surveys).set({ responseCount: 8 }).where(eq(surveys.id, fbSurvey.id));

      // ---- Wellness Programs (active) ----
      const programRows = await db.insert(wellnessPrograms).values([
        { orgId: org.id, name: 'Step Up Challenge 2026', type: 'fitness', status: 'active', description: 'Hit 10k steps a day for 30 days and earn points.', startDate: anchorPlusDays(-10), endDate: anchorPlusDays(20), budget: '150000', spentBudget: '40000', maxParticipants: 50, currentParticipants: 0, isActive: true, createdBy: adminUser.id },
        { orgId: org.id, name: 'Mindfulness & Meditation', type: 'mental_health', status: 'active', description: 'Weekly guided meditation sessions for stress relief.', startDate: anchorPlusDays(-20), endDate: anchorPlusDays(40), budget: '90000', spentBudget: '25000', maxParticipants: 40, currentParticipants: 0, isActive: true, createdBy: adminUser.id },
        { orgId: org.id, name: 'Healthy Eating Workshop', type: 'nutrition', status: 'active', description: 'Nutritionist-led sessions on balanced diets.', startDate: anchorPlusDays(-5), endDate: anchorPlusDays(25), budget: '60000', spentBudget: '10000', maxParticipants: 30, currentParticipants: 0, isActive: true, createdBy: adminUser.id },
        { orgId: org.id, name: 'Financial Wellness 101', type: 'financial', status: 'active', description: 'Personal finance and investment basics.', startDate: anchorPlusDays(-2), endDate: anchorPlusDays(30), budget: '50000', spentBudget: '0', maxParticipants: 60, currentParticipants: 0, isActive: true, createdBy: adminUser.id },
      ]).returning();

      // ---- Wellness Participations (emp01..emp14 across programs) ----
      const partInserts: any[] = [];
      const partCounts: Record<string, number> = {};
      empUsers.slice(0, 14).forEach((u, i) => {
        const program = programRows[i % programRows.length];
        const done = i % 4 === 0;
        partCounts[program.id] = (partCounts[program.id] ?? 0) + 1;
        partInserts.push({
          orgId: org.id, programId: program.id, employeeId: u.id,
          status: done ? 'completed' : (i % 3 === 0 ? 'in_progress' : 'enrolled'),
          progress: done ? 100 : (i % 3 === 0 ? 40 + (i % 30) : 0),
          pointsEarned: done ? 100 : (i % 3 === 0 ? 40 : 0),
          enrolledAt: anchorPlusDays(-8 - (i % 6)),
          completedAt: done ? anchorPlusDays(-1) : null,
          isActive: true,
        });
      });
      await db.insert(wellnessParticipations).values(partInserts);
      for (const [pid, count] of Object.entries(partCounts)) {
        await db.update(wellnessPrograms).set({ currentParticipants: count }).where(eq(wellnessPrograms.id, pid));
      }

      // ---- Social Groups ----
      await db.insert(socialGroups).values([
        { orgId: org.id, name: 'Running Club', description: 'For everyone who loves to run.', type: 'interest', memberCount: 12, isActive: true, createdBy: empUsers[0].id },
        { orgId: org.id, name: 'Book Club', description: 'Monthly book discussions.', type: 'interest', memberCount: 8, isActive: true, createdBy: empUsers[3].id },
        { orgId: org.id, name: 'Engineering Guild', description: 'Tech talks and knowledge sharing.', type: 'department', memberCount: 8, isActive: true, createdBy: empUsers[1].id },
      ]);

      // ---- Social Posts (general + shoutouts + announcements from team members) ----
      await db.insert(socialPosts).values([
        { orgId: org.id, authorId: empUsers[0].id, type: 'post', content: 'Had a great sprint demo today — proud of the team! 🚀', likesCount: 9, commentsCount: 3, isActive: true },
        { orgId: org.id, authorId: empUsers[2].id, type: 'shoutout', content: 'Big shoutout to Priya for stepping up on the release — true Ownership!', likesCount: 15, commentsCount: 2, isActive: true },
        { orgId: org.id, authorId: empUsers[4].id, type: 'shoutout', content: 'Thanks to the design team for the amazing new dashboard — Customer Obsession in action!', likesCount: 11, commentsCount: 1, isActive: true },
        { orgId: org.id, authorId: empUsers[6].id, type: 'announcement', content: 'Suggestion: can we add standing desks to the 3rd floor? Would help a lot.', likesCount: 7, commentsCount: 4, isActive: true },
        { orgId: org.id, authorId: empUsers[1].id, type: 'event', content: 'Friday team lunch at 1pm — everyone welcome! 🍕', likesCount: 18, commentsCount: 6, isActive: true },
        { orgId: org.id, authorId: empUsers[8].id, type: 'post', content: 'Just finished the Mindfulness program — highly recommend it.', likesCount: 6, commentsCount: 1, isActive: true },
        { orgId: org.id, authorId: empUsers[10].id, type: 'shoutout', content: 'Kudos to the sales team for crushing the quarter — Teamwork wins!', likesCount: 13, commentsCount: 2, isActive: true },
      ]);

      // ---- Engagement Scores (current period, all 20 across 4 depts, with breakdown array) ----
      const period = '2026-Q2';
      const mkBreakdown = (overall: number) => ([
        { category: 'Job Satisfaction', score: Math.min(100, overall + 5), maxScore: 100 },
        { category: 'Culture Fit', score: Math.max(0, overall - 4), maxScore: 100 },
        { category: 'Participation', score: Math.max(0, overall - 8), maxScore: 100 },
        { category: 'Recognition', score: Math.min(100, overall + 2), maxScore: 100 },
      ]);
      const scoreInserts: any[] = [];
      empUsers.forEach((u, i) => {
        // deterministic spread 22..88, a few low (<50, <40, <30) to drive action items/attrition risk.
        // emp01 (the demo employee persona) gets a healthy score so "My Engagement" shows a badge + breakdown.
        const overall = i === 0 ? 82 : 22 + ((i * 17) % 67); // 22..88
        const badges = overall >= 75
          ? [{ id: 'top-engager', name: 'Top Engager', icon: '🏆', description: 'Top-tier engagement this quarter', earnedAt: fmt(anchorPlusDays(-7)) }]
          : overall >= 60
            ? [{ id: 'active-participant', name: 'Active Participant', icon: '⭐', description: 'Consistently engaged in pulses & programs', earnedAt: fmt(anchorPlusDays(-14)) }]
            : [];
        scoreInserts.push({
          orgId: org.id, employeeId: u.id, overallScore: overall,
          enpsScore: Math.max(-100, Math.min(100, (overall - 50) * 2)),
          cultureFitScore: Math.max(0, overall - 4),
          participationScore: Math.max(0, overall - 8),
          period, breakdown: mkBreakdown(overall), badges, isActive: true,
        });
      });
      // also seed a prior period so analytics trend lines have >1 point
      empUsers.slice(0, 12).forEach((u, i) => {
        const overall = 30 + ((i * 13) % 55);
        scoreInserts.push({
          orgId: org.id, employeeId: u.id, overallScore: overall,
          enpsScore: Math.max(-100, Math.min(100, (overall - 50) * 2)),
          cultureFitScore: Math.max(0, overall - 6), participationScore: Math.max(0, overall - 10),
          period: '2026-Q1', breakdown: mkBreakdown(overall), badges: [], isActive: true,
        });
      });
      await db.insert(engagementScores).values(scoreInserts);
    }
    console.log('  ✓ engagement-culture: 5 culture values, 5 surveys + 46 responses, 4 wellness programs + 14 enrollments, 3 groups + 7 posts, 32 engagement scores');

    // ─── Workforce Planning (Demo-Readiness Sprint 5) ──────────────────────────
    // Role & grade architecture — drives Career Path Explorer + Grade Distribution
    await db.insert(roleGradeDefinitions).values([
      { orgId: org.id, roleTitle: 'Software Engineer', jobFamily: 'Engineering', jobFunction: 'Backend', gradeCode: 'IC2', gradeLevel: 2, salaryRangeMin: '800000', salaryRangeMax: '1200000', salaryRangeMid: '1000000', currency: 'INR', roleDescription: 'Builds and maintains backend services and APIs.', keyResponsibilities: ['Ship features', 'Write tests', 'Code review'], competencyRequirements: ['JavaScript', 'SQL', 'REST APIs'], typicalExperienceYears: '2-4 years', isManagerialRole: false, reportingToGradeCode: 'M1', progressionPaths: ['IC3', 'M1'] },
      { orgId: org.id, roleTitle: 'Senior Software Engineer', jobFamily: 'Engineering', jobFunction: 'Backend', gradeCode: 'IC3', gradeLevel: 3, salaryRangeMin: '1400000', salaryRangeMax: '2000000', salaryRangeMid: '1700000', currency: 'INR', roleDescription: 'Leads technical design and mentors engineers.', keyResponsibilities: ['System design', 'Mentoring', 'Tech leadership'], competencyRequirements: ['System Design', 'TypeScript', 'PostgreSQL'], typicalExperienceYears: '4-7 years', isManagerialRole: false, reportingToGradeCode: 'M1', progressionPaths: ['IC4', 'M1'] },
      { orgId: org.id, roleTitle: 'Engineering Manager', jobFamily: 'Engineering', jobFunction: 'Management', gradeCode: 'M1', gradeLevel: 4, salaryRangeMin: '2400000', salaryRangeMax: '3200000', salaryRangeMid: '2800000', currency: 'INR', roleDescription: 'Manages an engineering team and delivery.', keyResponsibilities: ['People management', 'Delivery', 'Hiring'], competencyRequirements: ['Leadership', 'Planning', 'Coaching'], typicalExperienceYears: '7-10 years', isManagerialRole: true, reportingToGradeCode: 'M2', progressionPaths: ['M2'] },
      { orgId: org.id, roleTitle: 'Sales Executive', jobFamily: 'Sales', jobFunction: 'Field Sales', gradeCode: 'S1', gradeLevel: 2, salaryRangeMin: '500000', salaryRangeMax: '800000', salaryRangeMid: '650000', currency: 'INR', roleDescription: 'Drives new business and closes deals.', keyResponsibilities: ['Prospecting', 'Closing', 'Account growth'], competencyRequirements: ['Negotiation', 'CRM', 'Communication'], typicalExperienceYears: '1-3 years', isManagerialRole: false, reportingToGradeCode: 'S3', progressionPaths: ['S2', 'S3'] },
      { orgId: org.id, roleTitle: 'Senior Sales Executive', jobFamily: 'Sales', jobFunction: 'Field Sales', gradeCode: 'S2', gradeLevel: 3, salaryRangeMin: '900000', salaryRangeMax: '1400000', salaryRangeMid: '1150000', currency: 'INR', roleDescription: 'Owns key accounts and mentors reps.', keyResponsibilities: ['Key accounts', 'Mentoring', 'Forecasting'], competencyRequirements: ['Enterprise Sales', 'Forecasting'], typicalExperienceYears: '3-6 years', isManagerialRole: false, reportingToGradeCode: 'S3', progressionPaths: ['S3'] },
      { orgId: org.id, roleTitle: 'HR Executive', jobFamily: 'HR', jobFunction: 'People Ops', gradeCode: 'H1', gradeLevel: 2, salaryRangeMin: '450000', salaryRangeMax: '700000', salaryRangeMid: '575000', currency: 'INR', roleDescription: 'Supports recruitment and employee operations.', keyResponsibilities: ['Recruitment', 'Onboarding', 'Records'], competencyRequirements: ['Recruitment', 'HRIS'], typicalExperienceYears: '1-3 years', isManagerialRole: false, reportingToGradeCode: 'H2', progressionPaths: ['H2'] },
      { orgId: org.id, roleTitle: 'Financial Analyst', jobFamily: 'Finance', jobFunction: 'FP&A', gradeCode: 'F1', gradeLevel: 2, salaryRangeMin: '600000', salaryRangeMax: '950000', salaryRangeMid: '775000', currency: 'INR', roleDescription: 'Builds models and analyzes performance.', keyResponsibilities: ['Modeling', 'Reporting', 'Budgeting'], competencyRequirements: ['Excel', 'Financial Modeling'], typicalExperienceYears: '2-4 years', isManagerialRole: false, reportingToGradeCode: 'F2', progressionPaths: ['F2'] },
    ]);

    // Headcount plans — one per department (drives Org Design summary, Job Board openings, Team Headcount)
    await db.insert(workforceHeadcountPlans).values([
      { orgId: org.id, planName: 'FY2026 Engineering Plan', planYear: 2026, departmentId: engDept.id, currentHeadcount: 8, approvedHeadcount: 11, targetHeadcount: 12, openRequisitions: 3, hiringFreezeActive: false, status: 'approved', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-20), notes: 'Scaling backend and platform teams.' },
      { orgId: org.id, planName: 'FY2026 Sales Plan', planYear: 2026, departmentId: salesDept.id, currentHeadcount: 5, approvedHeadcount: 7, targetHeadcount: 8, openRequisitions: 2, hiringFreezeActive: false, status: 'active', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-18), notes: 'Expanding into new regions.' },
      { orgId: org.id, planName: 'FY2026 HR Plan', planYear: 2026, departmentId: hrDept.id, currentHeadcount: 2, approvedHeadcount: 3, targetHeadcount: 3, openRequisitions: 1, hiringFreezeActive: false, status: 'approved', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-15), notes: 'One HR generalist opening.' },
      { orgId: org.id, planName: 'FY2026 Finance Plan', planYear: 2026, departmentId: finDept.id, currentHeadcount: 4, approvedHeadcount: 4, targetHeadcount: 5, openRequisitions: 0, hiringFreezeActive: true, hiringFreezeReason: 'Cost optimization for H1', status: 'draft', notes: 'On hold pending budget review.' },
      { orgId: org.id, planName: 'FY2025 Engineering Plan', planYear: 2025, departmentId: engDept.id, currentHeadcount: 6, approvedHeadcount: 8, targetHeadcount: 8, openRequisitions: 0, hiringFreezeActive: false, status: 'active', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-365), notes: 'Prior-year baseline for trend.' },
    ]);

    // Workforce budgets — one per department (decimals as STRINGS); drives Budget Management
    await db.insert(workforceBudgets).values([
      { orgId: org.id, budgetName: 'FY2026 Engineering Comp Budget', budgetYear: 2026, departmentId: engDept.id, costCenter: 'CC-ENG-01', allocatedAmount: '12000000', actualSpend: '7400000', projectedSpend: '11200000', salaryIncreasePool: '900000', benefitsCostProjected: '1300000', fteCount: 11, currency: 'INR', status: 'approved', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-25), notes: 'Includes annual merit pool.' },
      { orgId: org.id, budgetName: 'FY2026 Sales Comp Budget', budgetYear: 2026, departmentId: salesDept.id, costCenter: 'CC-SAL-01', allocatedAmount: '6500000', actualSpend: '6900000', projectedSpend: '7100000', salaryIncreasePool: '400000', benefitsCostProjected: '600000', fteCount: 7, currency: 'INR', status: 'active', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-22), notes: 'Over budget due to incentive payouts.' },
      { orgId: org.id, budgetName: 'FY2026 HR Comp Budget', budgetYear: 2026, departmentId: hrDept.id, costCenter: 'CC-HR-01', allocatedAmount: '2200000', actualSpend: '1450000', projectedSpend: '2050000', salaryIncreasePool: '120000', benefitsCostProjected: '240000', fteCount: 3, currency: 'INR', status: 'approved', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-20), notes: 'Within plan.' },
      { orgId: org.id, budgetName: 'FY2026 Finance Comp Budget', budgetYear: 2026, departmentId: finDept.id, costCenter: 'CC-FIN-01', allocatedAmount: '3800000', actualSpend: '2600000', projectedSpend: '3500000', salaryIncreasePool: '200000', benefitsCostProjected: '420000', fteCount: 4, currency: 'INR', status: 'draft', notes: 'Pending approval.' },
    ]);

    // Succession plans + candidates — drives Succession Planning + Succession Dashboard
    const wfSuccessionPlans = await db
      .insert(successionPlans)
      .values([
        { orgId: org.id, positionTitle: 'VP Engineering', departmentId: engDept.id, currentHolderId: managerUser.id, isKeyPosition: true, criticalityLevel: 'critical', benchStrength: 'adequate', successionCoveragePercent: 60, notes: 'Two candidates in development.', lastReviewedAt: anchorPlusDays(-30), reviewedBy: adminUser.id, status: 'active' },
        { orgId: org.id, positionTitle: 'Head of Sales', departmentId: salesDept.id, currentHolderId: salesManagerUser.id, isKeyPosition: true, criticalityLevel: 'critical', benchStrength: 'strong', successionCoveragePercent: 80, notes: 'Strong internal pipeline.', lastReviewedAt: anchorPlusDays(-25), reviewedBy: adminUser.id, status: 'active' },
        { orgId: org.id, positionTitle: 'HR Business Partner Lead', departmentId: hrDept.id, currentHolderId: null, isKeyPosition: true, criticalityLevel: 'high', benchStrength: 'weak', successionCoveragePercent: 25, notes: 'Single point of failure — needs development.', lastReviewedAt: anchorPlusDays(-40), reviewedBy: adminUser.id, status: 'active' },
        { orgId: org.id, positionTitle: 'Finance Controller', departmentId: finDept.id, currentHolderId: null, isKeyPosition: true, criticalityLevel: 'high', benchStrength: 'weak', successionCoveragePercent: 15, notes: 'Single early-stage successor in development — retention risk.', lastReviewedAt: anchorPlusDays(-50), reviewedBy: adminUser.id, status: 'active' },
      ])
      .returning();

    await db.insert(successionCandidates).values([
      { orgId: org.id, successionPlanId: wfSuccessionPlans[0].id, candidateEmployeeId: empUsers[0].id, readinessLevel: 'ready_now', performanceRating: 'exceptional', potentialRating: 'high', flightRisk: 'low', developmentNotes: 'Leadership program completed; ready for VP role.', nominatedBy: managerUser.id, approvedBy: adminUser.id, approvedAt: anchorPlusDays(-15), status: 'approved' },
      { orgId: org.id, successionPlanId: wfSuccessionPlans[0].id, candidateEmployeeId: empUsers[1].id, readinessLevel: '1yr', performanceRating: 'meets', potentialRating: 'high', flightRisk: 'medium', developmentNotes: 'Needs more cross-functional exposure.', nominatedBy: managerUser.id, status: 'nominated' },
      { orgId: org.id, successionPlanId: wfSuccessionPlans[1].id, candidateEmployeeId: empUsers[10].id, readinessLevel: 'ready_now', performanceRating: 'exceptional', potentialRating: 'high', flightRisk: 'low', developmentNotes: 'Top performer, strong leadership.', nominatedBy: salesManagerUser.id, approvedBy: adminUser.id, approvedAt: anchorPlusDays(-12), status: 'approved' },
      { orgId: org.id, successionPlanId: wfSuccessionPlans[1].id, candidateEmployeeId: empUsers[11].id, readinessLevel: '2yr', performanceRating: 'meets', potentialRating: 'medium', flightRisk: 'low', developmentNotes: 'Developing account management skills.', nominatedBy: salesManagerUser.id, status: 'nominated' },
      { orgId: org.id, successionPlanId: wfSuccessionPlans[2].id, candidateEmployeeId: empUsers[16].id, readinessLevel: '2yr', performanceRating: 'meets', potentialRating: 'medium', flightRisk: 'high', developmentNotes: 'Flight risk — retention plan needed.', nominatedBy: opsManagerUser.id, status: 'nominated' },
      { orgId: org.id, successionPlanId: wfSuccessionPlans[3].id, candidateEmployeeId: empUsers[18].id, readinessLevel: '2yr', performanceRating: 'meets', potentialRating: 'medium', flightRisk: 'medium', developmentNotes: 'Early-stage successor; needs controller-track development.', nominatedBy: opsManagerUser.id, status: 'nominated' },
    ]);

    // Internal transfer / mobility requests — drives Internal Mobility (admin), Transfer Requests (manager),
    // My Transfer Request (employee = emp01 → empUsers[0]). Mixed types/statuses.
    await db.insert(internalTransferRequests).values([
      { orgId: org.id, employeeId: empUsers[0].id, requestType: 'transfer', fromDepartmentId: engDept.id, toDepartmentId: salesDept.id, effectiveDate: anchorPlusDays(21), reason: 'Seeking a customer-facing role for career growth.', managerInitiated: false, initiatedBy: empUsers[0].id, currentApproverId: managerUser.id, backfillRequired: true, backfillStatus: 'not_started', status: 'pending' },
      { orgId: org.id, employeeId: empUsers[2].id, requestType: 'location_change', fromLocationId: null, toLocationId: null, fromDepartmentId: engDept.id, toDepartmentId: engDept.id, effectiveDate: anchorPlusDays(30), reason: 'Relocating to the Bengaluru office.', managerInitiated: false, initiatedBy: empUsers[2].id, currentApproverId: managerUser.id, backfillRequired: false, status: 'pending' },
      { orgId: org.id, employeeId: empUsers[1].id, requestType: 'promotion', fromDepartmentId: engDept.id, toDepartmentId: engDept.id, fromDesignationId: swe.id, toDesignationId: sse.id, effectiveDate: anchorPlusDays(-10), reason: 'Promotion to Senior Software Engineer for strong performance.', managerInitiated: true, initiatedBy: managerUser.id, backfillRequired: false, status: 'completed', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-14), completedAt: anchorPlusDays(-10) },
      { orgId: org.id, employeeId: empUsers[10].id, requestType: 'promotion', fromDepartmentId: salesDept.id, toDepartmentId: salesDept.id, fromDesignationId: salesExec.id, toDesignationId: snrSales.id, effectiveDate: anchorPlusDays(-5), reason: 'Promotion to Senior Sales Executive.', managerInitiated: true, initiatedBy: salesManagerUser.id, backfillRequired: true, backfillStatus: 'in_progress', status: 'approved', approvedBy: adminUser.id, approvedAt: anchorPlusDays(-7) },
      { orgId: org.id, employeeId: empUsers[4].id, requestType: 'lateral_move', fromDepartmentId: engDept.id, toDepartmentId: engDept.id, effectiveDate: anchorPlusDays(45), reason: 'Move from frontend to platform team.', managerInitiated: false, initiatedBy: empUsers[4].id, currentApproverId: managerUser.id, backfillRequired: false, status: 'pending' },
      { orgId: org.id, employeeId: empUsers[6].id, requestType: 'transfer', fromDepartmentId: salesDept.id, toDepartmentId: hrDept.id, effectiveDate: anchorPlusDays(15), reason: 'Interest in people operations.', managerInitiated: false, initiatedBy: empUsers[6].id, backfillRequired: false, status: 'rejected', rejectionReason: 'No current opening in HR; revisit next quarter.' },
    ]);

    console.log('  ✓ workforce-planning: 7 role/grade defs, 5 headcount plans, 4 budgets, 4 succession plans (+5 candidates), 6 transfer/mobility requests');

    // ════════════════════════════════════════════════════════════════════
    // Compliance & Audit — policies, acks, trainings, completions,
    // checklists, retention configs, ethics complaints, DSAR requests
    // ════════════════════════════════════════════════════════════════════

    // ── Compliance Policies (5; all published; 4 mandatory) ──
    const caPolicySeed = [
      { code: 'HR-POL-001', title: 'Code of Conduct', category: 'hr', mandatory: true, dept: null as string | null, description: 'Standards of professional and ethical behavior expected of all employees.' },
      { code: 'IT-POL-002', title: 'Information Security & Acceptable Use', category: 'it', mandatory: true, dept: null, description: 'Rules governing the use of company IT systems, data handling and password hygiene.' },
      { code: 'DP-POL-003', title: 'Data Privacy Policy', category: 'data-privacy', mandatory: true, dept: null, description: 'How the company collects, processes and protects personal data under GDPR/DPDP.' },
      { code: 'SF-POL-004', title: 'Workplace Health & Safety', category: 'safety', mandatory: true, dept: null, description: 'Occupational health and safety guidelines for all work locations.' },
      { code: 'ENG-POL-005', title: 'Engineering Change Management', category: 'other', mandatory: false, dept: engDept.id, description: 'Process for managing production changes within the Engineering organization.' },
    ];
    const caPolicies = await db
      .insert(compliancePolicies)
      .values(
        caPolicySeed.map((p, i) => ({
          orgId: org.id,
          title: p.title,
          policyCode: p.code,
          category: p.category,
          description: p.description,
          content: `${p.title}\n\n${p.description}\n\nAll employees are required to read, understand and comply with this policy. Violations may result in disciplinary action up to and including termination.`,
          version: '1.0',
          effectiveDate: anchorPlusDays(-120 + i * 5),
          status: 'published',
          approvedBy: adminUser.id,
          approvedAt: anchorPlusDays(-125 + i * 5),
          mandatoryAcknowledgment: p.mandatory,
          reminderCadenceDays: 30,
          appliesToDepartment: p.dept,
          jurisdiction: 'IN',
          language: 'en',
        })),
      )
      .returning();

    // ── Policy Acknowledgments — for the 4 mandatory policies; deterministic mix (some pending) ──
    const caMandatoryPolicies = caPolicies.filter((p) => p.mandatoryAcknowledgment);
    const caAckInserts: Array<typeof policyAcknowledgments.$inferInsert> = [];
    empUsers.forEach((u, idx) => {
      caMandatoryPolicies.forEach((p, pIdx) => {
        const acknowledged = (idx + pIdx) % 4 !== 0; // ~75% acknowledged
        if (acknowledged) {
          caAckInserts.push({
            orgId: org.id,
            policyId: p.id,
            employeeId: u.id,
            policyVersion: p.version,
            acknowledgedAt: anchorPlusDays(-90 + (idx % 30)),
            ipAddress: `10.0.${idx}.${pIdx + 1}`,
          });
        }
      });
    });
    if (caAckInserts.length) await db.insert(policyAcknowledgments).values(caAckInserts);

    // ── Compliance Trainings catalog (5) ──
    const caTrainingSeed = [
      { title: 'Anti-Harassment & POSH', category: 'harassment', duration: 45 },
      { title: 'Data Privacy & GDPR Fundamentals', category: 'data-privacy', duration: 60 },
      { title: 'Workplace Safety Essentials', category: 'safety', duration: 30 },
      { title: 'Anti-Bribery & Corruption', category: 'anti-bribery', duration: 40 },
      { title: 'Information Security Awareness', category: 'other', duration: 50 },
    ];
    const caTrainings = await db
      .insert(complianceTrainings)
      .values(
        caTrainingSeed.map((t) => ({
          orgId: org.id,
          title: t.title,
          category: t.category,
          description: `Mandatory ${t.title} training for all employees. Renews annually.`,
          durationMinutes: t.duration,
          passingScore: 80,
          validityMonths: 12,
          isMandatory: true,
          deadlineDays: 30,
        })),
      )
      .returning();

    // ── Training Completions — every employee × 3 core trainings (varied status) ──
    const caCoreTrainings = caTrainings.slice(0, 3);
    const caTcInserts: Array<typeof trainingCompletions.$inferInsert> = [];
    empUsers.forEach((u, idx) => {
      caCoreTrainings.forEach((t, tIdx) => {
        const bucket = (idx + tIdx) % 5;
        let status: string;
        let completedAt: Date | null = null;
        let score: number | null = null;
        let passed: boolean | null = null;
        let renewalDue: Date | null = null;
        const assignedAt = anchorPlusDays(-100 + idx);
        let dueDate: Date | null = anchorPlusDays(-70 + idx);
        if (bucket === 0) {
          status = 'overdue';
          dueDate = anchorPlusDays(-10 - tIdx);
        } else if (bucket === 1) {
          status = 'in_progress';
          dueDate = anchorPlusDays(15 + tIdx);
        } else if (bucket === 2) {
          status = 'assigned';
          dueDate = anchorPlusDays(20 + tIdx);
        } else {
          status = 'completed';
          completedAt = anchorPlusDays(-40 + idx);
          score = 80 + ((idx + tIdx) % 20);
          passed = true;
          renewalDue = anchorPlusDays(320 + idx);
        }
        caTcInserts.push({ orgId: org.id, trainingId: t.id, employeeId: u.id, assignedAt, dueDate, completedAt, score, passed, renewalDue, status });
      });
    });
    if (caTcInserts.length) await db.insert(trainingCompletions).values(caTcInserts);

    // ── Compliance Checklists (regulatory) — 6, mixed statuses + due dates ──
    await db.insert(complianceChecklists).values([
      { orgId: org.id, title: 'Monthly PF Filing (EPFO)', jurisdiction: 'india', category: 'statutory-filing', description: 'Provident Fund monthly ECR filing.', dueDate: anchorPlusDays(10), frequency: 'monthly', status: 'pending', assignedTo: adminUser.id },
      { orgId: org.id, title: 'Monthly ESI Return', jurisdiction: 'india', category: 'statutory-filing', description: 'Employee State Insurance monthly contribution return.', dueDate: anchorPlusDays(5), frequency: 'monthly', status: 'in_progress', assignedTo: adminUser.id },
      { orgId: org.id, title: 'Professional Tax Payment', jurisdiction: 'india', category: 'statutory-filing', description: 'State professional tax monthly remittance.', dueDate: anchorPlusDays(-3), frequency: 'monthly', status: 'overdue', assignedTo: adminUser.id },
      { orgId: org.id, title: 'Annual POSH Committee Report', jurisdiction: 'india', category: 'labor-law', description: 'Annual report of the Internal Complaints Committee under POSH Act.', dueDate: anchorPlusDays(45), frequency: 'annual', status: 'pending', assignedTo: adminUser.id },
      { orgId: org.id, title: 'GDPR Data Processing Audit', jurisdiction: 'eu', category: 'data-protection', description: 'Annual review of data processing activities and records.', dueDate: anchorPlusDays(-40), frequency: 'annual', status: 'completed', assignedTo: adminUser.id, completedAt: anchorPlusDays(-42), evidenceNotes: 'Audit completed; ROPA updated and signed off.' },
      { orgId: org.id, title: 'Fire Safety & Evacuation Drill', jurisdiction: 'india', category: 'safety', description: 'Quarterly fire safety inspection and evacuation drill.', dueDate: anchorPlusDays(20), frequency: 'quarterly', status: 'pending', assignedTo: managerUser.id },
    ]);

    // ── Document Retention configs (audit_trail_configs) — 6 entities ──
    await db.insert(auditTrailConfigs).values([
      { orgId: org.id, entity: 'Employee Records', retentionDays: 2555, isTracked: true, trackCreate: true, trackUpdate: true, trackDelete: true, trackView: false, trackExport: true },
      { orgId: org.id, entity: 'Payroll Records', retentionDays: 2920, isTracked: true, trackCreate: true, trackUpdate: true, trackDelete: true, trackView: true, trackExport: true },
      { orgId: org.id, entity: 'Leave Records', retentionDays: 1095, isTracked: true, trackCreate: true, trackUpdate: true, trackDelete: true, trackView: false, trackExport: false },
      { orgId: org.id, entity: 'Attendance Records', retentionDays: 730, isTracked: true, trackCreate: true, trackUpdate: true, trackDelete: false, trackView: false, trackExport: false },
      { orgId: org.id, entity: 'Tax Documents', retentionDays: 2920, isTracked: true, trackCreate: true, trackUpdate: true, trackDelete: true, trackView: true, trackExport: true },
      { orgId: org.id, entity: 'Recruitment Records', retentionDays: 365, isTracked: true, trackCreate: true, trackUpdate: false, trackDelete: true, trackView: false, trackExport: true },
    ]);

    // ── Ethics / Whistleblower complaints (5; one data-breach feeds the GDPR breach panel) ──
    await db.insert(ethicsComplaints).values([
      { orgId: org.id, referenceCode: 'WB-2026-0001', category: 'harassment', description: 'Reported inappropriate comments by a team lead during sprint meetings.', incidentDate: anchorPlusDays(-30), location: 'Bengaluru HQ', status: 'in_progress', investigatorId: adminUser.id, investigationNotes: 'Initial statements collected from reporter and two witnesses.', isAnonymous: true },
      { orgId: org.id, referenceCode: 'WB-2026-0002', category: 'fraud', description: 'Suspected duplicate expense reimbursement claims submitted last quarter.', incidentDate: anchorPlusDays(-55), location: 'Finance Dept', status: 'findings', investigatorId: adminUser.id, investigationNotes: 'Expense logs under review; finance audit requested.', isAnonymous: false, reporterEmployeeId: managerUser.id },
      { orgId: org.id, referenceCode: 'WB-2026-0003', category: 'safety', description: 'Emergency exit on the 3rd floor was blocked by storage boxes.', incidentDate: anchorPlusDays(-12), location: 'Bengaluru HQ — 3rd Floor', status: 'closed', investigatorId: managerUser.id, investigationNotes: 'Obstruction cleared; facilities notified.', outcome: 'Resolved — exit cleared and monthly inspection scheduled.', closedAt: anchorPlusDays(-5), isAnonymous: true },
      { orgId: org.id, referenceCode: 'WB-2026-0004', category: 'discrimination', description: 'Concern raised about biased shift allocation.', incidentDate: anchorPlusDays(-20), location: 'Operations', status: 'received', isAnonymous: true },
      { orgId: org.id, referenceCode: 'WB-2026-0005', category: 'data-breach', description: 'A laptop containing employee records was reported lost while travelling.', incidentDate: anchorPlusDays(-8), location: 'Remote', status: 'in_progress', investigatorId: adminUser.id, investigationNotes: JSON.stringify({ title: 'Lost device with PII', severity: 'high', affectedRecords: 45, reportedBy: 'IT Security' }), isAnonymous: false, reporterEmployeeId: empUsers[0].id },
    ]);

    // ── DSAR requests (stored as audit_logs with action='data_request'; detail in newValue) ──
    const caDsarSeed = [
      { emp: 0, type: 'access', status: 'completed', req: -40, due: -10, done: -15 as number | null },
      { emp: 3, type: 'erasure', status: 'in_progress', req: -10, due: 20, done: null as number | null },
      { emp: 7, type: 'portability', status: 'pending', req: -3, due: 27, done: null as number | null },
      { emp: 11, type: 'rectification', status: 'pending', req: -1, due: 29, done: null as number | null },
    ];
    await db.insert(auditLogs).values(
      caDsarSeed.map((d) => {
        const emp = empUsers[d.emp];
        return {
          orgId: org.id,
          userId: adminUser.id,
          action: 'data_request',
          entity: 'employee',
          entityId: emp.id,
          description: `DSAR (${d.type}) request from ${emp.firstName} ${emp.lastName}`,
          newValue: {
            employeeName: `${emp.firstName} ${emp.lastName}`,
            requestType: d.type,
            status: d.status,
            requestDate: fmt(anchorPlusDays(d.req)),
            dueDate: fmt(anchorPlusDays(d.due)),
            completedDate: d.done != null ? fmt(anchorPlusDays(d.done)) : undefined,
          },
        };
      }),
    );

    console.log('  ✓ compliance-audit: 5 policies + acks, 5 trainings + 60 completions, 6 checklists, 6 retention configs, 5 ethics, 4 DSAR');

    // ── People-Analytics: Custom KPIs, Saved Reports, Metric Snapshots ───────
    // (a) Custom KPI definitions — note targetValue/thresholdLow/High are INTEGER cols
    await db.insert(analyticsKpis).values([
      { orgId: org.id, name: 'Revenue per Employee', formula: 'annual_revenue / headcount', description: 'Total annual revenue divided by current headcount.', unit: 'currency', targetValue: 5000000, thresholdLow: 3000000, thresholdHigh: 7000000, alertEnabled: true, scope: 'org' },
      { orgId: org.id, name: 'Attrition Rate', formula: '(leavers / avg_headcount) * 100', description: 'Voluntary + involuntary exits as a percentage of average headcount.', unit: 'percentage', targetValue: 8, thresholdLow: 0, thresholdHigh: 12, alertEnabled: true, scope: 'org' },
      { orgId: org.id, name: 'Average Tenure', formula: 'sum(tenure_months) / headcount', description: 'Mean employee tenure across the organization.', unit: 'number', targetValue: 36, thresholdLow: 18, thresholdHigh: 60, alertEnabled: false, scope: 'org' },
      { orgId: org.id, name: 'Cost per Hire', formula: 'total_recruiting_cost / hires', description: 'Total recruiting spend divided by number of hires.', unit: 'currency', targetValue: 120000, thresholdLow: 50000, thresholdHigh: 200000, alertEnabled: false, scope: 'org' },
      { orgId: org.id, name: 'Training Hours per Employee', formula: 'total_training_hours / headcount', description: 'Average L&D hours completed per employee per year.', unit: 'number', targetValue: 40, thresholdLow: 20, thresholdHigh: 80, alertEnabled: false, scope: 'org' },
    ]);

    // (b) Saved reports — sourceModules & selectedFields are NOT-NULL jsonb; createdBy NOT-NULL uuid
    await db.insert(analyticsReports).values([
      { orgId: org.id, name: 'Monthly Headcount Report', description: 'Headcount trend by department, refreshed monthly.', reportType: 'line', sourceModules: ['core-hr', 'workforce-planning'], selectedFields: { 'core-hr': ['department', 'headcount'] }, filters: { dateRange: 'last_12_months' }, schedule: { frequency: 'monthly', deliveryEmail: 'hr@acme.com', format: 'pdf' }, isShared: true, createdBy: adminUser.id },
      { orgId: org.id, name: 'Attrition by Department', description: 'Voluntary vs involuntary attrition split per department.', reportType: 'bar', sourceModules: ['core-hr', 'offboarding-offboarding'], selectedFields: { 'core-hr': ['department', 'exit_type'] }, filters: { dateRange: 'ytd' }, schedule: null, isShared: true, createdBy: adminUser.id },
      { orgId: org.id, name: 'Leave Utilization Summary', description: 'Leave days taken by type across the org.', reportType: 'pie', sourceModules: ['leave-management'], selectedFields: { 'leave-management': ['leave_type', 'days'] }, filters: null, schedule: { frequency: 'weekly', deliveryEmail: 'hr@acme.com', format: 'csv' }, isShared: false, createdBy: adminUser.id },
      { orgId: org.id, name: 'Attendance vs Org Average', description: 'Team attendance rate benchmarked against org average.', reportType: 'table', sourceModules: ['attendance'], selectedFields: { attendance: ['employee', 'attendance_rate'] }, filters: { department: 'all' }, schedule: null, isShared: false, createdBy: adminUser.id },
    ]);

    // (c) Metric snapshots — powers workforce-analytics headcount & attrition trend charts (12 months each)
    const analyticsSnapshotRows: { orgId: string; snapshotDate: string; metricKey: string; metricValue: number; department: string | null }[] = [];
    for (let m = 11; m >= 0; m--) {
      const snapDate = fmt(anchorPlusDays(-30 * m));
      analyticsSnapshotRows.push({ orgId: org.id, snapshotDate: snapDate, metricKey: 'headcount', metricValue: 16 + (11 - m), department: null });
      analyticsSnapshotRows.push({ orgId: org.id, snapshotDate: snapDate, metricKey: 'attrition_rate', metricValue: 6 + ((11 - m) % 4), department: null });
    }
    await db.insert(analyticsSnapshots).values(analyticsSnapshotRows);

    console.log('  ✓ people-analytics: 5 custom KPIs, 4 saved reports, 24 metric snapshots');

    // ── Demo Company (demo-company module) ──────────────────────────────────────
    await db
      .insert(demoOrgs)
      .values([
        {
          orgId: org.id,
          sandboxName: 'Acme Corp Demo',
          industryTemplate: 'it-services',
          employeeCount: 25,
          status: 'active',
          lastResetAt: anchorPlusDays(-7),
          seededModules: ['core-hr', 'attendance', 'leave', 'payroll', 'performance', 'expense', 'learning'],
        },
        {
          orgId: org.id,
          sandboxName: 'Globex Manufacturing Demo',
          industryTemplate: 'manufacturing',
          employeeCount: 50,
          status: 'active',
          lastResetAt: anchorPlusDays(-2),
          seededModules: ['core-hr', 'attendance', 'leave'],
        },
      ]);

    const buildDemoStep = (
      order: number,
      title: string,
      tooltipText: string,
      description: string,
      targetSelector: string,
      iconKey: string,
    ) => ({ order, title, tooltipText, description, targetSelector, iconKey });

    await db.insert(demoTours).values([
      {
        orgId: org.id,
        tourName: 'New Employee Quick Start',
        targetModule: 'Core HR',
        assignedPersona: 'all',
        isPublished: true,
        completionCount: 18,
        steps: [
          buildDemoStep(1, 'Mark Your Attendance', 'Clock in from the attendance widget to start your day.', 'Head to Time & Attendance and clock in. Your hours are tracked automatically.', '#attendance-clock-in', 'attendance'),
          buildDemoStep(2, 'Apply for Leave', 'Submit a leave request and watch it route for approval.', 'Open Leave Management, pick dates and a leave type, then submit for manager approval.', '#leave-apply-btn', 'leave'),
          buildDemoStep(3, 'View Your Payslip', 'Download your latest payslip with a full breakdown.', 'Navigate to Payroll Processing to view earnings, deductions, and net pay.', '#payslip-download', 'payslip'),
          buildDemoStep(4, 'Submit a Timesheet', 'Log work against projects and submit for the week.', 'Use Daily Work Logging to record project hours and submit your weekly timesheet.', '#timesheet-submit', 'timesheet'),
          buildDemoStep(5, 'Complete a Course', 'Enroll in an assigned course and earn a certificate.', 'Browse Learning & Development, enroll in a course, and complete the modules.', '#course-enroll', 'course'),
        ],
      },
      {
        orgId: org.id,
        tourName: 'Manager Approvals Walkthrough',
        targetModule: 'Leave Management',
        assignedPersona: 'manager',
        isPublished: true,
        completionCount: 9,
        steps: [
          buildDemoStep(1, 'Review Pending Leave Requests', 'See all leave requests awaiting your decision.', 'Open the Leave Management manager view to see pending requests from your team.', '#manager-leave-pending', 'leave'),
          buildDemoStep(2, 'Approve a Timesheet', 'Validate and approve submitted team timesheets.', 'In Daily Work Logging, review submitted timesheets and approve or send back for edits.', '#manager-timesheet-approve', 'timesheet'),
          buildDemoStep(3, 'Run a Team Report', 'Generate a headcount or attendance report instantly.', 'Use Sample Reports to export team headcount, leave, and attendance summaries.', '#manager-reports', 'attendance'),
        ],
      },
      {
        orgId: org.id,
        tourName: 'Employee Self-Service Tour',
        targetModule: 'Platform & Experience',
        assignedPersona: 'employee',
        isPublished: true,
        completionCount: 14,
        steps: [
          buildDemoStep(1, 'Update Your Profile', 'Keep your personal details current.', 'Go to Core HR self-service to update contact info and emergency contacts.', '#profile-edit', 'attendance'),
          buildDemoStep(2, 'Check Leave Balance', 'See how many leave days you have left.', 'Open Leave Management to view your remaining balance by leave type.', '#leave-balance', 'leave'),
          buildDemoStep(3, 'Download a Payslip', 'Access any month payslip on demand.', 'Visit Payroll Processing and download the payslip for any pay period.', '#payslip-history', 'payslip'),
        ],
      },
      {
        orgId: org.id,
        tourName: 'Admin Configuration Basics (Draft)',
        targetModule: 'Cold Start Setup',
        assignedPersona: 'admin',
        isPublished: false,
        completionCount: 0,
        steps: [
          buildDemoStep(1, 'Activate a Module', 'Turn on the modules your org needs.', 'From the module registry, activate modules and complete their setup steps.', '#module-activate', 'attendance'),
          buildDemoStep(2, 'Invite Your Team', 'Send invitations to onboard employees.', 'Use Cold Start Setup to bulk-invite employees by email.', '#invite-employees', 'timesheet'),
        ],
      },
    ]);

    const demoSessionPersonas = ['admin', 'manager', 'employee'] as const;
    const demoSessionModulePool = [
      'core-hr', 'attendance', 'leave-management', 'payroll-processing',
      'performance-growth', 'expense-management', 'learning-development', 'talent-acquisition',
    ];
    const demoSessionRows = Array.from({ length: 24 }).map((_, i) => {
      const persona = demoSessionPersonas[i % demoSessionPersonas.length];
      const startedAt = anchorPlusDays(-(i % 28) - 1);
      const durationSeconds = 300 + ((i * 137) % 1500); // deterministic 5–30 min
      const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      const visitedCount = 2 + (i % 5);
      const modulesVisited = demoSessionModulePool.slice(i % 3, (i % 3) + visitedCount);
      return {
        orgId: org.id,
        sessionId: `demo-sess-${String(i + 1).padStart(3, '0')}`,
        persona,
        startedAt,
        endedAt,
        durationSeconds,
        modulesVisited,
        converted: i % 4 === 0, // deterministic 25% conversion
      };
    });
    await db.insert(demoSessions).values(demoSessionRows);

    console.log('  ✓ demo-company: 2 demo orgs, 4 tours (3 published), 24 demo sessions');

    // ── Platform & Experience (Demo-Readiness) ──────────────────────────────
    // Notification templates (admin → Notification Management)
    await db.insert(notificationTemplates).values([
      { orgId: org.id, name: 'Leave Approved', eventType: 'leave_approved', channel: 'in_app', subject: 'Your leave request was approved', bodyTemplate: 'Hi {{employeeName}}, your leave from {{fromDate}} to {{toDate}} has been approved.', variables: ['employeeName', 'fromDate', 'toDate'], isEnabled: true, createdBy: adminUser.id },
      { orgId: org.id, name: 'Leave Rejected', eventType: 'leave_rejected', channel: 'in_app', subject: 'Your leave request was rejected', bodyTemplate: 'Hi {{employeeName}}, your leave request has been rejected. Reason: {{reason}}.', variables: ['employeeName', 'reason'], isEnabled: true, createdBy: adminUser.id },
      { orgId: org.id, name: 'Payslip Available', eventType: 'payslip_generated', channel: 'email', subject: 'Your payslip for {{month}} is ready', bodyTemplate: 'Hi {{employeeName}}, your payslip for {{month}} is now available to download.', variables: ['employeeName', 'month'], isEnabled: true, createdBy: adminUser.id },
      { orgId: org.id, name: 'Timesheet Reminder', eventType: 'timesheet_due', channel: 'push', subject: 'Submit your timesheet', bodyTemplate: 'Hi {{employeeName}}, please submit your timesheet for the week ending {{weekEnding}}.', variables: ['employeeName', 'weekEnding'], isEnabled: false, createdBy: adminUser.id },
      { orgId: org.id, name: 'Onboarding Welcome', eventType: 'onboarding_started', channel: 'email', subject: 'Welcome to Acme Corp!', bodyTemplate: 'Welcome aboard, {{employeeName}}! Your onboarding journey starts now.', variables: ['employeeName'], isEnabled: true, createdBy: adminUser.id },
    ]);

    // Per-employee notifications (employee → Notification Center; feeds admin analytics)
    const notifTemplatesData = [
      { type: 'success', moduleId: 'leave-management', title: 'Leave Approved', message: 'Your leave request has been approved.' },
      { type: 'info', moduleId: 'payroll-processing', title: 'Payslip Available', message: 'Your latest payslip is ready to download.' },
      { type: 'warning', moduleId: 'attendance', title: 'Missing Timesheet', message: 'You have not submitted your timesheet for this week.' },
      { type: 'info', moduleId: 'performance-growth', title: 'Review Scheduled', message: 'Your quarterly performance review has been scheduled.' },
      { type: 'success', moduleId: 'learning-development', title: 'Course Completed', message: 'Congratulations on completing your assigned course.' },
    ];
    const empNotifInserts = empUsers.flatMap((u, i) =>
      notifTemplatesData.map((t, j) => ({
        orgId: org.id,
        userId: u.id,
        type: t.type,
        channel: 'in_app',
        title: t.title,
        message: t.message,
        moduleId: t.moduleId,
        referenceType: 'system',
        isRead: (i + j) % 3 === 0,
        readAt: (i + j) % 3 === 0 ? anchorPlusDays(-2) : null,
        sentAt: anchorPlusDays(-7 + j),
        createdAt: anchorPlusDays(-7 + j),
      })),
    );
    await db.insert(notifications).values(empNotifInserts);

    // Team announcements (manager → Team Notifications) — one notification per recipient,
    // grouped by title+sentAt. referenceType/referenceId let the manager list them.
    const announcementDefs = [
      { title: 'Team Standup Moved to 10 AM', message: 'Starting next week our daily standup moves to 10:00 AM. Please adjust your calendars.', type: 'info', sentAt: anchorPlusDays(-5) },
      { title: 'Q3 Goals Finalized', message: 'Our Q3 team goals are now finalized. Review them in the Performance module before Friday.', type: 'success', sentAt: anchorPlusDays(-3) },
      { title: 'Office Closed for Maintenance', message: 'The office will be closed this Saturday for scheduled maintenance. Work from home that day.', type: 'warning', sentAt: anchorPlusDays(-1) },
    ];
    const announcementRecipients = empUsers.slice(0, 6); // sample of the manager's team
    const announcementInserts = announcementDefs.flatMap((a, ai) =>
      announcementRecipients.map((u, ri) => ({
        orgId: org.id,
        userId: u.id,
        type: a.type,
        channel: 'in_app',
        title: a.title,
        message: a.message,
        moduleId: 'platform-experience',
        referenceId: managerUser.id,
        referenceType: 'team_announcement',
        isRead: (ai + ri) % 2 === 0,
        readAt: (ai + ri) % 2 === 0 ? anchorPlusDays(0) : null,
        sentAt: a.sentAt,
        createdAt: a.sentAt,
      })),
    );
    await db.insert(notifications).values(announcementInserts);

    // Custom dashboards + widgets (admin → Platform Customization; manager → Custom Dashboards)
    const dashboardInserts = await db.insert(customDashboards).values([
      { orgId: org.id, name: 'HR Overview', description: 'Org-wide headcount, attrition, and hiring snapshot.', createdById: adminUser.id, isDefault: true, isShared: true, layout: { columns: 12 } },
      { orgId: org.id, name: 'Attendance & Leave', description: 'Daily attendance and pending leave at a glance.', createdById: adminUser.id, isDefault: false, isShared: false, layout: { columns: 12 } },
      { orgId: org.id, name: 'My Team Performance', description: 'Team goals, reviews, and recognition.', createdById: managerUser.id, isDefault: true, isShared: false, layout: { columns: 12 } },
      { orgId: org.id, name: 'Team Attendance', description: 'Team attendance and timesheet status.', createdById: managerUser.id, isDefault: false, isShared: true, layout: { columns: 12 } },
    ]).returning();

    const widgetInserts = dashboardInserts.flatMap((d) => [
      { orgId: org.id, dashboardId: d.id, widgetType: 'kpi', title: 'Total Headcount', config: { metric: 'headcount' }, position: { x: 0, y: 0 }, size: { w: 3, h: 2 } },
      { orgId: org.id, dashboardId: d.id, widgetType: 'chart', title: 'Trend (6 months)', config: { metric: 'trend', range: '6m' }, position: { x: 3, y: 0 }, size: { w: 6, h: 4 } },
      { orgId: org.id, dashboardId: d.id, widgetType: 'list', title: 'Recent Activity', config: { source: 'activity' }, position: { x: 9, y: 0 }, size: { w: 3, h: 4 } },
    ]);
    await db.insert(dashboardWidgets).values(widgetInserts);

    // Bookmarks (employee → Search & Navigation; manager quick-actions recent items)
    const bookmarkDefs = [
      { title: 'My Leave Balance', moduleId: 'leave-management', path: '/dashboard/modules/leave-management', icon: 'calendar' },
      { title: 'My Payslips', moduleId: 'payroll-processing', path: '/dashboard/modules/payroll-processing', icon: 'file-text' },
      { title: 'Employee Directory', moduleId: 'core-hr', path: '/dashboard/modules/core-hr', icon: 'users' },
      { title: 'My Goals', moduleId: 'performance-growth', path: '/dashboard/modules/performance-growth', icon: 'target' },
    ];
    const bookmarkInserts = [...empUsers, managerUser].flatMap((u) =>
      bookmarkDefs.map((b, j) => ({
        orgId: org.id,
        userId: u.id,
        title: b.title,
        moduleId: b.moduleId,
        path: b.path,
        icon: b.icon,
        sortOrder: j + 1,
      })),
    );
    await db.insert(bookmarks).values(bookmarkInserts);
    console.log(`  ✓ platform-experience: 5 templates, ${empNotifInserts.length} notifications, ${announcementDefs.length} announcements, ${dashboardInserts.length} dashboards + ${widgetInserts.length} widgets, ${bookmarkInserts.length} bookmarks`);

    // ── integrations-api (Demo-Readiness) ──────────────────────────────────────
    const connectorSeed = [
      { connectorKey: 'slack', connectorName: 'Slack', category: 'communication', description: 'Team messaging, alerts & approval notifications', isEnabled: true, isAuthenticated: true, authType: 'oauth', healthStatus: 'healthy', lastSyncOffset: -1 as number | null, usageCount: 4820, errorMessage: null as string | null },
      { connectorKey: 'google-workspace', connectorName: 'Google Workspace', category: 'hrms', description: 'Directory, calendar & email sync', isEnabled: true, isAuthenticated: true, authType: 'oauth', healthStatus: 'healthy', lastSyncOffset: -1 as number | null, usageCount: 9120, errorMessage: null as string | null },
      { connectorKey: 'quickbooks', connectorName: 'QuickBooks', category: 'payroll', description: 'Accounting & payroll ledger sync', isEnabled: true, isAuthenticated: true, authType: 'oauth', healthStatus: 'healthy', lastSyncOffset: -1 as number | null, usageCount: 2310, errorMessage: null as string | null },
      { connectorKey: 'zoom', connectorName: 'Zoom', category: 'communication', description: 'Video conferencing for interviews & 1:1s', isEnabled: true, isAuthenticated: true, authType: 'oauth', healthStatus: 'healthy', lastSyncOffset: -2 as number | null, usageCount: 760, errorMessage: null as string | null },
      { connectorKey: 'sap-erp', connectorName: 'SAP ERP', category: 'erp', description: 'Enterprise resource planning data exchange', isEnabled: true, isAuthenticated: true, authType: 'api_key', healthStatus: 'degraded', lastSyncOffset: -2 as number | null, usageCount: 1540, errorMessage: 'Slow response times detected on upstream API' as string | null },
      { connectorKey: 'jira', connectorName: 'Jira', category: 'hrms', description: 'Project tracking & work-log integration', isEnabled: true, isAuthenticated: false, authType: 'oauth', healthStatus: 'error', lastSyncOffset: -4 as number | null, usageCount: 410, errorMessage: 'OAuth token expired — reconnection required' as string | null },
      { connectorKey: 'workday', connectorName: 'Workday HRIS', category: 'hrms', description: 'External HRIS employee master sync', isEnabled: false, isAuthenticated: false, authType: 'api_key', healthStatus: 'unknown', lastSyncOffset: null as number | null, usageCount: 0, errorMessage: null as string | null },
    ];
    const insertedConnectors = await db
      .insert(integrationConnectors)
      .values(
        connectorSeed.map((c) => ({
          orgId: org.id,
          connectorKey: c.connectorKey,
          connectorName: c.connectorName,
          category: c.category,
          description: c.description,
          isEnabled: c.isEnabled,
          isAuthenticated: c.isAuthenticated,
          authType: c.authType,
          healthStatus: c.healthStatus,
          healthCheckedAt: c.lastSyncOffset !== null ? anchorPlusDays(c.lastSyncOffset) : null,
          lastSyncAt: c.lastSyncOffset !== null ? anchorPlusDays(c.lastSyncOffset) : null,
          errorMessage: c.errorMessage,
          usageCount: c.usageCount,
        })),
      )
      .returning();

    const connByKey: Record<string, string> = {};
    for (const row of insertedConnectors) connByKey[row.connectorKey] = row.id;

    await db.insert(integrationLogs).values([
      { orgId: org.id, connectorId: connByKey['sap-erp'], eventType: 'sync', status: 'failure', message: 'Upstream API responded in 8.2s (threshold 3s)', durationMs: 8200, createdAt: anchorPlusDays(-2) },
      { orgId: org.id, connectorId: connByKey['jira'], eventType: 'auth', status: 'failure', message: 'OAuth token expired — reconnection required', durationMs: 120, createdAt: anchorPlusDays(-4) },
      { orgId: org.id, connectorId: connByKey['jira'], eventType: 'sync', status: 'failure', message: 'Authentication required before sync', durationMs: 95, createdAt: anchorPlusDays(-3) },
      { orgId: org.id, connectorId: connByKey['slack'], eventType: 'sync', status: 'success', message: 'Delivered 42 notifications', durationMs: 340, createdAt: anchorPlusDays(-1) },
      { orgId: org.id, connectorId: connByKey['google-workspace'], eventType: 'sync', status: 'success', message: 'Synced 20 directory records', durationMs: 510, createdAt: anchorPlusDays(-1) },
    ]);

    await db.insert(apiKeys).values([
      { orgId: org.id, name: 'Production Integration', keyPrefix: 'sk_live_a1', keyHash: 'seed_hash_prod_1', scopes: ['read:employees', 'read:leave'], rateLimitPerMin: 1000, ipWhitelist: ['203.0.113.10'], lastUsedAt: anchorPlusDays(-1), usageCount: 142300, rotationReminderDays: 90, expiresAt: anchorPlusDays(200), createdBy: adminUser.id, status: 'active' },
      { orgId: org.id, name: 'Payroll Sync Bot', keyPrefix: 'sk_live_b2', keyHash: 'seed_hash_payroll_2', scopes: ['read:payroll', 'write:attendance'], rateLimitPerMin: 500, ipWhitelist: null, lastUsedAt: anchorPlusDays(-2), usageCount: 85700, rotationReminderDays: 90, expiresAt: anchorPlusDays(120), createdBy: adminUser.id, status: 'active' },
      { orgId: org.id, name: 'Reporting Dashboard', keyPrefix: 'sk_live_c3', keyHash: 'seed_hash_report_3', scopes: ['read:employees', 'read:payroll'], rateLimitPerMin: 200, ipWhitelist: null, lastUsedAt: anchorPlusDays(-9), usageCount: 42800, rotationReminderDays: 90, expiresAt: anchorPlusDays(60), createdBy: adminUser.id, status: 'active' },
      { orgId: org.id, name: 'Legacy API Client', keyPrefix: 'sk_live_d4', keyHash: 'seed_hash_legacy_4', scopes: ['read:employees'], rateLimitPerMin: 100, ipWhitelist: null, lastUsedAt: anchorPlusDays(-120), usageCount: 13771, rotationReminderDays: 90, expiresAt: anchorPlusDays(-30), createdBy: adminUser.id, revokedAt: anchorPlusDays(-30), revokedBy: adminUser.id, status: 'revoked' },
    ]);

    await db.insert(webhooks).values([
      { orgId: org.id, name: 'Employee Created Notifier', endpointUrl: 'https://hooks.slack.com/services/T00/B00/abc123', eventType: 'employee.created', secret: 'whsec_seed_1', payloadFormat: 'json', isEnabled: true, retryPolicy: { maxRetries: 3, backoffSeconds: [30, 60, 300] }, lastDeliveryAt: anchorPlusDays(-1), lastDeliveryStatus: 'success', successCount: 142, failureCount: 3 },
      { orgId: org.id, name: 'Leave Approval Alert', endpointUrl: 'https://api.zapier.com/hooks/catch/123456/leave', eventType: 'leave.approved', secret: 'whsec_seed_2', payloadFormat: 'json', isEnabled: true, retryPolicy: { maxRetries: 3, backoffSeconds: [30, 60, 300] }, lastDeliveryAt: anchorPlusDays(-1), lastDeliveryStatus: 'success', successCount: 87, failureCount: 0 },
      { orgId: org.id, name: 'Payroll Processed Hook', endpointUrl: 'https://quickbooks.acme.com/webhook/payroll', eventType: 'payroll.processed', secret: 'whsec_seed_3', payloadFormat: 'form', isEnabled: false, retryPolicy: { maxRetries: 3, backoffSeconds: [30, 60, 300] }, lastDeliveryAt: anchorPlusDays(-10), lastDeliveryStatus: 'failure', successCount: 12, failureCount: 1 },
      { orgId: org.id, name: 'Attendance Sync Trigger', endpointUrl: 'https://erp.acme.com/api/attendance-hook', eventType: 'attendance.synced', secret: 'whsec_seed_4', payloadFormat: 'json', isEnabled: true, retryPolicy: { maxRetries: 3, backoffSeconds: [30, 60, 300] }, lastDeliveryAt: anchorPlusDays(-1), lastDeliveryStatus: 'success', successCount: 1240, failureCount: 5 },
    ]);

    await db.insert(oauthApps).values([
      { orgId: org.id, appName: 'HR Analytics Portal', clientId: 'client_abc123', clientSecretHash: 'seed_secret_hash_1', redirectUris: ['https://analytics.acme.com/callback'], scopes: ['read:employees', 'read:payroll'], description: 'Internal analytics dashboard', ownerEmail: 'dev@acme.com', isPublic: false, authorizedUserCount: 24, lastUsedAt: anchorPlusDays(-1), status: 'active' },
      { orgId: org.id, appName: 'Mobile App (iOS)', clientId: 'client_def456', clientSecretHash: 'seed_secret_hash_2', redirectUris: ['acmehr://oauth/callback'], scopes: ['read:employees', 'read:leave', 'write:attendance'], description: 'Employee self-service mobile app', ownerEmail: 'mobile@acme.com', isPublic: false, authorizedUserCount: 156, lastUsedAt: anchorPlusDays(-1), status: 'active' },
      { orgId: org.id, appName: 'Slack Bot Integration', clientId: 'client_ghi789', clientSecretHash: 'seed_secret_hash_3', redirectUris: ['https://slack.com/oauth/acme'], scopes: ['read:leave'], description: 'Slack leave-status bot', ownerEmail: 'ops@acme.com', isPublic: false, authorizedUserCount: 89, lastUsedAt: anchorPlusDays(-2), status: 'active' },
      { orgId: org.id, appName: 'Legacy Dashboard v1', clientId: 'client_jkl012', clientSecretHash: 'seed_secret_hash_4', redirectUris: ['https://old.acme.com/callback'], scopes: ['read:employees'], description: 'Deprecated reporting tool', ownerEmail: 'admin@acme.com', isPublic: false, authorizedUserCount: 0, lastUsedAt: anchorPlusDays(-180), status: 'revoked' },
    ]);

    await db.insert(dataSyncConfigs).values([
      { orgId: org.id, connectorId: connByKey['google-workspace'], syncName: 'Employee Directory Import', sourceType: 'connector', targetType: 'employees', frequency: 'daily', isEnabled: true, lastSyncAt: anchorPlusDays(-1), lastSyncStatus: 'success', lastSyncRecordCount: 20, nextSyncAt: anchorPlusDays(1) },
      { orgId: org.id, connectorId: null, syncName: 'Attendance API Sync', sourceType: 'api', targetType: 'attendance', frequency: 'hourly', isEnabled: true, lastSyncAt: anchorPlusDays(-1), lastSyncStatus: 'success', lastSyncRecordCount: 440, nextSyncAt: anchorPlusDays(1) },
      { orgId: org.id, connectorId: connByKey['quickbooks'], syncName: 'Payroll QuickBooks Sync', sourceType: 'connector', targetType: 'payroll', frequency: 'weekly', isEnabled: false, lastSyncAt: anchorPlusDays(-8), lastSyncStatus: 'failure', lastSyncRecordCount: 0, nextSyncAt: anchorPlusDays(-1), errorMessage: 'Connector disabled by admin' },
      { orgId: org.id, connectorId: null, syncName: 'Org Chart Excel Import', sourceType: 'excel', targetType: 'employees', frequency: 'manual', isEnabled: false, lastSyncAt: anchorPlusDays(-30), lastSyncStatus: 'success', lastSyncRecordCount: 20, nextSyncAt: null },
    ]);
    console.log('  ✓ integrations-api: 7 connectors (4 healthy/1 degraded/1 error/1 unknown), 5 logs, 4 API keys, 4 webhooks, 4 OAuth apps, 4 data-sync configs');

    // ═════════════════════════════════════════════════════════════════════════
    // DEMO-POLISH (Fix Sprint 3) — per-module gap fills.
    // NO faker calls in this section: fixed literals + anchorPlusDays/fmt only,
    // so the locked faker stream above stays byte-identical.
    // ═════════════════════════════════════════════════════════════════════════

    // ── Demo-polish: emp01 leave history + comp-off + manager delegations ────
    // (#51) 4 approved past leaves for emp01 so Insights has real history.
    await db.insert(leaveRequests).values([
      {
        orgId: org.id, employeeId: empUsers[0].id, leaveTypeId: ltCasual.id,
        fromDate: fmt(anchorPlusDays(-20)), toDate: fmt(anchorPlusDays(-19)), totalDays: '2',
        reason: 'Family function out of town.', status: 'approved',
        approvedBy: managerUser.id, approvedAt: anchorPlusDays(-22), approverComment: 'Approved',
      },
      {
        orgId: org.id, employeeId: empUsers[0].id, leaveTypeId: ltSick.id,
        fromDate: fmt(anchorPlusDays(-35)), toDate: fmt(anchorPlusDays(-35)), totalDays: '1',
        reason: 'Fever and rest advised by doctor.', status: 'approved',
        approvedBy: managerUser.id, approvedAt: anchorPlusDays(-36), approverComment: 'Approved — get well soon',
      },
      {
        orgId: org.id, employeeId: empUsers[0].id, leaveTypeId: ltEarned.id,
        fromDate: fmt(anchorPlusDays(-50)), toDate: fmt(anchorPlusDays(-49)), totalDays: '2',
        reason: 'Short trip with family.', status: 'approved',
        approvedBy: managerUser.id, approvedAt: anchorPlusDays(-52), approverComment: 'Approved',
      },
      {
        orgId: org.id, employeeId: empUsers[0].id, leaveTypeId: ltCasual.id,
        fromDate: fmt(anchorPlusDays(-65)), toDate: fmt(anchorPlusDays(-65)), totalDays: '1',
        reason: 'Personal errand — bank and registration work.', status: 'approved',
        approvedBy: managerUser.id, approvedAt: anchorPlusDays(-66), approverComment: 'Approved',
      },
    ]);

    // Keep emp01's balances coherent with the requests above (+ the seeded
    // pending CL request of 2 days): CL used 3 / pending 2, SL used 1, EL used 2.
    await db.update(leaveBalances)
      .set({ used: '3', pending: '2', available: '7' })
      .where(and(
        eq(leaveBalances.orgId, org.id), eq(leaveBalances.employeeId, empUsers[0].id),
        eq(leaveBalances.leaveTypeId, ltCasual.id), eq(leaveBalances.year, '2026'),
      ));
    await db.update(leaveBalances)
      .set({ used: '1', pending: '0', available: '11' })
      .where(and(
        eq(leaveBalances.orgId, org.id), eq(leaveBalances.employeeId, empUsers[0].id),
        eq(leaveBalances.leaveTypeId, ltSick.id), eq(leaveBalances.year, '2026'),
      ));
    await db.update(leaveBalances)
      .set({ used: '2', pending: '0', available: '13' })
      .where(and(
        eq(leaveBalances.orgId, org.id), eq(leaveBalances.employeeId, empUsers[0].id),
        eq(leaveBalances.leaveTypeId, ltEarned.id), eq(leaveBalances.year, '2026'),
      ));

    // (#50) 1 active comp-off + 1 expiring soon for emp01 ('active' = available).
    await db.insert(compOffRecords).values([
      {
        orgId: org.id, employeeId: empUsers[0].id, earnedDate: fmt(anchorPlusDays(-10)),
        reason: 'Weekend deployment support for the release.', workType: 'weekend',
        daysEarned: '1', daysUsed: '0', daysAvailable: '1',
        expiryDate: fmt(anchorPlusDays(50)), status: 'active',
        approvedBy: managerUser.id, approvedAt: anchorPlusDays(-8),
        metadata: { hoursWorked: 9 },
      },
      {
        orgId: org.id, employeeId: empUsers[0].id, earnedDate: fmt(anchorPlusDays(-78)),
        reason: 'Worked on public holiday for client go-live.', workType: 'holiday',
        daysEarned: '1', daysUsed: '0', daysAvailable: '1',
        expiryDate: fmt(anchorPlusDays(12)), status: 'active',
        approvedBy: managerUser.id, approvedAt: anchorPlusDays(-76),
        metadata: { hoursWorked: 8 },
      },
    ]);
    console.log('  ✓ Comp-off records (emp01 active + expiring soon): 2');

    // (#28) Leave delegations: Sarah → Vikram (active window) + one past/expired.
    await db.insert(leaveDelegations).values([
      {
        orgId: org.id, delegatorId: managerUser.id, delegateId: salesManagerUser.id,
        startDate: fmt(anchorPlusDays(-5)), endDate: fmt(anchorPlusDays(10)),
        delegationType: 'full', isActive: true, activatedAt: anchorPlusDays(-5),
        autoActivated: false, metadata: {},
      },
      {
        orgId: org.id, delegatorId: managerUser.id, delegateId: salesManagerUser.id,
        startDate: fmt(anchorPlusDays(-60)), endDate: fmt(anchorPlusDays(-45)),
        delegationType: 'partial', isActive: false, activatedAt: anchorPlusDays(-60),
        autoActivated: false, metadata: {},
      },
    ]);
    console.log('  ✓ Leave delegations: 2 (1 active, 1 expired)');
    console.log('  ✓ Leave history for emp01: 4 approved (+balances aligned)');

    // ── Demo-polish #11: Org-level goals (4) + goal templates (3) ─────────────
    // listOrgGoals queries category='organizational' AND isTemplate=false;
    // listGoalTemplates queries isTemplate=true.
    await db.insert(goals).values([
      { orgId: org.id, title: 'Grow ARR to ₹120 Cr', description: 'Company-wide revenue goal for FY2025-26 across all business lines.', category: 'organizational', framework: 'okr', weightage: '100', priority: 'high', startDate: fmt(anchorPlusDays(-60)), dueDate: fmt(anchorPlusDays(120)), status: 'on_track', progress: '58.00', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: false, isActive: true },
      { orgId: org.id, title: 'Achieve 95% customer retention', description: 'Reduce churn through proactive success programs and QBR coverage.', category: 'organizational', framework: 'okr', weightage: '100', priority: 'high', startDate: fmt(anchorPlusDays(-60)), dueDate: fmt(anchorPlusDays(180)), status: 'on_track', progress: '72.00', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: false, isActive: true },
      { orgId: org.id, title: 'Launch in 2 new markets', description: 'Open GTM motion in ANZ and MEA with local partnerships.', category: 'organizational', framework: 'okr', weightage: '100', priority: 'medium', startDate: fmt(anchorPlusDays(-60)), dueDate: fmt(anchorPlusDays(210)), status: 'at_risk', progress: '30.00', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: false, isActive: true },
      { orgId: org.id, title: 'Improve eNPS to +45', description: 'Org-wide engagement and culture initiative for FY2025-26.', category: 'organizational', framework: 'okr', weightage: '100', priority: 'medium', startDate: fmt(anchorPlusDays(-60)), dueDate: fmt(anchorPlusDays(150)), status: 'on_track', progress: '64.00', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: false, isActive: true },
      { orgId: org.id, title: 'Increase quarterly revenue contribution by 15%', description: 'Template for revenue-aligned individual goals.', category: 'business', framework: 'okr', measurementCriteria: 'Closed-won revenue vs target in CRM.', weightage: '100', priority: 'medium', status: 'active', progress: '0', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: true, templateRole: 'Sales', isActive: true },
      { orgId: org.id, title: 'Ship one production-grade system improvement per quarter', description: 'Template for engineering excellence goals.', category: 'technical', framework: 'smart', measurementCriteria: 'Shipped to production with monitoring and a rollback plan.', weightage: '100', priority: 'medium', status: 'active', progress: '0', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: true, templateRole: 'Engineering', isActive: true },
      { orgId: org.id, title: 'Mentor one junior teammate to independence', description: 'Template for leadership-track development goals.', category: 'leadership', framework: 'smart', measurementCriteria: 'Mentee delivers a feature end-to-end unassisted.', weightage: '100', priority: 'medium', status: 'active', progress: '0', currentValue: '0', successMetrics: [], createdBy: adminUser.id, isTemplate: true, templateRole: 'All', isActive: true },
    ]);
    console.log('  ✓ Org goals: 4, goal templates: 3');

    // ── Demo-polish #13: Calibration audit trail (6 audit_logs rows) ──────────
    // Must match CalibrationMgmtService.getCalibrationAuditTrail filter:
    // entity 'review_assignment' + action 'update', with { rating } in oldValue
    // and { rating, employeeName } in newValue.
    const fullName = (u: typeof empUsers[number]) => `${u.firstName} ${u.lastName ?? ''}`.trim();
    const calibrationAuditSeed = [
      { emp: empUsers[2], by: adminUser, from: 4, to: 3, note: 'aligned with Engineering peer-group distribution.' },
      { emp: empUsers[9], by: adminUser, from: 3, to: 4, note: 'strong H2 delivery vs peers.' },
      { emp: empUsers[1], by: adminUser, from: 5, to: 5, note: 'top-bucket justification documented.' },
      { emp: empUsers[4], by: managerUser, from: 2, to: 2, note: 'confirmed below expectations; PIP recommended.' },
      { emp: empUsers[0], by: managerUser, from: 4, to: 4, note: 'consistent with goal outcomes.' },
      { emp: empUsers[12], by: adminUser, from: 3, to: 3, note: 'meets expectations band.' },
    ];
    await db.insert(auditLogs).values(
      calibrationAuditSeed.map((c, i) => {
        const name = fullName(c.emp);
        const ts = anchorPlusDays(-2);
        ts.setUTCHours(9 + i, 30, 0, 0);
        return {
          orgId: org.id, userId: c.by.id, action: 'update', entity: 'review_assignment', entityId: null,
          oldValue: { rating: c.from }, newValue: { rating: c.to, employeeName: name },
          description: `Calibration: ${name} rating changed ${c.from} → ${c.to} — ${c.note}`,
          ipAddress: '10.0.1.21', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          createdAt: ts,
        };
      }),
    );
    console.log('  ✓ Calibration audit entries: 6');

    // ── Demo-polish #14: PIPs (2 development_plans rows, type 'pip') ──────────
    // empUsers[4] has finalRating 2.00 (active PIP — coherent); empUsers[9] recovered to 4.00 (completed).
    await db.insert(developmentPlans).values([
      {
        orgId: org.id, employeeId: empUsers[4].id, title: 'PIP — Enterprise Sales Delivery',
        description: '60-day plan to bring enterprise deal conversion back on track after a 2.0 annual rating.',
        type: 'pip',
        activities: [{ type: 'coaching', title: 'Weekly pipeline review with manager', status: 'in_progress' }],
        skills: [], certifications: [],
        pipMilestones: [
          { id: 'ms-1', title: 'Rebuild qualified pipeline to 3x quota', description: 'Minimum 12 qualified opportunities in CRM.', dueDate: fmt(anchorPlusDays(10)), status: 'completed' },
          { id: 'ms-2', title: 'Close 4 enterprise deals', description: 'At or above standard discount policy.', dueDate: fmt(anchorPlusDays(30)), status: 'pending' },
          { id: 'ms-3', title: 'Sustain 90% activity compliance', description: 'CRM hygiene and weekly call targets.', dueDate: fmt(anchorPlusDays(50)), status: 'pending' },
        ],
        status: 'active', progress: '35.00', startDate: fmt(anchorPlusDays(-10)), targetDate: fmt(anchorPlusDays(50)),
        metadata: { escalationRules: 'Missed milestone → review with HRBP; two missed milestones → escalate to department head.' },
        createdBy: managerUser.id, isActive: true,
      },
      {
        orgId: org.id, employeeId: empUsers[9].id, title: 'PIP — Partner Program Execution',
        description: 'Completed 60-day plan; performance recovered to a 4.0 rating.',
        type: 'pip',
        activities: [{ type: 'coaching', title: 'Bi-weekly coaching with sales lead', status: 'completed' }],
        skills: [], certifications: [],
        pipMilestones: [
          { id: 'ms-1', title: 'Relaunch partner outreach cadence', description: '10 partner touchpoints per week.', dueDate: fmt(anchorPlusDays(-80)), status: 'completed' },
          { id: 'ms-2', title: 'Sign 3 new referral partners', description: 'Signed agreements in place.', dueDate: fmt(anchorPlusDays(-60)), status: 'completed' },
        ],
        pipOutcome: 'improved', status: 'completed', progress: '100.00',
        startDate: fmt(anchorPlusDays(-120)), targetDate: fmt(anchorPlusDays(-60)), completedAt: anchorPlusDays(-58),
        metadata: { escalationRules: 'Missed milestone → review with HRBP.' },
        createdBy: salesManagerUser.id, isActive: true,
      },
    ]);
    console.log('  ✓ PIPs: 2');

    // ── Demo-polish #60: Feedback records (7) ─────────────────────────────────
    // 3 received by emp01, 1 given by emp01, 1 open request emp01 must fill
    // (content '' + requestedByUserId = pending), 2 public kudos-wall entries.
    await db.insert(feedbackRecords).values([
      { orgId: org.id, fromUserId: managerUser.id, toUserId: empUsers[0].id, type: 'constructive', category: 'communication', content: 'Great ownership on the billing API. Bring stakeholders along earlier — share design docs before the build starts.', isAnonymous: false, visibility: 'private', metadata: {}, isActive: true, createdAt: anchorPlusDays(-6) },
      { orgId: org.id, fromUserId: empUsers[1].id, toUserId: empUsers[0].id, type: 'appreciation', category: 'collaboration', content: 'Thanks for pairing on the search migration — you unblocked me twice this sprint.', isAnonymous: false, visibility: 'private', metadata: {}, isActive: true, createdAt: anchorPlusDays(-4) },
      { orgId: org.id, fromUserId: empUsers[2].id, toUserId: empUsers[0].id, type: 'recognition', category: 'problem_solving', content: 'The retry-queue fix you suggested cut our failed jobs to near zero. Brilliant call.', isAnonymous: false, visibility: 'private', metadata: {}, isActive: true, createdAt: anchorPlusDays(-2) },
      { orgId: org.id, fromUserId: empUsers[0].id, toUserId: empUsers[1].id, type: 'appreciation', category: 'work_quality', content: 'Your code reviews are consistently thorough and kind — I learn something every time.', isAnonymous: false, visibility: 'private', metadata: {}, isActive: true, createdAt: anchorPlusDays(-3) },
      { orgId: org.id, fromUserId: empUsers[0].id, toUserId: empUsers[1].id, type: 'general', category: null, content: '', isAnonymous: false, visibility: 'private', requestedByUserId: empUsers[1].id, metadata: { cycleName: 'Annual Review FY2025-26', dueDate: fmt(anchorPlusDays(7)) }, isActive: true, createdAt: anchorPlusDays(-1) },
      { orgId: org.id, fromUserId: managerUser.id, toUserId: empUsers[1].id, type: 'recognition', category: 'work_quality', content: 'Kudos for leading the search re-architecture spike — stellar work!', isAnonymous: false, visibility: 'public', metadata: {}, isActive: true, createdAt: anchorPlusDays(-5) },
      { orgId: org.id, fromUserId: salesManagerUser.id, toUserId: empUsers[8].id, type: 'recognition', category: 'initiative', content: 'Shout-out for landing the regional partner deal ahead of schedule!', isAnonymous: false, visibility: 'public', metadata: {}, isActive: true, createdAt: anchorPlusDays(-8) },
    ]);
    console.log('  ✓ Feedback records: 7 (3 received by emp01, 1 given, 1 open request, 2 kudos)');

    // ── Demo-polish: shift mix + regularizations + shift swaps (#24/#26/#48) ──

    /** A Date at h:m local time on the anchor-relative day. */
    const atTime = (n: number, h: number, m: number): Date => {
      const d = anchorPlusDays(n);
      d.setHours(h, m, 0, 0);
      return d;
    };

    // #24 roster mix: move 2 of Sarah's members to Morning Shift so the manager
    // Shift Planning grid + coverage show a General/Morning mix.
    for (const member of [empUsers[2], empUsers[5]]) {
      await db
        .update(employeeShiftAssignments)
        .set({ shiftId: morningShift.id })
        .where(
          and(
            eq(employeeShiftAssignments.orgId, org.id),
            eq(employeeShiftAssignments.employeeId, member.id),
          ),
        );
    }
    console.log('  ✓ Shift mix: empUsers[2] & empUsers[5] → Morning Shift');

    // #26 — 4 attendance regularizations for Sarah's team (all weekday dates;
    // anchor is a Tuesday, so -1=Mon, -4=Fri, -6=Wed, -8=Mon).
    await db.insert(attendanceRegularizations).values([
      {
        orgId: org.id,
        employeeId: empUsers[1].id,
        date: fmt(anchorPlusDays(-1)),
        punchType: 'clock_out',
        requestedTime: atTime(-1, 18, 15),
        reason: 'Forgot to clock out after the release call ran late',
        reasonCode: 'forgot_punch',
        evidence: [],
        status: 'pending',
        slaDeadline: atTime(2, 17, 0),
      },
      {
        orgId: org.id,
        employeeId: empUsers[3].id,
        date: fmt(anchorPlusDays(-4)),
        punchType: 'clock_in',
        requestedTime: atTime(-4, 9, 5),
        reason: 'Badge reader was down at the office entrance',
        reasonCode: 'device_issue',
        evidence: [],
        status: 'pending',
        slaDeadline: atTime(3, 17, 0),
      },
      {
        orgId: org.id,
        employeeId: empUsers[5].id,
        date: fmt(anchorPlusDays(-6)),
        punchType: 'clock_out',
        requestedTime: atTime(-6, 18, 5),
        reason: 'Stayed for client demo, missed the punch-out window',
        reasonCode: 'forgot_punch',
        evidence: [],
        status: 'approved',
        reviewedBy: managerUser.id,
        reviewedAt: atTime(-5, 10, 0),
        reviewerComment: 'Verified with project logs - approved.',
      },
      {
        orgId: org.id,
        employeeId: empUsers[6].id,
        date: fmt(anchorPlusDays(-8)),
        punchType: 'clock_in',
        requestedTime: atTime(-8, 9, 10),
        reason: 'Clocked in on mobile but the entry did not sync',
        reasonCode: 'app_sync',
        evidence: [],
        status: 'rejected',
        reviewedBy: managerUser.id,
        reviewedAt: atTime(-7, 11, 30),
        reviewerComment: 'No supporting evidence; please use the standard punch flow.',
      },
    ]);
    console.log('  ✓ Attendance regularizations: 2 pending, 1 approved, 1 rejected');

    // #48 — 2 shift swap requests involving emp01 (one each direction).
    await db.insert(shiftSwapRequests).values([
      {
        // Outgoing, awaiting manager — also appears on the manager Shift Planning tab
        orgId: org.id,
        requesterId: empUsers[0].id,
        targetEmployeeId: empUsers[2].id,
        requesterShiftId: generalShift.id,
        targetShiftId: morningShift.id,
        swapDate: fmt(anchorPlusDays(3)),
        reason: 'Family function in the evening - need the earlier shift',
        status: 'pending_manager',
        partnerAcceptedAt: atTime(-1, 9, 0),
      },
      {
        // Incoming, completed (manager approved)
        orgId: org.id,
        requesterId: empUsers[1].id,
        targetEmployeeId: empUsers[0].id,
        requesterShiftId: morningShift.id,
        targetShiftId: generalShift.id,
        swapDate: fmt(anchorPlusDays(-7)),
        reason: 'Medical appointment clashed with the morning shift',
        status: 'manager_approved',
        partnerAcceptedAt: atTime(-8, 10, 0),
        managerApprovedBy: managerUser.id,
        managerApprovedAt: atTime(-8, 15, 0),
        managerComment: 'Approved - one-day swap.',
      },
    ]);
    console.log('  ✓ Shift swap requests: 1 pending_manager (out), 1 manager_approved (in)');

    // ── Demo polish: Talent Acquisition (#55 #56 #57 #58 #33 #9) ─────────────
    // #55 — 3 published INTERNAL postings on existing requisitions
    const internalPostings = await db.insert(jobPostings).values([
      { orgId: org.id, requisitionId: requisitions[0].id, title: 'Senior Software Engineer (Internal)', description: 'Internal mobility opening on the Platform team. Own service architecture, mentor engineers, and ship the multi-tenant core.', requirements: '5+ years building backend services\nStrong TypeScript and PostgreSQL\nExperience mentoring engineers', responsibilities: 'Design and ship platform services\nLead code reviews\nPartner with product on the roadmap', benefits: 'Internal mobility bonus\nFlexible hybrid schedule\nLearning budget', skills: ['TypeScript', 'Node.js', 'PostgreSQL'], postingType: 'internal', channels: ['internal_portal'], locationDetails: { city: 'Bengaluru', mode: 'hybrid' }, status: 'published', publishedAt: anchorPlusDays(-14), applicationDeadline: fmt(anchorPlusDays(21)), salaryVisible: false, createdBy: managerUser.id },
      { orgId: org.id, requisitionId: requisitions[1].id, title: 'Software Engineer II (Internal)', description: 'Step-up role for engineers ready to own features end-to-end on the HRMS web app.', requirements: '2+ years with React or Node.js\nSolid grasp of REST APIs\nProduct mindset', responsibilities: 'Build and own product features\nWrite tests and docs\nSupport releases', benefits: 'Internal mobility bonus\nMentorship from senior engineers', skills: ['JavaScript', 'React'], postingType: 'internal', channels: ['internal_portal'], locationDetails: { city: 'Bengaluru', mode: 'hybrid' }, status: 'published', publishedAt: anchorPlusDays(-35), applicationDeadline: fmt(anchorPlusDays(14)), salaryVisible: false, createdBy: managerUser.id },
      { orgId: org.id, requisitionId: requisitions[2].id, title: 'Sales Executive (Internal)', description: 'Move into a quota-carrying role on the enterprise sales team.', requirements: 'Customer-facing experience\nStrong communication\nCRM familiarity', responsibilities: 'Run discovery calls\nManage a pipeline\nClose mid-market deals', benefits: 'Uncapped commission\nSales bootcamp training', skills: ['Negotiation', 'CRM'], postingType: 'internal', channels: ['internal_portal'], locationDetails: { city: 'Mumbai', mode: 'onsite' }, status: 'published', publishedAt: anchorPlusDays(-7), applicationDeadline: fmt(anchorPlusDays(30)), salaryVisible: false, createdBy: managerUser.id },
    ]).returning();

    // #56/#57/#58 — emp01 as internal applicant. Employee services resolve
    // candidate ids via applications.internalEmployeeId, and the apply flow
    // matches candidates by user email — so email MUST equal empUsers[0].email.
    const [emp01Candidate] = await db.insert(candidates).values({
      orgId: org.id, firstName: empUsers[0].firstName, lastName: empUsers[0].lastName ?? '', email: empUsers[0].email, phone: '+919912345678', currentTitle: 'Software Engineer', currentCompany: 'Acme Corp', experienceYears: '3.0', skills: ['TypeScript', 'React', 'Node.js'], source: 'internal', currentLocation: 'Bengaluru', status: 'active',
    }).returning();

    const internalApps = await db.insert(applications).values([
      // Active thread: SSE (Internal) — interviewing, upcoming interview
      { orgId: org.id, candidateId: emp01Candidate.id, jobPostingId: internalPostings[0].id, requisitionId: requisitions[0].id, source: 'internal', coverLetter: 'I have led two platform features this year and would love to step up into this role.', currentStageId: pipelineStages[2].id, status: 'interviewing', overallScore: '8.20', internalEmployeeId: empUsers[0].id, appliedAt: anchorPlusDays(-12) },
      // Completed thread: SE II (Internal) — interviewed, offer extended
      { orgId: org.id, candidateId: emp01Candidate.id, jobPostingId: internalPostings[1].id, requisitionId: requisitions[1].id, source: 'internal', coverLetter: 'Ready to own features end-to-end.', currentStageId: pipelineStages[3].id, status: 'offered', overallScore: '8.80', internalEmployeeId: empUsers[0].id, appliedAt: anchorPlusDays(-32) },
    ]).returning();

    // #9 — one referral-source application so source reports vary (linkedin/internal/referral)
    await db.insert(applications).values({ orgId: org.id, candidateId: seededCandidates[4].id, jobPostingId: postings[0].id, requisitionId: requisitions[0].id, source: 'referral', status: 'screening', overallScore: '7.40', currentStageId: pipelineStages[1].id, appliedAt: anchorPlusDays(-9) });

    // #57 — emp01 interviews: upcoming video (anchor+6, 10:30 IST) + completed on the offer thread
    await db.insert(interviews).values([
      { orgId: org.id, applicationId: internalApps[0].id, stageId: pipelineStages[2].id, candidateId: emp01Candidate.id, scheduledAt: new Date(anchorPlusDays(6).setUTCHours(5, 0, 0, 0)), duration: 60, location: 'https://meet.google.com/acme-sse-internal', interviewType: 'video', status: 'scheduled', panelMembers: [{ userId: managerUser.id, name: 'Sarah Mehta', role: 'Hiring Manager' }, { userId: adminUser.id, name: 'Alex Kumar', role: 'HR Partner' }], metadata: { videoLink: 'https://meet.google.com/acme-sse-internal', checklist: [{ id: '1', label: 'Review the role scorecard', completed: true }, { id: '2', label: 'Prepare system-design walkthrough', completed: false }, { id: '3', label: 'Collect peer feedback summary', completed: false }] } },
      { orgId: org.id, applicationId: internalApps[1].id, stageId: pipelineStages[2].id, candidateId: emp01Candidate.id, scheduledAt: new Date(anchorPlusDays(-25).setUTCHours(8, 30, 0, 0)), duration: 60, location: 'https://zoom.us/j/acme-se2-internal', interviewType: 'video', status: 'completed', overallScore: '8.80', decision: 'hire', decisionBy: managerUser.id, decisionAt: anchorPlusDays(-24), panelMembers: [{ userId: managerUser.id, name: 'Sarah Mehta', role: 'Hiring Manager' }] },
    ]);

    // #58 — offer for emp01 (status 'sent' renders as actionable "pending"; valid past real-today)
    await db.insert(offerLetters).values({
      orgId: org.id, applicationId: internalApps[1].id, candidateId: emp01Candidate.id, requisitionId: requisitions[1].id, designation: 'Software Engineer II', department: 'Engineering', location: 'Bengaluru', employmentType: 'full_time', salaryAmount: '1250000', currency: 'INR', salaryBreakdown: [{ component: 'Base Salary', amount: 950000 }, { component: 'House Rent Allowance', amount: 180000 }, { component: 'Performance Bonus', amount: 120000 }], joiningDate: fmt(anchorPlusDays(30)), probationMonths: 3, reportingTo: 'Sarah Mehta', terms: 'Internal transfer effective from the joining date. Existing tenure and benefits carry over. A 90-day transition plan has been agreed with your current team.', benefits: ['Health insurance (family)', 'Internal mobility bonus', 'Learning budget INR 50,000/yr'], approvalChain: [{ level: 1, approverId: managerUser.id, role: 'manager', status: 'approved', approvedAt: anchorPlusDays(-6).toISOString() }], currentApproverLevel: 1, approvedBy: managerUser.id, approvedAt: anchorPlusDays(-6), status: 'sent', sentAt: anchorPlusDays(-5), validUntil: fmt(anchorPlusDays(14)), documentUrl: 'https://files.acme.test/offers/emp01-software-engineer-ii.pdf', createdBy: managerUser.id,
    });

    // #33 — 2 offers pending manager@acme.com approval (level-1 approver, no approvedBy)
    await db.insert(offerLetters).values([
      { orgId: org.id, applicationId: seededApplications[2].id, candidateId: seededCandidates[2].id, requisitionId: requisitions[2].id, designation: 'Sales Executive', department: 'Sales', location: 'Mumbai', employmentType: 'full_time', salaryAmount: '750000', currency: 'INR', salaryBreakdown: [{ component: 'Base Salary', amount: 600000 }, { component: 'Sales Incentive', amount: 150000 }], joiningDate: fmt(anchorPlusDays(35)), probationMonths: 6, approvalChain: [{ level: 1, approverId: managerUser.id, role: 'manager', status: 'pending' }], currentApproverLevel: 1, status: 'pending_approval', validUntil: fmt(anchorPlusDays(21)), createdBy: managerUser.id },
      { orgId: org.id, applicationId: seededApplications[4].id, candidateId: seededCandidates[4].id, requisitionId: requisitions[2].id, designation: 'Sales Executive', department: 'Sales', location: 'Mumbai', employmentType: 'full_time', salaryAmount: '680000', currency: 'INR', salaryBreakdown: [{ component: 'Base Salary', amount: 550000 }, { component: 'Sales Incentive', amount: 130000 }], joiningDate: fmt(anchorPlusDays(42)), probationMonths: 6, approvalChain: [{ level: 1, approverId: managerUser.id, role: 'manager', status: 'pending' }], currentApproverLevel: 1, status: 'pending_approval', validUntil: fmt(anchorPlusDays(28)), createdBy: managerUser.id },
    ]);
    console.log('  ✓ Talent Acquisition demo polish: 3 internal postings, emp01 applicant story (2 apps, 2 interviews, 1 offer), 1 referral app, 2 pending-approval offers');

    // ── Reimbursement claims (#64 employee Reimbursements + #37 manager Approval Workflows) ──
    await db.insert(reimbursementClaims).values([
      // emp01 — one claim in every lifecycle state
      { orgId: org.id, employeeId: empUsers[0].id, type: 'travel', amount: '4200.00', description: 'Client visit - airport taxi and metro fares', receiptUrl: 'taxi-receipts-jun2026.pdf', status: 'pending', submittedAt: anchorPlusDays(-3) },
      { orgId: org.id, employeeId: empUsers[0].id, type: 'medical', amount: '8500.00', description: 'Annual health check-up - Apollo Clinic', receiptUrl: 'apollo-invoice-may2026.pdf', status: 'approved', submittedAt: anchorPlusDays(-15), approvedBy: managerUser.id, approvedAt: anchorPlusDays(-13), remarks: 'Approved under annual health benefit' },
      { orgId: org.id, employeeId: empUsers[0].id, type: 'internet', amount: '1200.00', description: 'Home broadband - May 2026 (WFH policy)', receiptUrl: 'airtel-bill-apr2026.pdf', status: 'paid', submittedAt: anchorPlusDays(-40), approvedBy: managerUser.id, approvedAt: anchorPlusDays(-38), paidAt: anchorPlusDays(-35), remarks: 'Paid with May payroll' },
      { orgId: org.id, employeeId: empUsers[0].id, type: 'food', amount: '950.00', description: 'Team dinner during release week', status: 'rejected', submittedAt: anchorPlusDays(-25), approvedBy: managerUser.id, approvedAt: anchorPlusDays(-24), remarks: 'Team meals are covered by the team budget, not individual claims' },
      // Other Sarah-team members — pending rows so the manager queue (#37) has reimbursements beyond emp01
      { orgId: org.id, employeeId: empUsers[2].id, type: 'fuel', amount: '1800.00', description: 'Fuel for client site visits - May 2026', receiptUrl: 'fuel-log-may2026.pdf', status: 'pending', submittedAt: anchorPlusDays(-2) },
      { orgId: org.id, employeeId: empUsers[5].id, type: 'training', amount: '6000.00', description: 'Kubernetes certification exam fee', receiptUrl: 'cka-exam-receipt.pdf', status: 'pending', submittedAt: anchorPlusDays(-5) },
    ]);
    console.log('  ✓ Reimbursement claims: 6 (3 pending / 1 approved / 1 paid / 1 rejected)');

    // ── Punchlist #10: Onboarding/Offboarding admin tabs ──────────────────────
    // (a) Onboarding workflow templates (3) + task templates (8 / 5 / 4)
    const [onbWfStandard] = await db.insert(onboardingWorkflows).values({
      orgId: org.id, name: 'Standard Full-Time Onboarding',
      description: 'Default 2-week onboarding journey for all full-time hires across IT, HR and the hiring manager.',
      workflowType: 'onboarding', departmentId: null, employmentType: 'full_time',
      isTemplate: true, taskCount: 8, conditionalRules: [], status: 'active',
      createdBy: adminUser.id, metadata: {}, isActive: true,
      createdAt: anchorPlusDays(-120), updatedAt: anchorPlusDays(-120),
    }).returning();
    const [onbWfIntern] = await db.insert(onboardingWorkflows).values({
      orgId: org.id, name: 'Intern Onboarding',
      description: 'Lightweight onboarding for interns — mentor-led with a project kickoff.',
      workflowType: 'onboarding', departmentId: null, employmentType: 'intern',
      isTemplate: true, taskCount: 5, conditionalRules: [], status: 'active',
      createdBy: adminUser.id, metadata: {}, isActive: true,
      createdAt: anchorPlusDays(-100), updatedAt: anchorPlusDays(-100),
    }).returning();
    const [onbWfContractor] = await db.insert(onboardingWorkflows).values({
      orgId: org.id, name: 'Contractor Onboarding',
      description: 'Draft onboarding flow for fixed-term contractors (SOW-based engagements).',
      workflowType: 'onboarding', departmentId: null, employmentType: 'contract',
      isTemplate: true, taskCount: 4, conditionalRules: [], status: 'draft',
      createdBy: adminUser.id, metadata: {}, isActive: true,
      createdAt: anchorPlusDays(-45), updatedAt: anchorPlusDays(-45),
    }).returning();

    const onbWfTaskTemplates = [
      // Standard Full-Time (8) — day offsets 0–14 across IT / HR / manager
      { wf: onbWfStandard.id, title: 'Create accounts, email & SSO access', owner: 'it', day: 0, type: 'general', mandatory: true, doc: false, docType: null as string | null, desc: 'Provision corporate email, SSO and core SaaS access.' },
      { wf: onbWfStandard.id, title: 'Provision laptop & access badge', owner: 'it', day: 0, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Issue configured laptop, peripherals and building access badge.' },
      { wf: onbWfStandard.id, title: 'Collect signed offer & ID documents', owner: 'hr', day: 1, type: 'document_submission', mandatory: true, doc: true, docType: 'identity', desc: 'Verify signed offer letter, government ID and education certificates.' },
      { wf: onbWfStandard.id, title: 'Welcome meeting & team introductions', owner: 'manager', day: 1, type: 'general', mandatory: true, doc: false, docType: null, desc: 'First-day welcome, team intros and tour of the floor.' },
      { wf: onbWfStandard.id, title: 'Enroll in payroll & benefits', owner: 'hr', day: 2, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Bank details, statutory declarations and benefits enrollment.' },
      { wf: onbWfStandard.id, title: 'Assign onboarding buddy', owner: 'manager', day: 3, type: 'general', mandatory: false, doc: false, docType: null, desc: 'Pair the new hire with a buddy for the first month.' },
      { wf: onbWfStandard.id, title: 'Complete security awareness training', owner: 'hr', day: 7, type: 'training', mandatory: true, doc: false, docType: null, desc: 'Mandatory e-learning: phishing, passwords, data handling.' },
      { wf: onbWfStandard.id, title: '2-week check-in & goal setting', owner: 'manager', day: 14, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Review first two weeks and agree 90-day goals.' },
      // Intern (5)
      { wf: onbWfIntern.id, title: 'Create intern accounts & limited access', owner: 'it', day: 0, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Time-boxed accounts scoped to the internship project.' },
      { wf: onbWfIntern.id, title: 'Share internship guidelines & stipend setup', owner: 'hr', day: 1, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Internship policy, stipend banking details and timeline.' },
      { wf: onbWfIntern.id, title: 'Assign mentor', owner: 'manager', day: 1, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Pair intern with a senior team member as mentor.' },
      { wf: onbWfIntern.id, title: 'Project kickoff briefing', owner: 'manager', day: 2, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Walk through the internship project scope and milestones.' },
      { wf: onbWfIntern.id, title: 'Complete code of conduct training', owner: 'hr', day: 3, type: 'training', mandatory: true, doc: false, docType: null, desc: 'Short e-learning on workplace conduct and confidentiality.' },
      // Contractor (4)
      { wf: onbWfContractor.id, title: 'Set up contractor VPN & repository access', owner: 'it', day: 0, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Least-privilege access scoped to the SOW.' },
      { wf: onbWfContractor.id, title: 'Verify signed contract & NDA', owner: 'hr', day: 0, type: 'document_submission', mandatory: true, doc: true, docType: 'contracts', desc: 'Confirm executed services agreement and NDA are on file.' },
      { wf: onbWfContractor.id, title: 'Statement of work walkthrough', owner: 'manager', day: 1, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Align on deliverables, milestones and acceptance criteria.' },
      { wf: onbWfContractor.id, title: 'Timesheet & invoicing setup', owner: 'hr', day: 2, type: 'general', mandatory: true, doc: false, docType: null, desc: 'Set up timesheet codes and invoicing cadence.' },
    ];
    await db.insert(onboardingWorkflowTasks).values(
      onbWfTaskTemplates.map((t, i) => ({
        orgId: org.id, workflowId: t.wf, title: t.title, description: t.desc,
        taskType: t.type, taskOwner: t.owner, sortOrder: i, deadlineDays: t.day,
        isMandatory: t.mandatory, isConditional: false, conditionRules: {},
        documentRequired: t.doc, documentType: t.docType, metadata: {}, isActive: true,
      })),
    );
    console.log('  ✓ Onboarding workflows: 3, workflow task templates: 17');

    // (b) Offboarding workflow templates (2)
    await db.insert(offboardingWorkflows).values([
      {
        orgId: org.id, name: 'Standard Resignation',
        description: 'Default exit flow for voluntary resignations with 30-day notice: IT asset return, access revocation, finance settlement and exit interview.',
        exitType: 'resignation', departmentId: null,
        clearanceDepartments: ['IT', 'Finance', 'HR', 'Admin'],
        assetChecklist: ['Return laptop & charger', 'Return ID card & access badge', 'Return company phone & SIM', 'Revoke VPN, SSO & repository access'],
        settlementChecklist: ['Leave encashment', 'Final salary & notice-period adjustment', 'Gratuity (if eligible)', 'Exit interview sign-off'],
        isTemplate: true, taskCount: 4, status: 'active', createdBy: adminUser.id,
        metadata: {}, isActive: true, createdAt: anchorPlusDays(-110), updatedAt: anchorPlusDays(-110),
      },
      {
        orgId: org.id, name: 'Termination (Immediate)',
        description: 'Draft flow for involuntary, same-day separations — immediate access revocation and supervised asset recovery.',
        exitType: 'termination', departmentId: null,
        clearanceDepartments: ['IT', 'HR', 'Security'],
        assetChecklist: ['Immediate laptop & badge surrender', 'Disable all system access same-day'],
        settlementChecklist: ['Full & final settlement', 'Recovery of company dues'],
        isTemplate: true, taskCount: 2, status: 'draft', createdBy: adminUser.id,
        metadata: {}, isActive: true, createdAt: anchorPlusDays(-40), updatedAt: anchorPlusDays(-40),
      },
    ]);
    console.log('  ✓ Offboarding workflows: 2');

    // (c) Document templates (6) — stored in `documents` with category 'template'
    //     (matches DocumentTemplateMgmtService; employee_id has no FK so the
    //      zero-uuid "system" owner is safe and keeps them out of employee vaults)
    const SYSTEM_DOC_EMPLOYEE_ID = '00000000-0000-0000-0000-000000000000';
    const docTemplateSeed = [
      { name: 'Offer Letter', type: 'offer_letter', country: 'India', sign: true, fields: ['employee_name', 'designation', 'department', 'salary', 'joining_date', 'company_name'], content: 'Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} in our {{department}} team at {{company_name}}, with an annual CTC of {{salary}}. Your tentative date of joining is {{joining_date}}.\n\nWe look forward to welcoming you aboard.\n\nSincerely,\nHuman Resources, {{company_name}}' },
      { name: 'Appointment Letter', type: 'appointment_letter', country: 'India', sign: true, fields: ['employee_name', 'designation', 'date_of_joining', 'probation_period', 'work_location'], content: 'Dear {{employee_name}},\n\nThis letter confirms your appointment as {{designation}} effective {{date_of_joining}} at our {{work_location}} office. Your employment is subject to a probation period of {{probation_period}}.\n\nSincerely,\nHuman Resources' },
      { name: 'Non-Disclosure Agreement', type: 'nda', country: null as string | null, sign: true, fields: ['employee_name', 'company_name', 'current_date'], content: 'This Non-Disclosure Agreement is entered into on {{current_date}} between {{company_name}} and {{employee_name}}.\n\nThe employee agrees to hold in strict confidence all proprietary information, trade secrets and customer data accessed during employment, surviving termination of employment.' },
      { name: 'Relieving Letter', type: 'relieving_letter', country: 'India', sign: false, fields: ['employee_name', 'designation', 'last_working_date'], content: 'To whom it may concern,\n\nThis is to certify that {{employee_name}}, {{designation}}, has been relieved from their duties effective close of business on {{last_working_date}}, having completed all exit formalities.\n\nWe wish them success in their future endeavours.' },
      { name: 'Experience Certificate', type: 'experience_letter', country: null, sign: false, fields: ['employee_name', 'designation', 'date_of_joining', 'last_working_date'], content: 'To whom it may concern,\n\nThis is to certify that {{employee_name}} was employed with us as {{designation}} from {{date_of_joining}} to {{last_working_date}}. During this tenure their conduct and performance were found to be satisfactory.' },
      { name: 'Exit Checklist', type: 'exit_checklist', country: null, sign: false, fields: ['employee_name', 'last_working_date', 'exit_type'], content: 'Exit checklist for {{employee_name}} (exit type: {{exit_type}}, last working day: {{last_working_date}}):\n\n1. IT assets returned and access revoked\n2. Department clearances obtained (IT / Finance / HR / Admin)\n3. Knowledge transfer completed and signed off\n4. Exit interview conducted\n5. Full & final settlement initiated' },
    ];
    await db.insert(documents).values(
      docTemplateSeed.map((t, i) => ({
        orgId: org.id, employeeId: SYSTEM_DOC_EMPLOYEE_ID, category: 'template',
        name: t.name, description: `${t.name} template with merge fields.`,
        fileUrl: null, fileSize: null, mimeType: 'text/html', version: '1',
        metadata: {
          templateType: t.type, status: 'active', country: t.country,
          content: t.content, dynamicFields: t.fields,
          versionHistory: [{ version: '1', updatedAt: anchorPlusDays(-90 + i).toISOString(), changeNote: 'Initial version' }],
          digitalSignatureEnabled: t.sign, complianceCategory: null, applicableTo: 'all',
        },
        createdAt: anchorPlusDays(-90 + i), updatedAt: anchorPlusDays(-90 + i),
      })),
    );
    console.log('  ✓ Document templates: 6');

    // (d) Compliance & Policy enrichment — two HISTORICAL completed onboarding
    //     journeys (emp02, emp03) linked to the Standard workflow, each with
    //     completed compliance acknowledgements + scored trainings.
    const histOnboardings = await db.insert(employeeOnboardings).values([
      {
        orgId: org.id, employeeId: empUsers[1].id, workflowId: onbWfStandard.id,
        status: 'completed', startDate: fmt(anchorPlusDays(-90)), targetCompletionDate: fmt(anchorPlusDays(-60)),
        completedAt: anchorPlusDays(-62), progressPercentage: '100.00',
        orientationSchedule: [], firstDayInfo: {}, checkinSchedule: [],
        probationEndDate: fmt(anchorPlusDays(90)), probationStatus: 'confirmed',
        totalTasks: 4, completedTasks: 4, initiatedBy: managerUser.id, isActive: true,
      },
      {
        orgId: org.id, employeeId: empUsers[2].id, workflowId: onbWfStandard.id,
        status: 'completed', startDate: fmt(anchorPlusDays(-75)), targetCompletionDate: fmt(anchorPlusDays(-45)),
        completedAt: anchorPlusDays(-47), progressPercentage: '100.00',
        orientationSchedule: [], firstDayInfo: {}, checkinSchedule: [],
        probationEndDate: fmt(anchorPlusDays(105)), probationStatus: 'confirmed',
        totalTasks: 4, completedTasks: 4, initiatedBy: managerUser.id, isActive: true,
      },
    ]).returning();

    const histComplianceTaskSeed = [
      // emp02 (empUsers[1])
      { onb: 0, emp: 1, title: 'Acknowledge Code of Conduct', type: 'compliance', due: -88, done: -87, score: null as number | null },
      { onb: 0, emp: 1, title: 'Acknowledge IT & Security Policy', type: 'compliance', due: -86, done: -85, score: null },
      { onb: 0, emp: 1, title: 'Complete Security Awareness Training', type: 'training', due: -83, done: -82, score: 92 },
      { onb: 0, emp: 1, title: 'Complete POSH Awareness Training', type: 'training', due: -80, done: -78, score: 88 },
      // emp03 (empUsers[2])
      { onb: 1, emp: 2, title: 'Acknowledge Code of Conduct', type: 'compliance', due: -73, done: -72, score: null },
      { onb: 1, emp: 2, title: 'Acknowledge IT & Security Policy', type: 'compliance', due: -71, done: -70, score: null },
      { onb: 1, emp: 2, title: 'Complete Security Awareness Training', type: 'training', due: -68, done: -67, score: 95 },
      { onb: 1, emp: 2, title: 'Complete POSH Awareness Training', type: 'training', due: -65, done: -64, score: 84 },
    ];
    await db.insert(employeeOnboardingTasks).values(
      histComplianceTaskSeed.map((t) => ({
        orgId: org.id, onboardingId: histOnboardings[t.onb].id, employeeId: empUsers[t.emp].id,
        title: t.title, description: t.type === 'training' ? 'Mandatory e-learning module' : 'Read and accept the policy',
        taskType: t.type, taskOwner: 'employee', status: 'completed',
        dueDate: fmt(anchorPlusDays(t.due)), completedAt: anchorPlusDays(t.done),
        verificationStatus: 'verified', verifiedBy: managerUser.id, verifiedAt: anchorPlusDays(t.done + 1),
        metadata: t.score != null ? { score: t.score } : {}, isActive: true,
      })),
    );
    console.log('  ✓ Historical onboardings: 2, compliance/training tasks: 8');

    // ── #39: Policy Violations — Sarah's team ─────────────────────────────────
    await db.insert(policyViolations).values([
      {
        orgId: org.id, employeeId: empUsers[1].id,
        policyId: caPolicies[0].id, // Code of Conduct
        violationType: 'Late Attendance', severity: 'minor',
        description: 'Repeated late arrivals (4 instances in two weeks) without prior intimation.',
        incidentDate: fmt(anchorPlusDays(-6)), status: 'open', reportedBy: managerUser.id,
      },
      {
        orgId: org.id, employeeId: empUsers[3].id,
        policyId: caPolicies[2].id, // Data Privacy Policy
        violationType: 'Data Policy Breach', severity: 'major',
        description: 'Shared a customer data export over personal email instead of the secure portal.',
        incidentDate: fmt(anchorPlusDays(-15)), status: 'under_review', reportedBy: managerUser.id,
      },
      {
        orgId: org.id, employeeId: empUsers[5].id,
        policyId: caPolicies[0].id, // Code of Conduct
        violationType: 'Dress Code', severity: 'minor',
        description: 'Did not follow client-site dress code during an on-site customer visit.',
        incidentDate: fmt(anchorPlusDays(-30)), status: 'action_taken',
        disciplinaryAction: 'Verbal warning issued; reminded of client-site dress code guidelines.',
        reportedBy: managerUser.id,
      },
      {
        orgId: org.id, employeeId: empUsers[6].id,
        policyId: null, // no seeded expense policy — exercises the nullable path ("—" in Policy column)
        violationType: 'Expense Policy', severity: 'major',
        description: 'Claimed a non-reimbursable personal expense on a client project; amount recovered.',
        incidentDate: fmt(anchorPlusDays(-50)), status: 'closed',
        disciplinaryAction: 'Written warning issued; expense amount recovered from reimbursement.',
        resolvedAt: anchorPlusDays(-40), reportedBy: managerUser.id,
      },
    ]);
    console.log('  ✓ Policy violations: 4 (open/under_review/action_taken/closed)');

    // ── #40: Audit Evidence — manager Audit Support tab ───────────────────────
    await db.insert(auditEvidence).values([
      {
        orgId: org.id, title: 'Policy Acknowledgment Records — Q2 2026', category: 'policy',
        description: 'Signed acknowledgment exports for all four mandatory policies, by department.',
        collectedBy: adminUser.id, collectedAt: anchorPlusDays(-30), status: 'verified',
        fileCount: 4, relatedAuditName: 'Internal Compliance Audit FY26',
      },
      {
        orgId: org.id, title: 'Mandatory Training Completion Certificates', category: 'training',
        description: 'Completion certificates and score sheets for POSH and Data Privacy trainings.',
        collectedBy: adminUser.id, collectedAt: anchorPlusDays(-25), status: 'verified',
        fileCount: 12, relatedAuditName: 'Internal Compliance Audit FY26',
      },
      {
        orgId: org.id, title: 'Quarterly Access Review — Engineering Systems', category: 'access_review',
        description: 'User access matrix and revocation log for production systems, reviewed by team leads.',
        collectedBy: managerUser.id, collectedAt: anchorPlusDays(-10), status: 'collected',
        fileCount: 3, relatedAuditName: 'ISO 27001 Surveillance Audit',
      },
      {
        orgId: org.id, title: 'Expense Reimbursement Sample — May 2026', category: 'financial',
        description: 'Sampled expense reports with receipts pending finance sign-off.',
        collectedBy: adminUser.id, status: 'pending', // not yet collected → no collectedAt
        fileCount: 0, relatedAuditName: 'Statutory Financial Audit FY26',
      },
    ]);
    console.log('  ✓ Audit evidence: 4');

    // ── Punchlist #35: Manager "Feedback & Suggestions" (Sarah's team) ────────
    {
      // 1) Dedicated team feedback-box survey (type 'feedback' → picked up by the manager feedback endpoint)
      const [teamFeedbackBox] = await db.insert(surveys).values([
        {
          orgId: org.id,
          title: 'Engineering Team Feedback Box',
          type: 'feedback',
          status: 'active',
          description: 'Always-on channel for the Engineering team to raise feedback with their manager.',
          questions: [{ id: 'fb1', text: 'Share your feedback with your manager', type: 'text' }],
          targetAudience: { departments: ['Engineering'] },
          isAnonymous: false,
          responseCount: 0,
          closesAt: anchorPlusDays(30),
          createdBy: managerUser.id,
          isActive: true,
        },
      ]).returning();

      // 6 feedback items — status is DERIVED by the service from `answers` entries:
      //   { type: 'escalation' } → escalated, { type: 'manager_response' } → responded, else new.
      //   { type: 'meta', category, anonymous } carries the category chip + per-response anonymity.
      const fbItems: Array<{
        userId: string; category: string; message: string; submittedDaysAgo: number;
        sentiment: string; anonymous?: boolean;
        response?: string; respondedDaysAgo?: number;
        escalationReason?: string; escalatedDaysAgo?: number;
      }> = [
        { userId: empUsers[0].id, category: 'workplace', sentiment: 'neutral', submittedDaysAgo: 1,
          message: 'The 3rd-floor meeting rooms are always booked — can we get a room-booking policy?' },
        { userId: empUsers[1].id, category: 'tooling', sentiment: 'negative', submittedDaysAgo: 2,
          message: 'CI pipeline takes 40+ minutes on every PR; it is slowing the whole team down.' },
        { userId: empUsers[2].id, category: 'process', sentiment: 'neutral', submittedDaysAgo: 3,
          message: 'Sprint planning regularly overruns by an hour. Can we timebox it?',
          response: 'Agreed — from next sprint, planning is hard-capped at 90 minutes with a parking lot for overflow.',
          respondedDaysAgo: 2 },
        { userId: empUsers[3].id, category: 'workplace', sentiment: 'positive', submittedDaysAgo: 5,
          message: 'It would be great to have a quiet focus room for deep work.',
          response: 'Facilities has approved converting meeting room B into a quiet room this month.',
          respondedDaysAgo: 4 },
        { userId: empUsers[4].id, category: 'process', sentiment: 'neutral', submittedDaysAgo: 4, anonymous: true,
          message: 'On-call rotation is unevenly distributed; some of us carry twice the load.' },
        { userId: empUsers[5].id, category: 'workload', sentiment: 'negative', submittedDaysAgo: 6, anonymous: true,
          message: 'Workload has been unsustainable for three sprints in a row and it is affecting morale.',
          escalationReason: 'Sustained workload concern — needs HR visibility.', escalatedDaysAgo: 5 },
      ];

      await db.insert(surveyResponses).values(fbItems.map((f) => {
        const answers: any[] = [
          { questionId: 'fb1', value: f.message },
          { type: 'meta', category: f.category, anonymous: f.anonymous === true },
        ];
        if (f.response) {
          answers.push({
            type: 'manager_response', respondedBy: managerUser.id, response: f.response,
            respondedAt: anchorPlusDays(f.respondedDaysAgo ?? 0).toISOString(),
          });
        }
        if (f.escalationReason) {
          answers.push({
            type: 'escalation', escalatedBy: managerUser.id, reason: f.escalationReason,
            escalatedAt: anchorPlusDays(f.escalatedDaysAgo ?? 0).toISOString(),
          });
        }
        return {
          orgId: org.id, surveyId: teamFeedbackBox.id, respondentId: f.userId,
          answers, sentiment: f.sentiment,
          submittedAt: anchorPlusDays(-f.submittedDaysAgo), isActive: true,
        };
      }));
      await db.update(surveys).set({ responseCount: 6 }).where(eq(surveys.id, teamFeedbackBox.id));

      // 2) Suggestion tracking — socialPosts announcements using the
      //    "[Suggestion: <title>] [Status: <status>] <description>" convention; votes = likesCount.
      await db.insert(socialPosts).values([
        { orgId: org.id, authorId: empUsers[1].id, type: 'announcement',
          content: '[Suggestion: Adopt a monthly demo day] [Status: implemented] A monthly demo day so every squad can show what shipped.',
          likesCount: 14, commentsCount: 5, isActive: true, createdAt: anchorPlusDays(-21) },
        { orgId: org.id, authorId: empUsers[3].id, type: 'announcement',
          content: '[Suggestion: Self-serve staging environments] [Status: planned] Let every engineer spin up an isolated staging environment from a template.',
          likesCount: 11, commentsCount: 3, isActive: true, createdAt: anchorPlusDays(-9) },
        { orgId: org.id, authorId: empUsers[5].id, type: 'announcement',
          content: '[Suggestion: Rotate sprint retro facilitators] [Status: under_review] Rotating facilitators would bring fresh formats to retrospectives.',
          likesCount: 6, commentsCount: 2, isActive: true, createdAt: anchorPlusDays(-4) },
        { orgId: org.id, authorId: empUsers[7].id, type: 'announcement',
          content: '[Suggestion: Team library budget] [Status: new] A small quarterly budget for technical books and courses.',
          likesCount: 3, commentsCount: 1, isActive: true, createdAt: anchorPlusDays(-1) },
      ]);
    }
    console.log('  ✓ engagement-culture (#35): 1 feedback-box survey + 6 team feedback responses, 4 tracked suggestions');

    // ── Org Design Studio: planning scenarios (punchlist #17) ──────────────
    // No dedicated scenarios table exists — scenarios are workforce_headcount_plans
    // rows tagged metadata.type='scenario' (filtered out of all real headcount reads
    // via apps/api/src/modules/workforce-planning/scenario.util.ts). Headcount and
    // requisition columns stay 0 so they can never pollute aggregates or job boards.
    await db.insert(workforceHeadcountPlans).values([
      {
        orgId: org.id,
        planName: 'FY27 Engineering Scale-Up',
        planYear: 2027,
        departmentId: engDept.id,
        currentHeadcount: 0,
        approvedHeadcount: 0,
        targetHeadcount: 0,
        openRequisitions: 0,
        hiringFreezeActive: false,
        status: 'in_review',
        notes: 'Scenario under leadership review for the FY27 platform roadmap.',
        createdAt: anchorPlusDays(-12),
        updatedAt: anchorPlusDays(-4),
        metadata: {
          type: 'scenario',
          createdBy: adminUser.id, // table has no created_by column — carried in metadata
          description: 'Add 6 engineers across the Platform and Product squads to deliver the FY27 roadmap.',
          assumptions: [
            'Engineering attrition holds at 8% through FY27',
            'Average fully-loaded cost of ₹16L per engineer per year',
            `All 6 hires ramped by ${fmt(anchorPlusDays(120))}`,
          ],
          impact: { headcountDelta: 6, costImpactAnnual: 9600000, costImpactLabel: '+₹96L / yr' },
          orgStructure: {
            units: [
              { name: 'Platform Squad', headcount: 11, change: '+3' },
              { name: 'Product Squad', headcount: 11, change: '+3' },
            ],
          },
        },
      },
      {
        orgId: org.id,
        planName: 'Sales Pod Restructure',
        planYear: 2026,
        departmentId: salesDept.id,
        currentHeadcount: 0,
        approvedHeadcount: 0,
        targetHeadcount: 0,
        openRequisitions: 0,
        hiringFreezeActive: false,
        status: 'draft',
        notes: 'Draft scenario — split Sales into two pods with dedicated pod leads.',
        createdAt: anchorPlusDays(-7),
        updatedAt: anchorPlusDays(-7),
        metadata: {
          type: 'scenario',
          createdBy: adminUser.id,
          description: 'Split Sales into an Enterprise pod and an SMB pod; no net headcount change.',
          assumptions: [
            'Existing 5 sales executives redistribute across both pods',
            'Pod leads appointed internally — no new requisitions',
            'Territory quota coverage unchanged for FY27 planning',
          ],
          impact: { headcountDelta: 0, costImpactAnnual: 0, costImpactLabel: 'Cost neutral' },
          orgStructure: {
            units: [
              { name: 'Enterprise Pod', headcount: 3, change: '±0' },
              { name: 'SMB Pod', headcount: 2, change: '±0' },
            ],
          },
        },
      },
      {
        orgId: org.id,
        planName: 'Support Function Consolidation',
        planYear: 2026,
        departmentId: hrDept.id,
        currentHeadcount: 0,
        approvedHeadcount: 0,
        targetHeadcount: 0,
        openRequisitions: 0,
        hiringFreezeActive: false,
        status: 'approved',
        approvedBy: adminUser.id,
        approvedAt: anchorPlusDays(-2),
        notes: 'Approved scenario — merge HR and Finance operations reporting lines.',
        createdAt: anchorPlusDays(-30),
        updatedAt: anchorPlusDays(-2),
        metadata: {
          type: 'scenario',
          createdBy: adminUser.id,
          description: 'Merge HR and Finance operations under one Shared Services lead; one vacated coordinator role is not backfilled.',
          assumptions: [
            'HR Ops and Finance Ops report to a single Shared Services lead',
            'One open coordinator backfill cancelled, saving ₹14L per year',
            'No impact on payroll or statutory compliance SLAs',
          ],
          impact: { headcountDelta: -1, costImpactAnnual: -1400000, costImpactLabel: '-₹14L / yr' },
          orgStructure: {
            units: [
              { name: 'Shared Services — HR Ops', headcount: 2, change: '±0' },
              { name: 'Shared Services — Finance Ops', headcount: 3, change: '-1' },
            ],
          },
        },
      },
    ]);
    console.log('  ✓ Planning scenarios: 3 (in_review/draft/approved)');

    // ── #65: emp01 expense history (no new 'submitted' rows — Sarah's pending
    //    queue and dashboard KPI stay at 12; tracking cards get real amounts) ──
    const emp01ExpenseSeed = [
      { title: 'Client Workshop Travel', status: 'approved', amount: '5600.00', cat: 0, submitted: -18, decided: -16 },
      { title: 'Home Office Internet — May', status: 'reimbursed', amount: '2100.00', cat: 2, submitted: -42, decided: -38 },
      { title: 'Late-night Cab After Release', status: 'rejected', amount: '950.00', cat: 0, submitted: -28, decided: -26 },
    ];
    const emp01ExpenseReports = await db.insert(expenseReports).values(
      emp01ExpenseSeed.map((e) => ({
        orgId: org.id,
        employeeId: empUsers[0].id,
        title: e.title,
        description: `${e.title} — submitted via the expense portal.`,
        totalAmount: e.amount,
        status: e.status,
        submittedAt: anchorPlusDays(e.submitted),
        approvedAt: e.status !== 'rejected' ? anchorPlusDays(e.decided) : null,
      })),
    ).returning();
    await db.insert(expenseItems).values(
      emp01ExpenseReports.map((r, i) => ({
        orgId: org.id,
        reportId: r.id,
        categoryId: expCatRows[emp01ExpenseSeed[i].cat].id,
        date: anchorPlusDays(emp01ExpenseSeed[i].submitted - 2),
        amount: emp01ExpenseSeed[i].amount,
        description: emp01ExpenseSeed[i].title,
        vendor: ['Uber India', 'Airtel Broadband', 'Ola Cabs'][i],
        isActive: true,
      })),
    );
    console.log('  ✓ emp01 expense history: +3 (approved/reimbursed/rejected)');

    // ── Done ─────────────────────────────────────────────────────────────────
    console.log('\n✅ Seed complete!\n');
    console.log('  Credentials:');
    console.log('    admin@acme.com     / Admin@123    (super_admin)');
    console.log('    manager@acme.com   / Manager@123  (manager — Engineering, emp01–08)');
    console.log('    manager2@acme.com  / Manager@123  (manager — Sales, emp09–12)');
    console.log('    manager3@acme.com  / Manager@123  (manager — HR + Finance, emp13–20)');
    console.log('    emp01@acme.com ... emp20@acme.com / Employee@123  (employee)');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
