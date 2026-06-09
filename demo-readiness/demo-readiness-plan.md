# Demo-Readiness Program — Master Plan

> **READ THIS FIRST if you are a fresh session.** This is the single source of truth for making the HRMS **demo-ready**: every tab, in every module, for all three personas, must render with **realistic seeded data** (no blanks/zeros), **work when you press the buttons**, and be **covered by an automated test**. Execution is done by Claude Code sessions, one sprint at a time. Read top to bottom before touching anything.

---

## Goal & Definition of Done

A live demo can open **any** tab in **any** module as **any** of the three roles and it looks complete and works:
- **No blank/zero where there should be data.** Every stat card, table, chart, and list shows realistic numbers.
- **Buttons do real things.** Create/approve/submit/run flows execute and the result reflects in the UI/DB.
- **No errors.** No console errors, no failed `/api/v1/*` calls, no crash/empty-state on a tab meant to have data.
- **Reproducible.** `pnpm seed` regenerates the *exact same* demo dataset every time (deterministic), so the demo looks identical on every run and tests are stable.
- **Proven.** Every tab + key action is covered by a Playwright test that is green.

## Decisions (LOCKED — do not re-litigate)
- **Coverage: EXHAUSTIVE** — every tab in every module, demo-path or not.
- **Personas: ALL THREE** — admin/super_admin, manager, employee.
- **Tooling: PLAYWRIGHT** (UI E2E + the survey crawler). The existing API Supertest e2e stays as a cheap complement.
- **Seed: ENRICH THE MAIN `seed.ts`** (`apps/api/src/infrastructure/database/seed.ts`) — one rich org, re-runnable with `pnpm seed`.
- **Seed is DETERMINISTIC** — fix the RNG (seed faker, e.g. `faker.seed(1503)`) or hand-author key records so data never drifts between runs. This is what makes "real numbers" reproducible and E2E assertions stable.

---

## Method — three layers + the per-tab loop

**Layer 1 — Survey Crawler (observe everything, automatically).**
A Playwright script logs in as each persona, visits every module, auto-discovers and clicks every tab, and records for each: render OK? console errors? failed `/api/v1/*` calls? empty-state / all-zero stats? + a screenshot. Output → `inventory.md` (one row per *module × role × tab* tagged `OK / EMPTY / ERROR`). **This is the "go see the actual thing first" pass.**

**Layer 2 — Seed enrichment + fixes (backend).**
For every `EMPTY` tab → add realistic, deterministic data to `seed.ts`. For every `ERROR` → fix the bug. Most of the program's work lives here (see "Seed gap" below).

**Layer 3 — Action E2E (press the buttons).**
For each tab's key actions, write Playwright specs that click the real button and assert the result lands in the UI/DB.

**The per-tab loop (every sprint):**
```
Survey → Triage (OK / EMPTY / ERROR) → Seed &/or Fix → Action-E2E → Re-survey (must come back green)
```

---

## Pass criteria (the "green gate", encoded in the crawler)
A tab is **green** when ALL hold:
1. It rendered (no thrown error, no error boundary).
2. Zero console errors and zero failed `/api/v1/*` responses (status ≥ 400) during load + interaction.
3. It is **not** showing an empty-state ("No data", "No … found", "Nothing here yet", empty table body) **on a tab that is meant to have data**. *(A genuinely empty concept — e.g. an empty audit log on a brand-new org — is allowed only if we deliberately seed it to look intentional.)*
4. Stat cards are **not all zero** (unless zero is the correct, intentional value).
5. Its key action(s) have a passing Playwright spec.

---

## Data-pollution control (important)
The DB already has leftover orgs/users from past signups/e2e (19 orgs, 59 users). To keep the demo clean and tests stable:
- The demo lives in **one org** (the seeded `admin@acme.com` org). Polish/seed/test that org only.
- **Read/survey specs** are safe (no writes).
- **Action specs that mutate** (create employee, submit expense, run payroll) must either (a) clean up after themselves, or (b) run against a disposable throwaway org created in the spec — never pollute the demo org with test artifacts that show up on screen.
- Before any demo, `pnpm seed` resets the demo org to the locked dataset.

