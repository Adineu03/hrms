import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Demo-Readiness Survey Crawler (Sprint 0).
 *
 * For each persona × module: navigate the module route, discover every tab, click each,
 * and REPORT per tab — render OK? console/pageerror? failed /api/v1/* call? empty state?
 * + a fullPage screenshot. Writes one JSON result file per (role × module) to e2e/results/.
 *
 * This NEVER fails the build — it observes and reports. Triage happens from inventory.md
 * (built by e2e/build-inventory.mjs).
 *
 * Selectors below are CONFIRMED against the real DOM (not guesses) — see the plan in
 * demo-readiness/demo-readiness-plan.md and the Sprint 0 notes.
 */

const MODULES: { id: string; name: string }[] = [
  { id: 'cold-start-setup', name: 'Cold Start Setup' },
  { id: 'core-hr', name: 'Core HR & People Data' },
  { id: 'leave-management', name: 'Leave Management' },
  { id: 'attendance', name: 'Time & Attendance' },
  { id: 'daily-work-logging', name: 'Daily Work Logging' },
  { id: 'talent-acquisition', name: 'Talent Acquisition' },
  { id: 'onboarding-offboarding', name: 'Onboarding & Offboarding' },
  { id: 'performance-growth', name: 'Performance & Growth' },
  { id: 'learning-development', name: 'Learning & Development' },
  { id: 'compensation-rewards', name: 'Compensation & Rewards' },
  { id: 'engagement-culture', name: 'Engagement & Culture' },
  { id: 'platform-experience', name: 'Platform & Experience' },
  { id: 'payroll-processing', name: 'Payroll Processing' },
  { id: 'expense-management', name: 'Expense Management' },
  { id: 'compliance-audit', name: 'Compliance & Audit' },
  { id: 'workforce-planning', name: 'Workforce Planning' },
  { id: 'integrations-api', name: 'Integrations & API' },
  { id: 'people-analytics', name: 'People Analytics' },
  { id: 'demo-company', name: 'Demo Company' },
];

const ROLES = ['admin', 'manager', 'employee'] as const;

