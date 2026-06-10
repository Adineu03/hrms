import { MODULES } from './modules';
import type { UserRole } from '../types/auth';

/**
 * Per-role module visibility map — the single source of truth consumed by:
 * - the web sidebar (filters the module list for non-admins)
 * - the web route guard (deep-linking a disallowed module redirects to /dashboard)
 * - the AI assistant's navigate_to_module tool (denies disallowed targets)
 * - the Playwright survey (disallowed role×module cells assert the redirect → GUARDED)
 */

const ALL_MODULE_IDS: readonly string[] = Object.keys(MODULES);

const MANAGER_MODULE_IDS: readonly string[] = [
  'core-hr',
  'attendance',
  'leave-management',
  'daily-work-logging',
  'talent-acquisition',
  'performance-growth',
  'compensation-rewards',
  'engagement-culture',
  'payroll-processing',
  'expense-management',
  'compliance-audit',
  'workforce-planning',
  'people-analytics',
];

const EMPLOYEE_MODULE_IDS: readonly string[] = [
  'core-hr',
  'attendance',
  'leave-management',
  'daily-work-logging',
  'talent-acquisition',
  'performance-growth',
  'learning-development',
  'engagement-culture',
  'payroll-processing',
  'expense-management',
  'compliance-audit',
];

export const ROLE_MODULE_ACCESS: Record<UserRole, readonly string[]> = {
  super_admin: ALL_MODULE_IDS,
  admin: ALL_MODULE_IDS,
  manager: MANAGER_MODULE_IDS,
  employee: EMPLOYEE_MODULE_IDS,
};

/** Unknown roles fail closed (empty list). */
export function getAllowedModuleIds(role: string | null | undefined): readonly string[] {
  if (!role) return [];
  return ROLE_MODULE_ACCESS[role as UserRole] ?? [];
}

export function isModuleAllowedForRole(
  role: string | null | undefined,
  moduleId: string,
): boolean {
  return getAllowedModuleIds(role).includes(moduleId);
}