---

## Tooling setup (Sprint 0)
- **Location:** `apps/web/e2e/` with `apps/web/playwright.config.ts`. `baseURL: http://localhost:3000`. (API runs on `http://localhost:3001`, prefix `/api/v1`.)
- **Auth via `storageState`:** a global-setup logs in each persona once and saves `e2e/.auth/{admin,manager,employee}.json`; specs load the matching state instead of logging in every time. (App uses JWT access 15m + refresh; tests run fast, but if a long suite outlives the access token, re-login in setup or handle the refresh.)
- **Prereq to run:** app up (`pnpm dev`), DB seeded (`pnpm seed`), Redis optional. Confirm `OPENAI_API_KEY` only matters for AI tabs.
- **Run commands (the new session adds these):** `pnpm --filter @hrms/web exec playwright test`, `... --ui` for the UI runner, `... --grep @survey` for just the crawler.

### Module IDs (the crawler iterates these — 19)
`cold-start-setup, core-hr, leave-management, attendance, daily-work-logging, talent-acquisition, onboarding-offboarding, performance-growth, learning-development, compensation-rewards, engagement-culture, platform-experience, payroll-processing, expense-management, compliance-audit, workforce-planning, integrations-api, people-analytics, demo-company`
Route pattern: `/dashboard/modules/<id>`. The dashboard rendered per role is admin/manager/employee-specific; tabs differ by role.

### Survey Crawler — scaffold (refine selectors in Sprint 0 against the real DOM)
```ts
// apps/web/e2e/survey.spec.ts  — STARTER. Confirm the tab-bar + empty-state selectors
// against a couple of real dashboards first, then generalize.
import { test, expect } from '@playwright/test';
import fs from 'fs';

const MODULES = [
  'cold-start-setup','core-hr','leave-management','attendance','daily-work-logging',
  'talent-acquisition','onboarding-offboarding','performance-growth','learning-development',
  'compensation-rewards','engagement-culture','platform-experience','payroll-processing',
  'expense-management','compliance-audit','workforce-planning','integrations-api',
  'people-analytics','demo-company',
];
const ROLES = ['admin','manager','employee'] as const;
const EMPTY_RX = /no .*(found|data|records|items)|nothing here|get started|no results/i;

for (const role of ROLES) {
  test.describe(`survey:${role}`, () => {
    test.use({ storageState: `e2e/.auth/${role}.json` });
    for (const mod of MODULES) {
      test(`@survey ${role} ${mod}`, async ({ page }) => {
        const consoleErrors: string[] = [];
        const apiErrors: string[] = [];
        page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
        page.on('pageerror', e => consoleErrors.push(String(e)));
        page.on('response', r => {
          if (r.url().includes('/api/v1/') && r.status() >= 400) apiErrors.push(`${r.status()} ${r.url()}`);
        });

        await page.goto(`/dashboard/modules/${mod}`);
        await page.waitForLoadState('networkidle').catch(() => {});

        // Discover tab buttons in the module tab bar. ADJUST this selector in Sprint 0.
        const tabs = page.locator('[role="tab"], nav button, .tab-bar button');
        const count = await tabs.count();
        const rows: any[] = [];

        for (let i = 0; i < Math.max(count, 1); i++) {
          if (count) { await tabs.nth(i).click().catch(() => {}); }
          await page.waitForTimeout(700);
          const label = count ? (await tabs.nth(i).innerText().catch(() => `tab${i}`)) : 'default';
          const bodyText = await page.locator('main').innerText().catch(() => '');
          const looksEmpty = EMPTY_RX.test(bodyText);
          // crude all-zero stat detection: every stat-like number on the page is 0
          const nums = (bodyText.match(/\b\d[\d,]*\b/g) || []).map(n => Number(n.replace(/,/g,'')));
          const allZero = nums.length > 0 && nums.every(n => n === 0);
          const dir = `e2e/screenshots/${role}/${mod}`;
          fs.mkdirSync(dir, { recursive: true });
          await page.screenshot({ path: `${dir}/${i}-${label.replace(/\W+/g,'_')}.png`, fullPage: true });
          rows.push({ role, mod, tab: label.trim(),
            status: apiErrors.length || consoleErrors.length ? 'ERROR' : (looksEmpty || allZero ? 'EMPTY' : 'OK'),
            apiErrors: [...apiErrors], consoleErrors: consoleErrors.slice(0,3) });
        }
        fs.appendFileSync('e2e/inventory.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
        // Survey never fails the run — it REPORTS. Triage happens from inventory.md.
        expect(true).toBeTruthy();
      });
    }
  });
}
```
After running, a tiny script converts `e2e/inventory.jsonl` → `demo-readiness/inventory.md` (the human-readable triaged table).