// Empty-state text patterns. The shared EmptyState component takes its text as props, so we
// match common phrasings AND a structural marker (the .py-14 EmptyState container) — but a
// tab is only EMPTY if it ALSO lacks a populated data table (see `hasData` below), so a
// populated tab with one empty SUB-section (e.g. "Coming Soon" / "No blocked dates") is NOT
// flagged. The "no … <noun>" gap is bounded to a few words so it can't span table cells.
const EMPTY_RX =
  /\bno\s+(?:[\w'-]+\s+){0,3}(found|data|records|requests|items|results|policies|plans|entries|assignments|assigned|configured|enrolled|added|yet|available)\b|nothing (?:here|to show|yet)|no results found|haven'?t (?:added|created|configured|enrolled)/i;

// Console messages that are pure Next.js/React dev noise — never a real finding.
const BENIGN_CONSOLE_RX =
  /react devtools|download the react|\[fast refresh\]|\[hmr\]|webpack-hmr|hot-update/i;

const RESULTS_DIR = path.join(__dirname, 'results');
const SHOTS_DIR = path.join(__dirname, 'screenshots');

interface TabRow {
  role: string;
  mod: string;
  moduleName: string;
  pageTitle: string;
  tabIndex: number;
  tab: string;
  status: 'OK' | 'EMPTY' | 'ERROR';
  looksEmpty: boolean;
  errorBoundary: boolean;
  apiErrors: string[];
  pageErrors: string[];
  consoleErrors: string[];
  screenshot: string; // path relative to apps/web, for the report
  note: string;
}

function safe(label: string): string {
  return (label || 'tab').replace(/\s+/g, '_').replace(/[^\w-]/g, '').slice(0, 40) || 'tab';
}

/** Wait until no loading spinners remain in <main> (bounded). */
async function waitForSpinnersGone(page: Page, timeout = 8000): Promise<void> {
  const spinner = page.locator('main .animate-spin');
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const c = await spinner.count().catch(() => 0);
    if (c === 0) return;
    await page.waitForTimeout(250);
  }
}

/**
 * Settle the page: the authenticated layout only renders <main> after auth loads from
 * localStorage; before hydration the route shows a bare "Loading..." screen with no <main>.
 * Wait for <main> (absorbs slow first-compile), then the h1 OR tab bar, then spinners.
 * Returns whether the h1 / tab bar are present, so the caller can retry a stuck page.
 */
async function settle(page: Page): Promise<{ h1: boolean; tabbar: boolean }> {
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  await Promise.race([
    page.locator('main h1').first().waitFor({ state: 'visible', timeout: 25000 }).catch(() => {}),
    page.locator('main .flex.gap-1.min-w-max').first().waitFor({ state: 'visible', timeout: 25000 }).catch(() => {}),
  ]);
  await waitForSpinnersGone(page);
  await page.waitForTimeout(500);
  const h1 = (await page.locator('main h1').count().catch(() => 0)) > 0;
  const tabbar = (await page.locator('main .flex.gap-1.min-w-max > button').count().catch(() => 0)) > 0;
  return { h1, tabbar };
}

for (const role of ROLES) {
  test.describe(`survey:${role}`, () => {
    test.use({ storageState: `e2e/.auth/${role}.json` });

    for (const mod of MODULES) {
      test(`@survey ${role} ${mod.id}`, async ({ page }) => {
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        const apiErrors: string[] = [];

        page.on('console', (m) => {
          if (m.type() === 'error') {
            const t = m.text();
            if (!BENIGN_CONSOLE_RX.test(t)) consoleErrors.push(t.slice(0, 300));
          }
        });
        page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
        page.on('response', (r) => {
          if (r.url().includes('/api/v1/') && r.status() >= 400) {
            apiErrors.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
          }
        });

        const rows: TabRow[] = [];
        const shotDir = path.join(SHOTS_DIR, role, mod.id);
        fs.mkdirSync(shotDir, { recursive: true });
        const relShot = (file: string) => path.posix.join('e2e/screenshots', role, mod.id, file);

        await page.goto(`/dashboard/modules/${mod.id}`, { waitUntil: 'domcontentloaded' }).catch(() => {});

        let s = await settle(page);
        // If the page is stuck on the pre-hydration "Loading..." screen (no h1, no tab bar) and
        // we didn't land on /login, reload once — the route is compiled by now, so the retry
        // hydrates promptly. Cures dev-server first-compile races under parallel load.
        if (!s.h1 && !s.tabbar && !page.url().includes('/login')) {
          await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
          s = await settle(page);
        }

        const pageTitle = (await page.locator('main h1').first().innerText().catch(() => '')).trim();
        const url = page.url();

        // ── Defensive: detect non-feature-mode screens (shouldn't happen on the seeded org) ──
        if (url.includes('/login')) {
          const file = '0-AUTH_REDIRECT.png';
          await page.screenshot({ path: path.join(shotDir, file), fullPage: true }).catch(() => {});
          rows.push(blankRow(role, mod, pageTitle, 0, 'default', 'ERROR', {
            note: 'Redirected to /login — storageState auth not applied',
            screenshot: relShot(file),
          }));
          return flush(rows, role, mod);
        }

        const earlyBody = await page.locator('main').innerText().catch(() => '');
        if (/Activate Module|does not exist|Contact your administrator to activate/i.test(earlyBody)) {
          const file = '0-NOT_ACTIVE.png';
          await page.screenshot({ path: path.join(shotDir, file), fullPage: true }).catch(() => {});
          rows.push(blankRow(role, mod, pageTitle, 0, 'default', 'EMPTY', {
            note: 'Module not active / setup screen (not in feature mode)',
            screenshot: relShot(file),
            looksEmpty: true,
          }));
          return flush(rows, role, mod);
        }

        // ── Discover tabs (tag-agnostic: covers the <div>, <nav>, and pill-styled tab bars) ──
        const tabBar = page.locator('main .flex.gap-1.min-w-max').first();
        const tabs = tabBar.locator('> button');
        let count = await tabs.count().catch(() => 0);
        if (count === 0) {
          // Grace: the tab bar may still be rendering. Poll briefly before concluding the page
          // is a genuine single-view (e.g. the cold-start welcome screen).
          await tabs.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
          count = await tabs.count().catch(() => 0);
        }
        const n = Math.max(count, 1);

        for (let i = 0; i < n; i++) {
          const cErrBefore = consoleErrors.length;
          const pErrBefore = pageErrors.length;
          const aErrBefore = apiErrors.length;

          let label = 'default';
          if (count > 0) {
            label = (await tabs.nth(i).innerText().catch(() => `tab${i}`)).trim() || `tab${i}`;
            await tabs.nth(i).click({ timeout: 10000 }).catch(() => {});
            await waitForSpinnersGone(page);
            await page.waitForTimeout(500);
          }

          const bodyText = await page.locator('main').innerText().catch(() => '');
          const errorBoundary =
            (await page
              .locator('main h2', { hasText: 'Something went wrong' })
              .count()
              .catch(() => 0)) > 0;
          // Structural empty-state marker: the EmptyState container uses py-14 (loading=py-12, error=py-20).
          const emptyMarker = (await page.locator('main .py-14').count().catch(() => 0)) > 0;
          // "Has real data" rescues a populated tab that merely contains an empty SUB-section
          // (e.g. "Coming Soon", "No blocked dates", a seeded rule label "No future-dated
          // entries"). Real content shows up as: a non-empty data table row, OR a populated
          // config form (≥4 inputs/selects), OR a list of item-action buttons (≥4 buttons
          // beyond the tab bar). A genuinely empty tab shows just an EmptyState ± a single CTA.
          const totalRows = await page.locator('main tbody tr').count().catch(() => 0);
          const emptyRows = await page.locator('main tbody tr:has(.py-14)').count().catch(() => 0);
          const hasDataTable = totalRows - emptyRows >= 1;
          const formControls = await page.locator('main input, main select, main textarea').count().catch(() => 0);
          const allButtons = await page.locator('main button').count().catch(() => 0);
          const contentButtons = Math.max(0, allButtons - count); // exclude the tab-bar buttons
          const hasData = hasDataTable || formControls >= 4 || contentButtons >= 4;
          const rxMatch = bodyText.match(EMPTY_RX);
          const looksEmpty = (emptyMarker || !!rxMatch) && !hasData;

          const newConsole = consoleErrors.slice(cErrBefore);
          const newPage = pageErrors.slice(pErrBefore);
          const newApi = apiErrors.slice(aErrBefore);

          const file = `${i}-${safe(label)}.png`;
          await page.screenshot({ path: path.join(shotDir, file), fullPage: true }).catch(() => {});

          const hasError = errorBoundary || newApi.length > 0 || newPage.length > 0 || newConsole.length > 0;
          const status: TabRow['status'] = hasError ? 'ERROR' : looksEmpty ? 'EMPTY' : 'OK';

          const noteParts: string[] = [];
          if (errorBoundary) noteParts.push('error boundary ("Something went wrong")');
          if (newApi.length) noteParts.push(`api: ${newApi.slice(0, 3).join(' | ')}`);
          if (newPage.length) noteParts.push(`pageerror: ${newPage[0]}`);
          if (newConsole.length) noteParts.push(`console: ${newConsole[0]}`);
          if (status === 'EMPTY') {
            noteParts.push(
              emptyMarker
                ? 'empty-state component shown'
                : `empty-text matched: "${(rxMatch?.[0] || '').trim().slice(0, 40)}"`,
            );
          }

          // The whole feature mode is wrapped in one <ErrorBoundary> (see the module page). Once
          // a tab throws, the boundary replaces the entire module — tab bar included — so the
          // remaining tabs are unreachable. Record the crash and stop (don't emit phantom rows
          // for buttons that no longer exist).
          const moduleCrashed = errorBoundary && count > 0 && i < count - 1;
          if (moduleCrashed) {
            noteParts.push(
              `module-level crash — ErrorBoundary swallowed the whole module; remaining ${count - 1 - i} tab(s) unreachable`,
            );
          }

          rows.push({
            role,
            mod: mod.id,
            moduleName: mod.name,
            pageTitle,
            tabIndex: i,
            tab: label,
            status,
            looksEmpty,
            errorBoundary,
            apiErrors: newApi,
            pageErrors: newPage,
            consoleErrors: newConsole,
            screenshot: relShot(file),
            note: noteParts.join('; '),
          });

          if (moduleCrashed) break;
        }

        flush(rows, role, mod);
        // The survey REPORTS — it never fails the build.
        expect(true).toBeTruthy();
      });
    }
  });
}

function blankRow(
  role: string,
  mod: { id: string; name: string },
  pageTitle: string,
  tabIndex: number,
  tab: string,
  status: TabRow['status'],
  extra: Partial<TabRow>,
): TabRow {
  return {
    role,
    mod: mod.id,
    moduleName: mod.name,
    pageTitle,
    tabIndex,
    tab,
    status,
    looksEmpty: false,
    errorBoundary: false,
    apiErrors: [],
    pageErrors: [],
    consoleErrors: [],
    screenshot: '',
    note: '',
    ...extra,
  };
}

function flush(rows: TabRow[], role: string, mod: { id: string }) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, `${role}__${mod.id}.json`), JSON.stringify(rows, null, 2));
}
