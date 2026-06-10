# Demo Polish — Fix-Sprint Plan

> **READ THIS FIRST if you are a fresh session.** This plan fixes the **67 visual-QA findings** the owner logged while walking the live app as all three roles. The backlog is **[`demo-readiness/visual-qa-punchlist.md`](visual-qa-punchlist.md)** (items #1–#67) — that is the source of truth for *what's broken*; this doc is *how and in what order we fix it*. The Survey Crawler already certifies all 263 tabs as "renders + has data + no errors"; these 67 are the things a **human** saw that automation can't: blank-feeling tabs, incoherent data, broken buttons, and structural/UX problems.

---

## The headline: 4 structural themes drive most of the 67
Fix these as **workstreams**, not one-offs — each cascades:
1. **🔴 No reporting hierarchy seeded (#20)** → root cause of most *manager* blanks + inconsistent team counts. Highest-leverage single fix.
2. **Role-based navigation & permissions (#19, #43, #66)** → all roles see all 19 modules; employees even see an Account-Deletion button.
3. **🔴 Dashboards identical across roles (#67)** → must become role-tiered AND **state-of-the-art UI** (owner's explicit ask — this is the showpiece, see the design spec in Fix Sprint 2).
4. **Recurring data patterns** → anchor-date seed gaps (blank "today" calendars/timesheets), missing backend joins (blank Employee/User/entity columns), card-vs-table mismatches, and the "Invalid Date" family.

Rough split of the 67: **~40 seed-data · ~12 backend (joins/bugs/endpoints) · ~8 frontend/UX · ~4 structural · ~3 cut-or-by-design.**

---

## Sprint overview (4 fix sprints)
- **Fix Sprint 1 — Structural foundations** (#20 hierarchy, #19/#43/#66 role nav+perms, + the shared data-layer fix utilities). Clears a big chunk by cascade.
- **Fix Sprint 2 — State-of-the-art Dashboards** (#67). Dedicated, because it's the first screen and must be *excellent*, not just non-blank. Depends on Sprint 1's hierarchy.
- **Fix Sprint 3 — Per-module seed + bug grind** (the ~40 seed blanks + the crashes/broken actions), clustered by module, re-survey after each cluster.
- **Fix Sprint 4 — Re-walk + re-survey + lock** (owner re-walks, crawler re-runs to 263-green, seed re-locked, cut/by-design calls finalized).

> **Golden rules every sprint:** keep the seed **deterministic + idempotent** (extend `seed.ts` the same way it's already built — `faker.seed(1503)`, dates derived from the `SEED_TODAY=2026-06-09` anchor via the existing `anchorPlusDays`/`fmt` helpers; never `Math.random`/`Date.now`/argless `new Date()`). After each sprint, re-run `pnpm seed` then `pnpm --filter @hrms/web test:survey` → `survey:report` and confirm still **263 OK / 0 / 0**. Respect the **light matte theme** (tokens below). Don't pollute the demo org.

---

## Fix Sprint 1 — Structural foundations

### 1A. Seed the reporting hierarchy (#20) — do this first, it cascades
- Today the 20 employees have **no manager** → "team" views show the whole org (wrong) or nothing (blank), and team counts disagree (7 vs 20 vs 60, #41).
- **Seed a real org chart in `seed.ts`:** make **Sarah (manager@acme.com)** manage a team of ~6–8; create 1–2 more managers so there's a believable 2-level structure; assign every employee a `managerId`/reporting line and a department. Keep it deterministic.
- **Make team queries filter by `managerId`** (direct reports), not fall back to all-org. Establish **one source of truth** for "team size" so every tab agrees (#41).
- **Cascade-clears:** #21, #22, #29, #30, #31, #32, #34, and the team-count inconsistency.

### 1B. Role-based navigation & permissions (#19, #43, #66)
- Define a **per-role module map** (which of the 19 modules each role sees). Suggested:
  - **admin/super_admin:** all 19.
  - **manager:** core-hr, leave-management, attendance, daily-work-logging, performance-growth, talent-acquisition, expense-management, compensation-rewards, engagement-culture, people-analytics. *(No cold-start-setup, integrations-api, platform config, compliance-audit admin, workforce-planning admin, demo-company.)*
  - **employee:** core-hr (self), leave-management, attendance, daily-work-logging, performance-growth (self), talent-acquisition (internal board only), expense-management, payroll-processing (payslips), engagement-culture.
- **Filter the sidebar** by role + add **route guards** so deep-linking a disallowed module redirects. Find the nav under the dashboard layout (`apps/web/src/app/(dashboard)/`); the module list comes from `module-store.ts` / the module registry — filter there.
- **#66:** remove/gating the employee **Account Deletion** action (a request-to-admin flow at most; never a self-serve hard delete).
- **Caveat:** the AI assistant's `navigate_to_module` should also respect role (it already only exposes role-allowed tools — verify navigation honors the same map).

### 1C. Shared data-layer fix utilities (kills several patterns at once)
- **"Invalid Date" family (#2, #42):** add/confirm a single date formatter that renders `null`/invalid as `—`; ensure backends return ISO strings. Fix the actual null `updatedAt`/timestamp sources.
- **Missing-join helper (#2 user, #4, #16):** standard pattern — `leftJoin` the actor/employee and map the name/entity onto the row. Apply to the flagged tables now; reuse in Sprint 3.
- **Card-vs-table source-of-truth (#25, #38, #41):** make each stat card aggregate from the **same** query/filter as the table beneath it.

**Acceptance:** Sarah sees only her real team everywhere; team counts agree; each role's sidebar is scoped; no "Invalid Date"; the flagged join columns are populated. Re-survey green.

---

## Fix Sprint 2 — State-of-the-art Dashboards (#67)

> The owner's explicit bar: **"the dashboard should be excellent and state-of-the-art, UI-wise."** This is the first screen every persona lands on (`apps/web/src/app/(dashboard)/dashboard/page.tsx`) and today it's one shared placeholder. Rebuild it as **three role-tiered, genuinely beautiful dashboards.**

### Tech
- **Add `recharts`** (only a chart lib, not a UI kit — keeps the hand-rolled, theme-token style). Lazy-load charts to keep initial JS lean.
- Build small **themed wrappers** so every chart matches the matte palette: `<KpiCard>`, `<TrendChart>` (area/line), `<DonutChart>`, `<BarChart>`, `<Sparkline>`, `<ProgressStat>`. Colors come from the tokens (primary `#2563eb`, accent `#059669`, muted `#6b7280`), never hardcoded clashing hues.
- Reuse the existing **skeleton** loaders (`components/ui/`) and **EmptyState** for graceful states.

### Design language (light matte — non-negotiable)
- Background `#f5f5f0`; cards white `rounded-2xl border border-[#e5e5e0] shadow-sm hover:shadow-md transition`; generous padding (`p-5/6`), comfortable grid gaps (`gap-6`).
- Type hierarchy: KPI value `text-3xl font-semibold text-text`; label `text-xs uppercase tracking-wide text-text-muted`; section heads `text-lg font-semibold`.
- Deltas: ▲ green `#059669` / ▼ red, vs prior period. Restrained chart palette (primary + accent + muted tints). Subtle motion only (hover elevation, mount fade/slide, optional count-up). Fully responsive (KPIs 1→2→4 cols; charts stack on mobile). Accessible contrast + semantics.

### Layout (same skeleton, role-specific content)
1. **Header:** greeting + date + role badge + 2–3 **quick actions**.
2. **Row 1 — 4 KPI cards:** label · big number · delta vs prior period · mini sparkline · icon.
3. **Row 2 — 2 charts:** a trend (area/line) + a breakdown (donut/bar).
4. **Row 3 — actionable widgets:** pending items list (inline action), recent-activity feed, an "upcoming" mini-calendar/list.

### Per-role content
- **Admin (org-wide):** KPIs = Headcount (+hires MTD), Attendance Rate today, Pending Approvals (org), Monthly Payroll Cost. Charts = Headcount trend (6 mo area) + Department distribution (donut). Widgets = org pending approvals, recent activity, expiring-compliance alert, hiring-funnel snapshot.
- **Manager (team — needs 1A):** KPIs = Team Size, Present Today, My Pending Approvals, Team Avg Performance. Charts = Team attendance today (donut) + Team performance ratings (bar). Widgets = approvals awaiting me (inline approve), who's on leave today, recent team activity.
- **Employee (personal):** KPIs = Leave Balance, Attendance This Month %, Open Goals/Tasks, Next Payslip (net). Charts = leave balance by type (radial/bar) + my attendance this month (mini-calendar/heat strip). Widgets = my request statuses, upcoming holidays/leave, quick actions (apply leave / submit expense / clock-in).

### Backend
- Extend `apps/api/src/shared/stats/` into a **role-aware** dashboard payload: `GET /api/v1/dashboard/overview` returns the role-appropriate KPIs + chart series + widget lists (admin=org, manager=team via hierarchy, employee=self). All tenant+role scoped; values deterministic from the seed. Add trend/series data the charts need.

**Acceptance:** all three dashboards are polished, responsive, real-data, skeleton-on-load, matte-consistent, and pass an eyeball "does this look state-of-the-art?" review. No blanks/zeros. Re-survey green.

---

## Fix Sprint 3 — Per-module seed + bug grind
Work the remaining punch-list items, clustered by module. For each: seed realistic deterministic data (anchor-relative for time-sensitive tabs), fix the bug, re-survey that cluster green. Fan out one sub-agent per module; merge `seed.ts` additions as diffs.

- **Crashes / broken actions (do first):** #1 (Employee Master edit), #7 (DWL Reports crash), #51 (Leave Insights broken), #42 (Demo Company downloads), #63 (Preferences are mock), #45 (Payslip "Coming soon").
- **Attendance/time anchor-date seeding:** #23, #24, #26, #27 (mgr) · #46, #47, #48, #52, #53, #54 (emp) — seed attendance/shifts/timesheets/calendar around `SEED_TODAY`.
- **Module seed blanks:** #6, #8, #9 (admin) · #10 (onboarding ×4), #11–#14, #15, #17 (admin) · #28, #33, #35, #37, #39, #40 (mgr) · #44, #49, #50, #55–#61, #64, #65 (emp) · #15/#9 talent reports.
- **Joins/cards (instances of the 1C patterns):** #4, #16, #21, #22, #38.
- **UX/clarify:** #18, #36, #62 (Search & Navigation), #15.

**Acceptance:** every cluster's tabs render with realistic data; the listed crashes/actions work; re-survey green.

---

## Fix Sprint 4 — Re-walk + re-survey + lock
- Owner re-walks all three personas (use the same punch-list format; expect near-zero new items).
- Crawler full re-run → **263 OK / 0 / 0**.
- **Decide the "cut or by-design" items:** #3/#5 (AI-in-reports — enhancement, not bug; build or mark by-design), #62 (Search & Navigation — clarify or cut), #54/#48/#56–#58 (live-use tabs — seed a sample or intentional empty-with-CTA).
- Re-lock the seed (`demo-readiness/seed-lock.md` updated with the new tables/rows). Tree clean, type-checks green.

---

## Footguns / what NOT to goof up
- [ ] **Don't break the locked seed contract** — extend deterministically + idempotently; re-running `pnpm seed` must still produce a stable dataset. Update `seed-lock.md`.
- [ ] **Re-survey after every sprint** — must stay 263-green; new data must not introduce console/API errors.
- [ ] **Role nav must not break the AI assistant or deep links** — guard by role, redirect disallowed, keep assistant navigation role-consistent.
- [ ] **Light matte theme only** — use the tokens; no clashing chart colors, no heavy UI kit. The dashboard must look *designed*, not generic.
- [ ] **Manager/employee data depends on the hierarchy (1A)** — don't attempt their dashboards/team tabs before the hierarchy seed lands.
- [ ] **Don't pollute the demo org** with test artifacts.

## Reference
- **Theme tokens (globals.css):** `--color-background #f5f5f0` · `--color-card #ffffff` · `--color-text #2c2c2c` · `--color-text-muted #6b7280` · `--color-border #e5e5e0` · `--color-primary #2563eb` · `--color-accent #059669`.
- **Key files:** main dashboard → `apps/web/src/app/(dashboard)/dashboard/page.tsx`; dashboard backend → `apps/api/src/shared/stats/`; seed → `apps/api/src/infrastructure/database/seed.ts`; seed lock → `demo-readiness/seed-lock.md`; sidebar/nav → under `apps/web/src/app/(dashboard)/` + `lib/module-store.ts`; survey → `apps/web/e2e/` (`pnpm --filter @hrms/web test:survey` → `survey:report`).
- **Backlog:** `demo-readiness/visual-qa-punchlist.md` (#1–#67).
- **Logins/run:** `pnpm dev` (web :3000, api :3001) + `pnpm seed`; admin@acme.com/Admin@123, manager@acme.com/Manager@123, emp01@acme.com/Employee@123.