---

## `inventory.md` format (living artifact — Sprint 0 creates it, every sprint updates it)
| Module | Role | Tab | Status | Notes | Screenshot |
|---|---|---|---|---|---|
| core-hr | admin | Employee Master | OK | 39 rows | `…/core-hr/0.png` |
| talent-acquisition | admin | Job Postings | EMPTY | no postings seeded | `…/0.png` |
| payroll-processing | manager | Runs | ERROR | 500 GET /api/v1/payroll/… | `…/2.png` |

---

## The Sprints

### Sprint 0 — Foundation + Full Survey ✅ DONE (2026-06-08)
- Install Playwright in `apps/web`; config + global-setup login for the 3 personas → `storageState`.
- Build + run the Survey Crawler (refine the tab-bar + empty-state selectors against 2–3 real dashboards first).
- Generate **`inventory.md`** (all ~230 tabs tagged). Triage into a per-module worklist.
- **Acceptance:** every module×role×tab has a row + screenshot; the EMPTY/ERROR list is the backlog for Sprints 1–6. *No fixing this sprint.*

**Result — 260 tab-views surveyed: 84 OK / 146 EMPTY / 30 ERROR.** Harness lives at `apps/web/e2e/` (`playwright.config.ts`, `global-setup.ts`, `survey.spec.ts`, `build-inventory.mjs`); re-run any sprint with `pnpm --filter @hrms/web test:survey` then `… survey:report`. Triaged backlog by cluster: S1=24, S2=31, S3=44, S4=26, S5=34, S6=17 (176 to fix). The 30 ERRORs: 13× API 500, 11× API 404 (missing endpoints), 4× API 403 (performance-growth **manager** — RBAC bug), 1× API 400, 1× frontend crash (daily-work-logging admin "Approval Workflows" → `workflow.delegationRules.map is not a function`). **Confirmed selectors/gotchas for future runs:** tab bar = `main .flex.gap-1.min-w-max > button` (tag-agnostic — modules use `<div>`, `<nav>` [compliance-audit, workforce-planning], or a pill `<div>` [demo-company, integrations-api, people-analytics]); the whole feature mode is in ONE `<ErrorBoundary>` so one crashing tab takes down the module; the auth layout shows a pre-hydration "Loading…" screen with no `<main>` → the crawler reload-retries when stuck (run at **2 workers** to limit dev-server compile races). cold-start-setup **manager** is a genuine tab-less welcome screen (1 row, OK).

### Sprints 1–6 — Module clusters (seed + fix + E2E + re-survey green)
Order = demo priority + dependency. For **each module × each role × each tab**: seed realistic deterministic data → fix any ERROR → write Playwright action-specs for the key buttons → re-run the crawler on those modules until **all green**.

