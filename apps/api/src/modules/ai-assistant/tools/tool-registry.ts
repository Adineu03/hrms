/**
 * Tool registry for the AI assistant (OpenAI Agents SDK).
 *
 * Single source of truth for every HR tool the assistant can use. Each tool is
 * role-tagged (`allowedRoles`) and classified by `kind`:
 *   - query    → has execute(); runs server-side INSIDE the agent loop, result
 *                fed back to the model (enables multi-step). No confirmation.
 *   - mutate   → needsApproval; pauses the run as an interruption → the existing
 *                Allow/Cancel dialog → on approve the SDK calls execute().
 *   - navigate → needsApproval; surfaced to the frontend as a navigation action
 *                (URL built from args). execute() is never reached.
 *   - screen   → needsApproval; surfaced to the frontend as screen actions
 *                (fill/click/read). execute() is never reached.
 *
 * Every execute() is multi-tenancy-safe: it filters by `ctx.orgId` (sourced from
 * the authenticated TenantService context) and `my_*` tools also scope to
 * `ctx.userId`. Role is re-checked server-side as defence in depth.
 */
import { tool, type Tool } from '@openai/agents';
import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import { and, count, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../../infrastructure/database/schema';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee';
export type ToolKind = 'query' | 'mutate' | 'navigate' | 'screen';

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'employee'];
const MGR_ADMIN: UserRole[] = ['super_admin', 'admin', 'manager'];
const ADMIN_ONLY: UserRole[] = ['super_admin', 'admin'];

export interface ToolContext {
  userId: string;
  orgId: string;
  role: string;
  db: PostgresJsDatabase<typeof schema>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}