**Sprint 1 ✅ DONE (2026-06-09)** — cluster `cold-start-setup`, `core-hr`, `leave-management` is 100% green (49/49 tab-views). Also did the foundational seed work that benefits all sprints: made `seed.ts` **deterministic** (`faker.seed(1503)` + a single `SEED_TODAY = 2026-06-09` anchor driving every time-relative date) and **idempotent** (delete-demo-org-cascade-then-insert — the seed had never actually run before, so this reset the drifted "TechVista/38-emp" org to the clean "Acme Corp"/20-emp dataset). Seeded 13 gap tables + emergency-contacts/bank-details/address on profiles; added 6 missing leave routes; fixed ~16 frontend bugs (data-extraction field mismatches, React key-props, the team-calendar `employees[].days[]→leaves` transform); tightened the crawler so a populated tab with one empty sub-section isn't false-flagged EMPTY. Whole-app baseline after Sprint 1: **150 OK / 86 EMPTY / 27 ERROR** (was 84/146/30).

**Sprint 2 ✅ DONE (2026-06-09)** — cluster `attendance`, `daily-work-logging`, `payroll-processing` is 100% green (47/47 tab-views). Fan-out: one sub-agent per module fixed its own backend+frontend (non-overlapping dirs) and returned a seed snippet; merged all three into `seed.ts`. Backend bug classes fixed: the `= ANY(${jsArray})` drizzle pattern (12 sites → `inArray()`, the payroll manager 500s), a raw-`sql` Date comparison (statutory calendar 500 → `lt()`), 4 missing routes (attendance reports ×3, dwl corrections/disputes, dwl timer projects/categories), a 400 (regularization missed-punches → optional date params w/ 30-day default), and current-month-empty fallbacks (`resolveRun` → latest run). Seeded 12 gap tables (overtime, attendance breaks, projects/task-categories/assignments + linked the 400 timesheet entries, timesheet policy, disputes, salary components, payroll config, statutory filings, 80 payslips Feb–May, 12 tax declarations). Many EMPTYs were just frontend data-extraction (wrong response field). Crawler hardened again: a tab with a populated config form (≥4 inputs) or a list of item-action buttons (≥4) is no longer false-flagged EMPTY. Whole-app baseline after Sprint 2: **178 OK / 65 EMPTY / 20 ERROR**.

**Sprint 3 ✅ DONE (2026-06-09)** — cluster `talent-acquisition`, `onboarding-offboarding`, `performance-growth` is 100% green (54/54 tab-views). Fan-out per module: missing routes (talent offers/referrals 500→inArray + new routes; onboarding manager team-roster + employee documents/orientation/post-joining), the 4× perf manager 403s (manager tabs called admin `/core-hr/admin/employees` → switched to `/core-hr/manager/team`), + heavy frontend fixes. **Big recurring bug class this sprint: drizzle `numeric` columns serialize as STRINGS** ("4.00") and `?? 0` does NOT catch a string → `.toFixed()` threw and crashed whole dashboards; fixed with `Number(x)||0`. Also `.replace`/`.split`/`.map` on undefined/object fields, and React key-props. Crashes cascade through the single `<ErrorBoundary>`, hiding downstream tabs — so fixing took 3 reveal-rounds; final round had agents **proactively harden every tab** in their module. Also fixed Candidate Review action buttons (addNote `text`→`content`; move-stage name→`stageId` + new `/stages` route). Seeded talent (requisitions/candidates/applications/interviews/offers/referrals), onboarding (journey/tasks/offboardings/exit-interview/handover), performance (cycle/reviews/goals/competencies/dev-plans/1-on-1s). Whole-app baseline after Sprint 3: **204 OK / 51 EMPTY / 8 ERROR**.

> ⚠️ **Incident (recovered):** during Sprint 3 a sub-agent ran `git checkout seed.ts` to "undo" a temp edit, discarding all uncommitted Sprint 1/2 seed enrichment. The live DB was intact, so seed.ts was rebuilt from the live DB (deterministic + idempotent, faithfully reproducing all data). **All work is now committed on branch `demo-readiness-sprints-0-3`** — future agents must NEVER run `git checkout/restore/stash/reset` (now in every agent prompt). Commit after every sprint.

**Sprint 4 ✅ DONE (2026-06-09)** — cluster `learning-development`, `compensation-rewards`, `expense-management` is 100% green (32/32 tab-views). Fan-out per module; each agent fixed + **proactively hardened every tab** + returned a seed snippet (merged into `seed.ts`). Backend: the `=ANY`→`inArray` bug was rampant here (expense had **13** + 2 raw-`sql` Date-bind bugs → `gte`; comp had 6) — these were the 500s. Most EMPTYs were pure seed gaps (L&D had ALL its tables empty). Seeded: L&D (10 courses, enrollments, 5 paths, 6 certs, 5 budgets, 3 sessions), comp (1 increment cycle +20 items, 3 recognition programs, 8 nominations, reward points/txns), expense (4 policies). Confirmed the numeric-string + field-mismatch + key-prop classes are everywhere — agents now harden whole modules in one pass. Whole-app baseline after Sprint 4: ~**236 OK** (final after full re-survey).

**Sprint 5 ✅ DONE (2026-06-09)** — cluster `engagement-culture`, `compliance-audit`, `workforce-planning` is 100% green (41/41 tab-views). Backlog was 29 EMPTY + 2 ERROR. Fan-out one sub-agent per module (fix own backend+frontend, harden every tab, return a seed snippet); merged all 3 snippets into `seed.ts`. The 2 ERRORs were both engagement-culture `=ANY`→`inArray` 500s (manager team-wellness + feedback/suggestions). Most EMPTYs were pure seed gaps; many were also frontend field-mismatches the agents fixed (e.g. workforce: `isFrozen`→`hiringFreezeActive`, budget `actualAmount`→`actualSpend`, succession `coveragePercent`→`successionCoveragePercent`, mobility `pending`→`pendingCount`; engagement: latest-period array extraction, `current.breakdown` nesting). Seeded: engagement (5 culture values, 5 surveys +46 responses, 4 wellness programs +14 enrollments, 3 groups +7 posts, 32 engagement scores), workforce (7 role/grade defs, 5 headcount plans, 4 budgets, 4 succession plans +6 candidates, 6 transfer/mobility requests), compliance (5 policies +acks, 5 trainings +60 completions, 6 checklists, 6 retention configs, 5 ethics, 4 DSAR). **5 reveal-round fixes** after the first green pass (all surfaced because seeding revealed latent bugs): (1) labor-law manager tab repurposed `complianceChecklists` for a working-hours table → undefined keys + blank cells; reshaped the backend service to return proper per-team-member working-hours/leave-compliance + a contractor register; (2) admin Engagement Analytics "action items" read off the wrong response → wired the dedicated `/analytics/action-items` endpoint which now **derives** items from low-engagement depts; (3) emp01 demo persona had the lowest engagement score (22) → special-cased to 82 so "My Engagement" shows a badge; (4) manager Succession Dashboard tripped on the one zero-candidate (Finance) plan → gave it a development candidate; (5) `MyEngagementScoreTab` badges/`participation` keyless map + the participation endpoint returned aggregates not an activity array → returned a real activity feed. Whole-app baseline after Sprint 5: **250 OK / 12 EMPTY / 1 ERROR** (263 tab-views) — all 13 remaining are Sprint 6.

| Sprint | Cluster (module ids) |
|---|---|
| 1 ✅ | `cold-start-setup`, `core-hr`, `leave-management` — the foundation (Core HR feeds everything) |
| 2 ✅ | `attendance`, `daily-work-logging`, `payroll-processing` — the time → pay chain |
| 3 ✅ | `talent-acquisition`, `onboarding-offboarding`, `performance-growth` — the lifecycle |
| 4 ✅ | `learning-development`, `compensation-rewards`, `expense-management` |
| 5 ✅ | `engagement-culture`, `compliance-audit`, `workforce-planning` |
| 6 | `integrations-api`, `people-analytics`, `platform-experience`, `demo-company` |