export interface AgentToolDef {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  allowedRoles: UserRole[];
  kind: ToolKind;
  /** Present for query/mutate tools; absent (no-op) for navigate/screen. */
  execute?: (args: any, ctx: ToolContext) => Promise<ActionResult>;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const ok = (message: string, data?: any): ActionResult => ({ success: true, message, data });
const fail = (message: string, error = 'error'): ActionResult => ({ success: false, error, message });
const num = (v: unknown): number => (v == null ? 0 : Number(v));
const today = (): string => new Date().toISOString().split('T')[0];

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 1;
  return Math.floor((b - a) / 86_400_000) + 1; // inclusive
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const TOOL_DEFS: AgentToolDef[] = [
  // ===== Cross-cutting =====
  {
    name: 'navigate_to_module',
    kind: 'navigate',
    allowedRoles: ALL_ROLES,
    description:
      'Navigate the user to a specific HRMS module page (and optionally a tab). Call this whenever the user asks to go to, open, or show a module or tab.',
    parameters: z.object({
      moduleId: z
        .string()
        .describe(
          'Module id, e.g. core-hr, leave-management, attendance, daily-work-logging, talent-acquisition, onboarding-offboarding, performance-growth, learning-development, compensation-rewards, engagement-culture, platform-experience, payroll-processing, expense-management, compliance-audit, workforce-planning, integrations-api, people-analytics, demo-company, cold-start-setup',
        ),
      tab: z.string().nullable().describe('Optional tab id within the module (role-dependent). Pass null if not specified.'),
    }),
  },
  {
    name: 'interact_with_page',
    kind: 'screen',
    allowedRoles: ALL_ROLES,
    description:
      'Interact with elements on the CURRENT page — fill form fields, click buttons, switch tabs, select dropdown options. Use the page snapshot in your instructions to find selectors. Only call this when a page snapshot is available. Combine multiple actions (e.g. fill then click Save) in one call.',
    parameters: z.object({
      actions: z
        .array(
          z.object({
            type: z.enum(['fill', 'click', 'select_tab', 'select_option', 'scroll_to']),
            selector: z.string().describe('CSS selector for the target element (from the page snapshot)'),
            value: z.string().nullable().describe('Value to fill or option to select; null for click/select_tab/scroll_to'),
            description: z.string().describe('Human-readable description of what this action does'),
            requiresConfirmation: z
              .boolean()
              .nullable()
              .describe('True only for genuinely destructive actions (delete/remove). Filling fields and clicking Save is NOT destructive.'),
          }),
        )
        .describe('Ordered list of actions to execute on the page'),
    }),
  },
  {
    name: 'read_page',
    kind: 'screen',
    allowedRoles: ALL_ROLES,
    description:
      'Read specific values from the current page (table cells, stat values, field contents) by CSS selector. Prefer answering from the page snapshot/screenshot; use this only when you need a value not already visible to you.',
    parameters: z.object({
      selectors: z.array(z.string()).describe('CSS selectors of elements to read (from the page snapshot)'),
    }),
  },
  {
    name: 'query_dashboard_stats',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      'Get organization-wide dashboard statistics: total active employees, active modules, and pending leave approvals. Call this for "how many employees", "active modules", "pending approvals" style questions.',
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const [emp] = await ctx.db
        .select({ total: count() })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, ctx.orgId), eq(schema.users.isActive, true)));
      const [mods] = await ctx.db
        .select({ total: count() })
        .from(schema.orgModules)
        .where(and(eq(schema.orgModules.orgId, ctx.orgId), eq(schema.orgModules.isActive, true)));
      const [pending] = await ctx.db
        .select({ total: count() })
        .from(schema.leaveRequests)
        .where(and(eq(schema.leaveRequests.orgId, ctx.orgId), eq(schema.leaveRequests.status, 'pending')));
      return ok('Dashboard statistics', {
        totalEmployees: num(emp?.total),
        activeModules: num(mods?.total),
        pendingApprovals: num(pending?.total),
      });
    },
  },

  // ===== Core HR =====
  {
    name: 'query_employees',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'Search or list employees in the organization. Returns names, emails, roles and department. Use for "list employees", "find <name>", "who is in <dept>".',
    parameters: z.object({
      search: z.string().nullable().describe('Name or email search term; null to list all'),
      department: z.string().nullable().describe('Filter by department name; null for any'),
      limit: z.number().nullable().describe('Max results (default 10, max 25)'),
    }),
    execute: async (args, ctx) => {
      const limit = Math.min(args.limit || 10, 25);
      const conds = [eq(schema.users.orgId, ctx.orgId), eq(schema.users.isActive, true)];
      if (args.search) {
        conds.push(
          or(
            ilike(schema.users.firstName, `%${args.search}%`),
            ilike(schema.users.lastName, `%${args.search}%`),
            ilike(schema.users.email, `%${args.search}%`),
          )!,
        );
      }
      const rows = await ctx.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          role: schema.users.role,
          department: schema.departments.name,
        })
        .from(schema.users)
        .leftJoin(schema.employeeProfiles, eq(schema.employeeProfiles.userId, schema.users.id))
        .leftJoin(schema.departments, eq(schema.departments.id, schema.employeeProfiles.departmentId))
        .where(and(...conds))
        .limit(limit);

      let employees = rows.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName || ''}`.trim(),
        email: r.email,
        role: r.role,
        department: r.department || null,
      }));
      if (args.department) {
        const d = args.department.toLowerCase();
        employees = employees.filter((e) => (e.department || '').toLowerCase().includes(d));
      }
      const [tot] = await ctx.db
        .select({ total: count() })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, ctx.orgId), eq(schema.users.isActive, true)));
      return ok(`Found ${num(tot?.total)} employees`, {
        employees,
        total: num(tot?.total),
        showing: employees.length,
      });
    },
  },
  {
    name: 'get_employee',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'Get full details for one employee by their user id (department, designation, role, joining date, contact). Use after query_employees when the user wants details on a specific person.',
    parameters: z.object({
      employeeId: z.string().describe('The user id of the employee'),
    }),
    execute: async (args, ctx) => {
      const [row] = await ctx.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          role: schema.users.role,
          isActive: schema.users.isActive,
          department: schema.departments.name,
          designation: schema.designations.name,
          dateOfJoining: schema.employeeProfiles.dateOfJoining,
          employmentType: schema.employeeProfiles.employmentType,
          phone: schema.employeeProfiles.phone,
        })
        .from(schema.users)
        .leftJoin(schema.employeeProfiles, eq(schema.employeeProfiles.userId, schema.users.id))
        .leftJoin(schema.departments, eq(schema.departments.id, schema.employeeProfiles.departmentId))
        .leftJoin(schema.designations, eq(schema.designations.id, schema.employeeProfiles.designationId))
        .where(and(eq(schema.users.id, args.employeeId), eq(schema.users.orgId, ctx.orgId)))
        .limit(1);
      if (!row) return fail('Employee not found', 'not_found');
      return ok('Employee details', {
        ...row,
        name: `${row.firstName} ${row.lastName || ''}`.trim(),
      });
    },
  },
  {
    name: 'create_employee',
    kind: 'mutate',
    allowedRoles: ADMIN_ONLY,
    description:
      'Create a new employee (user + profile) with a temporary password. Requires admin. Call this when an admin asks to add/create/onboard an employee.',
    parameters: z.object({
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name (null if none)'),
      email: z.string().describe('Work email (must be unique in the org)'),
      employmentType: z.string().nullable().describe('full_time, part_time, contract, intern (default full_time)'),
    }),
    execute: async (args, ctx) => {
      const email = String(args.email || '').toLowerCase().trim();
      if (!email) return fail('Email is required', 'invalid');
      const [existing] = await ctx.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, ctx.orgId), eq(schema.users.email, email)))
        .limit(1);
      if (existing) return fail('An employee with this email already exists', 'conflict');

      const passwordHash = await bcrypt.hash('Welcome@123', 10);
      const [newUser] = await ctx.db
        .insert(schema.users)
        .values({
          orgId: ctx.orgId,
          email,
          passwordHash,
          role: 'employee',
          firstName: String(args.firstName).trim(),
          lastName: args.lastName ? String(args.lastName).trim() : null,
          isActive: true,
        })
        .returning();
      await ctx.db.insert(schema.employeeProfiles).values({
        orgId: ctx.orgId,
        userId: newUser.id,
        employmentType: args.employmentType || 'full_time',
      });
      return ok(`Created employee ${newUser.firstName} ${newUser.lastName || ''}`.trim(), {
        id: newUser.id,
        email: newUser.email,
        tempPassword: 'Welcome@123',
      });
    },
  },
  {
    name: 'update_employee',
    kind: 'mutate',
    allowedRoles: ADMIN_ONLY,
    description:
      "Update an existing employee's basic fields (first name, last name, email). Requires admin. Call this when an admin asks to change/rename/correct an employee's details.",
    parameters: z.object({
      employeeId: z.string().describe('The user id of the employee'),
      firstName: z.string().nullable().describe('New first name, or null to leave unchanged'),
      lastName: z.string().nullable().describe('New last name, or null to leave unchanged'),
      email: z.string().nullable().describe('New email, or null to leave unchanged'),
    }),
    execute: async (args, ctx) => {
      const [existing] = await ctx.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(eq(schema.users.id, args.employeeId), eq(schema.users.orgId, ctx.orgId)))
        .limit(1);
      if (!existing) return fail('Employee not found', 'not_found');
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (args.firstName) updates.firstName = String(args.firstName).trim();
      if (args.lastName != null) updates.lastName = String(args.lastName).trim();
      if (args.email) updates.email = String(args.email).toLowerCase().trim();
      if (Object.keys(updates).length === 1) return fail('No fields to update', 'invalid');
      await ctx.db
        .update(schema.users)
        .set(updates)
        .where(and(eq(schema.users.id, args.employeeId), eq(schema.users.orgId, ctx.orgId)));
      return ok('Employee updated', { employeeId: args.employeeId });
    },
  },

  // ===== Leave =====
  {
    name: 'get_my_leave_balance',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      'Get the current user\'s leave balances by leave type (entitled, used, available) for the current year. Call this for "my leave balance", "how many leaves do I have left".',
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const year = String(new Date().getUTCFullYear());
      const rows = await ctx.db
        .select({
          type: schema.leaveTypes.name,
          entitled: schema.leaveBalances.entitled,
          used: schema.leaveBalances.used,
          pending: schema.leaveBalances.pending,
          available: schema.leaveBalances.available,
        })
        .from(schema.leaveBalances)
        .leftJoin(schema.leaveTypes, eq(schema.leaveTypes.id, schema.leaveBalances.leaveTypeId))
        .where(
          and(
            eq(schema.leaveBalances.orgId, ctx.orgId),
            eq(schema.leaveBalances.employeeId, ctx.userId),
            eq(schema.leaveBalances.year, year),
          ),
        );
      const balances = rows.map((r) => ({
        type: r.type || 'Leave',
        entitled: num(r.entitled),
        used: num(r.used),
        pending: num(r.pending),
        available: num(r.available),
      }));
      return ok(balances.length ? `You have ${balances.length} leave type(s)` : 'No leave balances found', {
        year,
        balances,
      });
    },
  },
  {
    name: 'apply_for_leave',
    kind: 'mutate',
    allowedRoles: ALL_ROLES,
    description:
      'Apply for leave on behalf of the current user. Call this when the user wants to request/apply/book leave or time off. Dates are YYYY-MM-DD.',
    parameters: z.object({
      fromDate: z.string().describe('Start date YYYY-MM-DD'),
      toDate: z.string().describe('End date YYYY-MM-DD (same as fromDate for a single day)'),
      reason: z.string().nullable().describe('Reason for the leave (null if none)'),
      leaveType: z.string().nullable().describe('Leave type name or code (e.g. Casual, Sick); null to use the org default'),
    }),
    execute: async (args, ctx) => {
      const types = await ctx.db
        .select({ id: schema.leaveTypes.id, name: schema.leaveTypes.name, code: schema.leaveTypes.code })
        .from(schema.leaveTypes)
        .where(and(eq(schema.leaveTypes.orgId, ctx.orgId), eq(schema.leaveTypes.isActive, true)));
      if (!types.length) return fail('No leave types are configured for your organization', 'no_leave_types');
      let chosen = types[0];
      if (args.leaveType) {
        const q = String(args.leaveType).toLowerCase();
        chosen = types.find((t) => t.name.toLowerCase() === q || t.code.toLowerCase() === q)
          || types.find((t) => t.name.toLowerCase().includes(q)) || types[0];
      }
      const totalDays = daysBetween(args.fromDate, args.toDate);
      const [req] = await ctx.db
        .insert(schema.leaveRequests)
        .values({
          orgId: ctx.orgId,
          employeeId: ctx.userId,
          leaveTypeId: chosen.id,
          fromDate: args.fromDate,
          toDate: args.toDate,
          totalDays: String(totalDays),
          reason: args.reason || null,
          status: 'pending',
        })
        .returning({ id: schema.leaveRequests.id });
      return ok(`Leave request submitted (${totalDays} day(s), ${chosen.name})`, {
        requestId: req.id,
        leaveType: chosen.name,
        totalDays,
      });
    },
  },
  {
    name: 'list_leave_requests',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'List leave requests across the organization, optionally filtered by status. Returns employee name, dates and status. Use for "pending leave requests", "who is on leave".',
    parameters: z.object({
      status: z.enum(['pending', 'approved', 'rejected']).nullable().describe('Filter by status; null for all'),
      limit: z.number().nullable().describe('Max results (default 10, max 25)'),
    }),
    execute: async (args, ctx) => {
      const limit = Math.min(args.limit || 10, 25);
      const conds = [eq(schema.leaveRequests.orgId, ctx.orgId)];
      if (args.status) conds.push(eq(schema.leaveRequests.status, args.status));
      const rows = await ctx.db
        .select({
          id: schema.leaveRequests.id,
          status: schema.leaveRequests.status,
          fromDate: schema.leaveRequests.fromDate,
          toDate: schema.leaveRequests.toDate,
          totalDays: schema.leaveRequests.totalDays,
          reason: schema.leaveRequests.reason,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
        })
        .from(schema.leaveRequests)
        .leftJoin(schema.users, eq(schema.users.id, schema.leaveRequests.employeeId))
        .where(and(...conds))
        .orderBy(desc(schema.leaveRequests.createdAt))
        .limit(limit);
      const [tot] = await ctx.db
        .select({ total: count() })
        .from(schema.leaveRequests)
        .where(and(...conds));
      return ok(`Found ${num(tot?.total)} leave request(s)`, {
        requests: rows.map((r) => ({
          id: r.id,
          employeeName: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
          status: r.status,
          fromDate: r.fromDate,
          toDate: r.toDate,
          totalDays: num(r.totalDays),
          reason: r.reason,
        })),
        total: num(tot?.total),
        showing: rows.length,
      });
    },
  },
  {
    name: 'approve_leave_request',
    kind: 'mutate',
    allowedRoles: MGR_ADMIN,
    description:
      'Approve a pending leave request by its id. Requires manager or admin. Call after locating the request with list_leave_requests.',
    parameters: z.object({
      requestId: z.string().describe('The leave request id to approve'),
    }),
    execute: async (args, ctx) => {
      const [r] = await ctx.db
        .select({ status: schema.leaveRequests.status })
        .from(schema.leaveRequests)
        .where(and(eq(schema.leaveRequests.id, args.requestId), eq(schema.leaveRequests.orgId, ctx.orgId)))
        .limit(1);
      if (!r) return fail('Leave request not found', 'not_found');
      if (r.status !== 'pending') return fail(`Leave request is already ${r.status}`, 'invalid_status');
      await ctx.db
        .update(schema.leaveRequests)
        .set({ status: 'approved', approvedBy: ctx.userId, approvedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.leaveRequests.id, args.requestId), eq(schema.leaveRequests.orgId, ctx.orgId)));
      return ok('Leave request approved', { requestId: args.requestId });
    },
  },
  {
    name: 'reject_leave_request',
    kind: 'mutate',
    allowedRoles: MGR_ADMIN,
    description:
      'Reject a pending leave request by its id, with a reason. Requires manager or admin.',
    parameters: z.object({
      requestId: z.string().describe('The leave request id to reject'),
      reason: z.string().nullable().describe('Reason for rejection (null if none)'),
    }),
    execute: async (args, ctx) => {
      const [r] = await ctx.db
        .select({ status: schema.leaveRequests.status })
        .from(schema.leaveRequests)
        .where(and(eq(schema.leaveRequests.id, args.requestId), eq(schema.leaveRequests.orgId, ctx.orgId)))
        .limit(1);
      if (!r) return fail('Leave request not found', 'not_found');
      if (r.status !== 'pending') return fail(`Leave request is already ${r.status}`, 'invalid_status');
      await ctx.db
        .update(schema.leaveRequests)
        .set({
          status: 'rejected',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
          approverComment: args.reason || null,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.leaveRequests.id, args.requestId), eq(schema.leaveRequests.orgId, ctx.orgId)));
      return ok('Leave request rejected', { requestId: args.requestId });
    },
  },

  // ===== Attendance =====
  {
    name: 'get_my_attendance',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      "Get the current user's recent attendance records (last 14 days): date, status, clock-in/out, work minutes. Use for \"my attendance\", \"when did I clock in\".",
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString().split('T')[0];
      const rows = await ctx.db
        .select({
          date: schema.attendanceRecords.date,
          status: schema.attendanceRecords.status,
          clockIn: schema.attendanceRecords.clockIn,
          clockOut: schema.attendanceRecords.clockOut,
          totalWorkMinutes: schema.attendanceRecords.totalWorkMinutes,
        })
        .from(schema.attendanceRecords)
        .where(
          and(
            eq(schema.attendanceRecords.orgId, ctx.orgId),
            eq(schema.attendanceRecords.employeeId, ctx.userId),
            gte(schema.attendanceRecords.date, since),
          ),
        )
        .orderBy(desc(schema.attendanceRecords.date))
        .limit(14);
      return ok(`Found ${rows.length} recent attendance record(s)`, { records: rows });
    },
  },
  {
    name: 'get_attendance_summary',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'Get the organization attendance summary for a date (present/absent/late/half-day/on-leave counts). Requires manager or admin. Defaults to today.',
    parameters: z.object({
      date: z.string().nullable().describe('Date YYYY-MM-DD; null for today'),
    }),
    execute: async (args, ctx) => {
      const date = args.date || today();
      const [tot] = await ctx.db
        .select({ total: count() })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, ctx.orgId), eq(schema.users.isActive, true)));
      const records = await ctx.db
        .select({ status: schema.attendanceRecords.status })
        .from(schema.attendanceRecords)
        .where(and(eq(schema.attendanceRecords.orgId, ctx.orgId), eq(schema.attendanceRecords.date, date)));
      const total = num(tot?.total);
      const present = records.filter((r) => r.status === 'present').length;
      const late = records.filter((r) => r.status === 'late').length;
      const halfDay = records.filter((r) => r.status === 'half_day').length;
      const onLeave = records.filter((r) => r.status === 'on_leave' || r.status === 'leave').length;
      const absent = Math.max(0, total - present - late - halfDay - onLeave);
      return ok(`Attendance summary for ${date}`, {
        date,
        totalEmployees: total,
        present,
        absent,
        late,
        halfDay,
        onLeave,
      });
    },
  },

  // ===== Expense =====
  {
    name: 'list_expense_reports',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      'List expense reports. Employees see only their own; managers/admins see the whole organization. Optionally filter by status. Use for "my expenses", "pending expense reports".',
    parameters: z.object({
      status: z
        .enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'reimbursed'])
        .nullable()
        .describe('Filter by status; null for all'),
      limit: z.number().nullable().describe('Max results (default 10, max 25)'),
    }),
    execute: async (args, ctx) => {
      const limit = Math.min(args.limit || 10, 25);
      const isManager = MGR_ADMIN.includes(ctx.role as UserRole);
      const conds = [eq(schema.expenseReports.orgId, ctx.orgId)];
      if (!isManager) conds.push(eq(schema.expenseReports.employeeId, ctx.userId));
      if (args.status) conds.push(eq(schema.expenseReports.status, args.status));
      const rows = await ctx.db
        .select({
          id: schema.expenseReports.id,
          title: schema.expenseReports.title,
          totalAmount: schema.expenseReports.totalAmount,
          status: schema.expenseReports.status,
          employeeId: schema.expenseReports.employeeId,
          createdAt: schema.expenseReports.createdAt,
        })
        .from(schema.expenseReports)
        .where(and(...conds))
        .orderBy(desc(schema.expenseReports.createdAt))
        .limit(limit);
      return ok(`Found ${rows.length} expense report(s)`, {
        scope: isManager ? 'organization' : 'mine',
        reports: rows.map((r) => ({
          id: r.id,
          title: r.title,
          totalAmount: num(r.totalAmount),
          status: r.status,
        })),
      });
    },
  },
  {
    name: 'approve_expense_report',
    kind: 'mutate',
    allowedRoles: MGR_ADMIN,
    description:
      'Approve a submitted/under-review expense report by its id. Requires manager or admin. Call after locating it with list_expense_reports.',
    parameters: z.object({
      reportId: z.string().describe('The expense report id to approve'),
    }),
    execute: async (args, ctx) => {
      const [r] = await ctx.db
        .select({ status: schema.expenseReports.status })
        .from(schema.expenseReports)
        .where(and(eq(schema.expenseReports.id, args.reportId), eq(schema.expenseReports.orgId, ctx.orgId)))
        .limit(1);
      if (!r) return fail('Expense report not found', 'not_found');
      if (!['submitted', 'under_review'].includes(r.status))
        return fail(`Expense report is ${r.status} and cannot be approved`, 'invalid_status');
      await ctx.db
        .update(schema.expenseReports)
        .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.expenseReports.id, args.reportId), eq(schema.expenseReports.orgId, ctx.orgId)));
      await ctx.db.insert(schema.expenseApprovals).values({
        orgId: ctx.orgId,
        reportId: args.reportId,
        approverId: ctx.userId,
        action: 'approved',
        level: 1,
      });
      return ok('Expense report approved', { reportId: args.reportId });
    },
  },

  // ===== Performance =====
  {
    name: 'get_my_goals',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      "Get the current user's goals/OKRs with progress and status. Use for \"my goals\", \"how am I tracking\".",
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const rows = await ctx.db
        .select({
          id: schema.goals.id,
          title: schema.goals.title,
          status: schema.goals.status,
          progress: schema.goals.progress,
          priority: schema.goals.priority,
          dueDate: schema.goals.dueDate,
        })
        .from(schema.goals)
        .where(
          and(
            eq(schema.goals.orgId, ctx.orgId),
            eq(schema.goals.employeeId, ctx.userId),
            eq(schema.goals.isActive, true),
          ),
        )
        .orderBy(desc(schema.goals.createdAt))
        .limit(25);
      return ok(`You have ${rows.length} goal(s)`, {
        goals: rows.map((g) => ({ ...g, progress: num(g.progress) })),
      });
    },
  },
  {
    name: 'list_team_performance',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'Get an organization-wide performance snapshot from goals: counts by status and average progress. Requires manager or admin. Use for "team performance", "goal progress overview".',
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const rows = await ctx.db
        .select({ status: schema.goals.status, progress: schema.goals.progress })
        .from(schema.goals)
        .where(and(eq(schema.goals.orgId, ctx.orgId), eq(schema.goals.isActive, true)));
      const byStatus: Record<string, number> = {};
      let progressSum = 0;
      for (const r of rows) {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        progressSum += num(r.progress);
      }
      const avgProgress = rows.length ? Math.round((progressSum / rows.length) * 10) / 10 : 0;
      return ok(`Performance snapshot across ${rows.length} goal(s)`, {
        totalGoals: rows.length,
        byStatus,
        averageProgress: avgProgress,
      });
    },
  },

  // ===== Compensation =====
  {
    name: 'get_my_comp',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      "Get the current user's current compensation (CTC and basic salary) from their active salary assignment. Use for \"my salary\", \"my CTC\", \"my compensation\".",
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const [row] = await ctx.db
        .select({
          ctc: schema.employeeSalaryAssignments.ctc,
          basicSalary: schema.employeeSalaryAssignments.basicSalary,
          effectiveFrom: schema.employeeSalaryAssignments.effectiveFrom,
          structure: schema.salaryStructures.name,
        })
        .from(schema.employeeSalaryAssignments)
        .leftJoin(
          schema.salaryStructures,
          eq(schema.salaryStructures.id, schema.employeeSalaryAssignments.salaryStructureId),
        )
        .where(
          and(
            eq(schema.employeeSalaryAssignments.orgId, ctx.orgId),
            eq(schema.employeeSalaryAssignments.employeeId, ctx.userId),
          ),
        )
        .orderBy(desc(schema.employeeSalaryAssignments.effectiveFrom))
        .limit(1);
      if (!row) return fail('No compensation record is on file for you yet', 'not_found');
      return ok('Your current compensation', {
        ctc: num(row.ctc),
        basicSalary: num(row.basicSalary),
        structure: row.structure || null,
        effectiveFrom: row.effectiveFrom,
      });
    },
  },
  {
    name: 'comp_summary',
    kind: 'query',
    allowedRoles: ADMIN_ONLY,
    description:
      'Get an organization compensation summary: number of employees with salary on file, and average/min/max CTC. Requires admin.',
    parameters: z.object({}),
    execute: async (_args, ctx) => {
      const [agg] = await ctx.db
        .select({
          n: count(),
          avg: sql<number>`coalesce(avg(${schema.employeeSalaryAssignments.ctc}), 0)`,
          min: sql<number>`coalesce(min(${schema.employeeSalaryAssignments.ctc}), 0)`,
          max: sql<number>`coalesce(max(${schema.employeeSalaryAssignments.ctc}), 0)`,
        })
        .from(schema.employeeSalaryAssignments)
        .where(eq(schema.employeeSalaryAssignments.orgId, ctx.orgId));
      return ok('Compensation summary', {
        employeesWithSalary: num(agg?.n),
        averageCtc: Math.round(num(agg?.avg)),
        minCtc: Math.round(num(agg?.min)),
        maxCtc: Math.round(num(agg?.max)),
      });
    },
  },

  // ===== People Analytics =====
  {
    name: 'natural_language_report',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'Answer an analytical/BI question about the organization. Returns a bundle of REAL aggregates (headcount, headcount by department, leave-by-status, today\'s attendance, expense-by-status) for you to base your answer on. Requires manager or admin. Use for "give me a report on…", "how is the org doing", workforce analytics questions.',
    parameters: z.object({
      question: z.string().describe("The user's analytics question, verbatim"),
    }),
    execute: async (args, ctx) => {
      const [emp] = await ctx.db
        .select({ total: count() })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, ctx.orgId), eq(schema.users.isActive, true)));

      const deptRows = await ctx.db
        .select({ department: schema.departments.name, n: count() })
        .from(schema.employeeProfiles)
        .leftJoin(schema.departments, eq(schema.departments.id, schema.employeeProfiles.departmentId))
        .where(eq(schema.employeeProfiles.orgId, ctx.orgId))
        .groupBy(schema.departments.name);

      const leaveRows = await ctx.db
        .select({ status: schema.leaveRequests.status, n: count() })
        .from(schema.leaveRequests)
        .where(eq(schema.leaveRequests.orgId, ctx.orgId))
        .groupBy(schema.leaveRequests.status);

      const attToday = await ctx.db
        .select({ status: schema.attendanceRecords.status, n: count() })
        .from(schema.attendanceRecords)
        .where(and(eq(schema.attendanceRecords.orgId, ctx.orgId), eq(schema.attendanceRecords.date, today())))
        .groupBy(schema.attendanceRecords.status);

      const expRows = await ctx.db
        .select({ status: schema.expenseReports.status, n: count() })
        .from(schema.expenseReports)
        .where(eq(schema.expenseReports.orgId, ctx.orgId))
        .groupBy(schema.expenseReports.status);

      const toMap = (rows: { status?: string | null; department?: string | null; n: number }[], key: 'status' | 'department') =>
        rows.reduce<Record<string, number>>((acc, r) => {
          acc[(r as any)[key] || 'Unassigned'] = num(r.n);
          return acc;
        }, {});

      return ok('Analytics data bundle', {
        question: args.question,
        headcount: num(emp?.total),
        headcountByDepartment: toMap(deptRows as any, 'department'),
        leaveByStatus: toMap(leaveRows as any, 'status'),
        attendanceToday: toMap(attToday as any, 'status'),
        expenseByStatus: toMap(expRows as any, 'status'),
      });
    },
  },

  // ===== Sprint 2A: extended read-only coverage across the remaining modules =====
  {
    name: 'get_my_timesheets',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      "Get the current user's recent timesheet submissions (period, hours, approval status). Use for \"my timesheets\", \"were my hours approved\".",
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          periodStart: schema.timesheetSubmissions.periodStart,
          periodEnd: schema.timesheetSubmissions.periodEnd,
          totalHours: schema.timesheetSubmissions.totalHours,
          billableHours: schema.timesheetSubmissions.billableHours,
          status: schema.timesheetSubmissions.status,
        })
        .from(schema.timesheetSubmissions)
        .where(and(eq(schema.timesheetSubmissions.orgId, ctx.orgId), eq(schema.timesheetSubmissions.employeeId, ctx.userId)))
        .orderBy(desc(schema.timesheetSubmissions.periodStart))
        .limit(8);
      return ok(`Found ${rows.length} recent timesheet submission(s)`, {
        submissions: rows.map((r) => ({ ...r, totalHours: num(r.totalHours), billableHours: num(r.billableHours) })),
      });
    },
  },
  {
    name: 'list_job_postings',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'List the organization\'s job postings with status and application counts. Use for "open positions", "how many applicants".',
    parameters: z.object({
      status: z.enum(['draft', 'published', 'closed', 'archived']).nullable().describe('Filter by status; null for all'),
    }),
    execute: async (args, ctx) => {
      const conds = [eq(schema.jobPostings.orgId, ctx.orgId), eq(schema.jobPostings.isActive, true)];
      if (args.status) conds.push(eq(schema.jobPostings.status, args.status));
      const rows = await ctx.db
        .select({
          title: schema.jobPostings.title,
          status: schema.jobPostings.status,
          applicationCount: schema.jobPostings.applicationCount,
          postingType: schema.jobPostings.postingType,
        })
        .from(schema.jobPostings)
        .where(and(...conds))
        .orderBy(desc(schema.jobPostings.createdAt))
        .limit(15);
      const [tot] = await ctx.db.select({ total: count() }).from(schema.jobPostings).where(and(...conds));
      return ok(`Found ${num(tot?.total)} job posting(s)`, {
        postings: rows.map((r) => ({ ...r, applicationCount: num(r.applicationCount) })),
        total: num(tot?.total),
      });
    },
  },
  {
    name: 'list_onboardings',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'List employee onboarding progress (status, % complete, probation). Use for "who is onboarding", "onboarding status".',
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          status: schema.employeeOnboardings.status,
          progressPercentage: schema.employeeOnboardings.progressPercentage,
          startDate: schema.employeeOnboardings.startDate,
          probationStatus: schema.employeeOnboardings.probationStatus,
        })
        .from(schema.employeeOnboardings)
        .where(and(eq(schema.employeeOnboardings.orgId, ctx.orgId), eq(schema.employeeOnboardings.isActive, true)))
        .orderBy(desc(schema.employeeOnboardings.startDate))
        .limit(20);
      const byStatus: Record<string, number> = {};
      rows.forEach((r) => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      });
      return ok(`Found ${rows.length} onboarding record(s)`, {
        byStatus,
        recent: rows.map((r) => ({ ...r, progressPercentage: num(r.progressPercentage) })),
      });
    },
  },
  {
    name: 'get_my_learning',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      "Get the current user's course enrollments and progress. Use for \"my courses\", \"my training progress\".",
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          status: schema.courseEnrollments.status,
          progress: schema.courseEnrollments.progress,
          score: schema.courseEnrollments.score,
          deadline: schema.courseEnrollments.deadline,
          courseTitle: schema.courses.title,
        })
        .from(schema.courseEnrollments)
        .leftJoin(schema.courses, eq(schema.courses.id, schema.courseEnrollments.courseId))
        .where(and(eq(schema.courseEnrollments.orgId, ctx.orgId), eq(schema.courseEnrollments.employeeId, ctx.userId)))
        .orderBy(desc(schema.courseEnrollments.createdAt))
        .limit(20);
      return ok(`You have ${rows.length} enrollment(s)`, {
        enrollments: rows.map((r) => ({ ...r, progress: num(r.progress) })),
      });
    },
  },
  {
    name: 'list_courses',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description: 'List the course catalog (title, type, mandatory flag, enrollments). Use for "what courses are available".',
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          title: schema.courses.title,
          type: schema.courses.type,
          difficulty: schema.courses.difficulty,
          isMandatory: schema.courses.isMandatory,
          totalEnrollments: schema.courses.totalEnrollments,
        })
        .from(schema.courses)
        .where(and(eq(schema.courses.orgId, ctx.orgId), eq(schema.courses.isActive, true)))
        .orderBy(desc(schema.courses.totalEnrollments))
        .limit(20);
      return ok(`Found ${rows.length} course(s)`, {
        courses: rows.map((r) => ({ ...r, totalEnrollments: num(r.totalEnrollments) })),
      });
    },
  },
  {
    name: 'get_my_payslips',
    kind: 'query',
    allowedRoles: ALL_ROLES,
    description:
      "Get the current user's recent payslips (month, gross, net pay, status). Use for \"my payslips\", \"my net pay last month\".",
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          month: schema.paySlips.month,
          year: schema.paySlips.year,
          grossEarnings: schema.paySlips.grossEarnings,
          netPay: schema.paySlips.netPay,
          status: schema.paySlips.status,
        })
        .from(schema.paySlips)
        .where(
          and(
            eq(schema.paySlips.orgId, ctx.orgId),
            eq(schema.paySlips.employeeId, ctx.userId),
            eq(schema.paySlips.isActive, true),
          ),
        )
        .orderBy(desc(schema.paySlips.year), desc(schema.paySlips.month))
        .limit(6);
      return ok(`Found ${rows.length} payslip(s)`, {
        payslips: rows.map((r) => ({ ...r, grossEarnings: num(r.grossEarnings), netPay: num(r.netPay) })),
      });
    },
  },
  {
    name: 'list_payroll_runs',
    kind: 'query',
    allowedRoles: ADMIN_ONLY,
    description:
      'List recent payroll runs (month, employees, totals, status). Requires admin. Use for "last payroll run", "payroll status".',
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          month: schema.payrollRuns.month,
          year: schema.payrollRuns.year,
          status: schema.payrollRuns.status,
          totalEmployees: schema.payrollRuns.totalEmployees,
          totalNetPay: schema.payrollRuns.totalNetPay,
        })
        .from(schema.payrollRuns)
        .where(and(eq(schema.payrollRuns.orgId, ctx.orgId), eq(schema.payrollRuns.isActive, true)))
        .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
        .limit(8);
      return ok(`Found ${rows.length} payroll run(s)`, {
        runs: rows.map((r) => ({ ...r, totalEmployees: num(r.totalEmployees), totalNetPay: num(r.totalNetPay) })),
      });
    },
  },
  {
    name: 'list_compliance_policies',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'List compliance policies (code, category, status, acknowledgment requirement). Use for "what policies do we have", "compliance status".',
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          title: schema.compliancePolicies.title,
          policyCode: schema.compliancePolicies.policyCode,
          category: schema.compliancePolicies.category,
          status: schema.compliancePolicies.status,
          mandatoryAcknowledgment: schema.compliancePolicies.mandatoryAcknowledgment,
        })
        .from(schema.compliancePolicies)
        .where(eq(schema.compliancePolicies.orgId, ctx.orgId))
        .orderBy(desc(schema.compliancePolicies.createdAt))
        .limit(20);
      return ok(`Found ${rows.length} compliance policy(ies)`, { policies: rows });
    },
  },
  {
    name: 'get_workforce_plan',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'Get headcount planning summary (current vs target headcount, open requisitions, hiring freeze). Use for "headcount plan", "are we hiring".',
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          planName: schema.workforceHeadcountPlans.planName,
          planYear: schema.workforceHeadcountPlans.planYear,
          currentHeadcount: schema.workforceHeadcountPlans.currentHeadcount,
          targetHeadcount: schema.workforceHeadcountPlans.targetHeadcount,
          openRequisitions: schema.workforceHeadcountPlans.openRequisitions,
          hiringFreezeActive: schema.workforceHeadcountPlans.hiringFreezeActive,
          status: schema.workforceHeadcountPlans.status,
        })
        .from(schema.workforceHeadcountPlans)
        .where(and(eq(schema.workforceHeadcountPlans.orgId, ctx.orgId), eq(schema.workforceHeadcountPlans.isActive, true)))
        .orderBy(desc(schema.workforceHeadcountPlans.planYear))
        .limit(10);
      return ok(`Found ${rows.length} headcount plan(s)`, {
        plans: rows.map((r) => ({
          ...r,
          currentHeadcount: num(r.currentHeadcount),
          targetHeadcount: num(r.targetHeadcount),
          openRequisitions: num(r.openRequisitions),
        })),
      });
    },
  },
  {
    name: 'list_integrations',
    kind: 'query',
    allowedRoles: ADMIN_ONLY,
    description:
      'List third-party integration connectors and their health/status. Requires admin. Use for "which integrations are connected", "integration health".',
    parameters: z.object({}),
    execute: async (_a, ctx) => {
      const rows = await ctx.db
        .select({
          connectorName: schema.integrationConnectors.connectorName,
          category: schema.integrationConnectors.category,
          isEnabled: schema.integrationConnectors.isEnabled,
          isAuthenticated: schema.integrationConnectors.isAuthenticated,
          healthStatus: schema.integrationConnectors.healthStatus,
          lastSyncAt: schema.integrationConnectors.lastSyncAt,
        })
        .from(schema.integrationConnectors)
        .where(and(eq(schema.integrationConnectors.orgId, ctx.orgId), eq(schema.integrationConnectors.isActive, true)))
        .orderBy(desc(schema.integrationConnectors.lastSyncAt))
        .limit(20);
      return ok(`Found ${rows.length} connector(s)`, { connectors: rows });
    },
  },
  {
    name: 'list_surveys',
    kind: 'query',
    allowedRoles: MGR_ADMIN,
    description:
      'List engagement/pulse surveys with status and response counts. Use for "active surveys", "how many survey responses".',
    parameters: z.object({
      status: z.enum(['draft', 'scheduled', 'active', 'closed', 'archived']).nullable().describe('Filter by status; null for all'),
    }),
    execute: async (args, ctx) => {
      const conds = [eq(schema.surveys.orgId, ctx.orgId), eq(schema.surveys.isActive, true)];
      if (args.status) conds.push(eq(schema.surveys.status, args.status));
      const rows = await ctx.db
        .select({
          title: schema.surveys.title,
          type: schema.surveys.type,
          status: schema.surveys.status,
          responseCount: schema.surveys.responseCount,
        })
        .from(schema.surveys)
        .where(and(...conds))
        .orderBy(desc(schema.surveys.createdAt))
        .limit(15);
      return ok(`Found ${rows.length} survey(s)`, {
        surveys: rows.map((r) => ({ ...r, responseCount: num(r.responseCount) })),
      });
    },
  },
  // Demo Company: intentionally skipped — sandbox-management data is low value for the assistant.
];

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

const TOOL_BY_NAME = new Map(TOOL_DEFS.map((t) => [t.name, t]));

export function getToolDef(name: string): AgentToolDef | undefined {
  return TOOL_BY_NAME.get(name);
}

export function getToolKind(name: string): ToolKind | undefined {
  return TOOL_BY_NAME.get(name)?.kind;
}

/**
 * Build the SDK tools for an agent, filtered by role. Screen tools are only
 * exposed when a page snapshot is available. `getCtx` resolves the live
 * per-request tenant context at execute time.
 */
export function buildAgentTools(
  role: string,
  getCtx: () => ToolContext,
  hasSnapshot: boolean,
): Tool[] {
  return TOOL_DEFS.filter((def) => def.allowedRoles.includes(role as UserRole))
    .filter((def) => def.kind !== 'screen' || hasSnapshot)
    .map((def) =>
      tool({
        name: def.name,
        description: def.description,
        parameters: def.parameters as any,
        // mutate/navigate/screen pause the run so the app can handle them.
        needsApproval: def.kind !== 'query',
        execute: async (args: any) => {
          // Reached only for query tools (in-loop) and mutate tools (after approve+resume).
          if (!def.execute) return JSON.stringify({ success: true, message: 'handled client-side' });
          const ctx = getCtx();
          if (!def.allowedRoles.includes(ctx.role as UserRole)) {
            return JSON.stringify({ success: false, message: 'You are not authorized to perform this action.' });
          }
          try {
            const result = await def.execute(args, ctx);
            return JSON.stringify(result);
          } catch (err: any) {
            return JSON.stringify({ success: false, message: `Tool failed: ${err?.message || 'unknown error'}` });
          }
        },
      }),
    );
}