**Per-sprint acceptance:** every tab in the cluster (all 3 roles) is green in `inventory.md`; each key action has a passing spec; `inventory.md` updated.

### Sprint 7 — Dress Rehearsal + Lock
- Full crawler re-run across all 230 tabs → 100% green (no EMPTY/ERROR).
- Run the complete demo end-to-end as each persona; fix stragglers.
- **Lock the seed** (deterministic; document exactly what it produces). Re-running `pnpm seed` must give the identical dataset.
- Wire the Playwright suite into CI as a regression net.
- **Acceptance:** all-green survey + a written "demo script" the owner can follow + reproducible seed.

---

## Seed enrichment guidance
- **Already seeded (verify):** Core HR (employees, depts, designations, profiles), Attendance, Leave (balances+requests), Daily Work Logging (timesheets), Payroll (1 run+entries), Expense (reports). These may still have thin tabs.
- **Likely thin/empty (confirm via survey) — the bulk of the work:** Talent (job postings, candidates, interviews, offers), Onboarding/Offboarding, Performance (goals, reviews, feedback, cycles), Learning (courses, enrollments, paths), Compensation (salary structures, assignments, bands, rewards), Engagement (surveys+responses, recognition), Compliance (policies, audits, training), Workforce Planning (plans, scenarios, headcount), Integrations (connectors, logs), People Analytics (depends on the above), Platform/Experience, Demo Company.
- **Make it realistic:** sensible names, dates spread across recent months, varied statuses (not everything "pending"), believable amounts. Cross-link to the existing 20 employees so manager/employee views are populated too.
- **Deterministic:** `faker.seed(<fixed>)` at the top of `seed.ts`; avoid `Date.now()`/`Math.random()` — derive dates from a fixed "today" anchor passed in.
- **Idempotent:** re-running `pnpm seed` should reset the demo org cleanly (truncate-then-insert for that org), not pile up duplicates.

## Fan-out strategy (compress wall-clock)
Within a cluster sprint, dispatch **one sub-agent per module** (each does survey-triage → seed → fix → E2E for its module), then reconcile the seed edits and re-run the crawler once. Keeps context lean and matches the preferred working style. The seed file is the one shared write surface — have sub-agents return their seed additions as diffs to merge, to avoid clobbering.

---

## Footguns / what NOT to goof up
- [ ] **Seed must be deterministic + idempotent** — random/append seeds break demos and tests.
- [ ] **Don't pollute the demo org** with action-test artifacts — clean up or use a throwaway org.
- [ ] **The survey REPORTS, it doesn't fail the build** — triage happens from `inventory.md`, not red CI.
- [ ] **Confirm tab-bar + empty-state selectors** against real DOM before trusting the crawler's EMPTY/ERROR tags.
- [ ] **Re-survey after every sprint** — "green gate" is the definition of done, not "I think I fixed it."
- [ ] **Respect multi-tenancy** — all seed rows carry the demo org's `org_id`.
- [ ] **Three roles, not one** — a tab can be fine for admin and broken/empty for employee. Survey all three.

## Reference
- **Logins:** `admin@acme.com`/`Admin@123` (super_admin), `manager@acme.com`/`Manager@123`, `emp01@acme.com`/`Employee@123` (emp01–emp20).
- **Run:** `pnpm dev` (web :3000, api :3001), `pnpm seed` (reset data). Redis optional.
- **Key files:** seed → `apps/api/src/infrastructure/database/seed.ts`; dashboards/tabs → `apps/web/src/components/modules/<module>/{admin,manager,employee}-dashboard.tsx` + `tabs/<role>/*.tsx`; module route → `apps/web/src/app/(dashboard)/dashboard/modules/[moduleId]`.
- **Artifacts:** this plan + `demo-readiness/inventory.md` (living) + `apps/web/e2e/` (Playwright).
