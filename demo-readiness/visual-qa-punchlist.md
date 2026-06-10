# Demo-Readiness — Visual QA Punch-List

> Human eyeball pass over the live app (owner-driven). The Survey Crawler already certified all 263 tab-views as *renders + has data + no errors* (`inventory.md`). This list captures what a human notices that the crawler can't: **blank-feeling tabs, unrealistic/incoherent data, ugly layout, wrong numbers, broken actions, bad copy.** Each item below becomes work in the **Visual-Polish fix sprint**.

> **Fix Sprint 1 status (2026-06-10):** addressed — **#20** (hierarchy seeded: Sarah/Engineering 8, Vikram/Sales 4, Meera/HR+Fin 8; cascades to #21, #22, #29–#32, #34), **#19/#43** (role-scoped sidebar + route guards: manager 13 modules, employee 11; AI assistant navigation enforces the same map), **#66** (Account-Deletion card removed), **#2** (userName join + safe timestamps), **#4** (corrections employeeName), **#16** (audit-trail user/module/entity + config entityName), **#25** (OT summary cards now match the table), **#38** (team budget derived from team CTC; leave-impact populated), **#41** (one team-size source of truth = direct reports; grade distribution counts employees), **#42** (lastUpdated fixed; downloads cut-by-scoping — demo-company hidden for managers). Scoped away by role nav: **#36, #61, #62, #63** (platform-experience hidden for manager/employee). Verify on the owner re-walk.

> **Fix Sprint 2 status (2026-06-10):** **#67 done** — three role-tiered dashboards (admin org-wide / manager direct-reports / employee personal) on the Hybrid A+B design: KPI cards with deltas + sparklines + count-up, recharts trend/donut/bar panels, actionable row-3 widgets (manager approvals queue with inline Review deep-links), skeletons on load, matte-token palette. Backend: role-aware `GET /api/v1/dashboard/overview` computed deterministically from the locked seed (no seed changes). Screenshot script: `apps/web/e2e/dashboard-shots.mjs`.

Status legend — **Type:** Blank · Unrealistic · Layout · WrongNumber · BrokenAction · Copy
**Severity:** 🔴 High (demo-blocker) · 🟠 Med · 🟡 Low

## Punch-list
| # | Module | Role | Tab | What looks wrong | Type | Sev | Fix idea |
|---|---|---|---|---|---|---|---|
| 1 | core-hr | admin | Employee Master | Pencil/edit in Actions column does nothing — editing is broken | BrokenAction | 🔴 | Wire pencil → edit modal + PATCH `/employees/:id`; confirm onClick handler is bound |
| 2 | core-hr | admin | Data Governance | Timestamp column shows "Invalid Date" on all rows; User column empty | WrongNumber + Blank | 🟠 | Backend return valid ISO timestamp + join the actor user; frontend guard the date parse |
| 3 | attendance | admin | Reports & Analytics | Reports look static — AI not used in background (expected it) | Feature/Clarify | 🟡 | These are standard analytics tabs, NOT in the AI feature set — decide: leave as-is or add an AI summary (enhancement, not a bug) |
| 4 | attendance | admin | Corrections | Attendance Corrections table — Employee column blank | Blank | 🟠 | Backend join employee name onto corrections rows |
| 5 | leave-management | admin | Reports & Analytics | Reports look static — AI not used in background (expected it) | Feature/Clarify | 🟡 | Same as #3 — standard analytics, optional AI-summary enhancement |
| 6 | leave-management | admin | Comp-Off Rules | Comp-Off Records table — Employee / Department / Work Date / Actions all blank | Blank | 🟠 | Seed comp-off records + joins; wire the Actions buttons |
| 7 | daily-work-logging | admin | Reports & Analytics | Selecting ANY report type → "Something went wrong" (crash) | BrokenAction | 🔴 | Fix the report endpoint(s) — likely 500 per report type; check params/SQL |
| 8 | daily-work-logging | admin | Integration & Export | Attendance-correlation table — blank columns or zeros | Blank + WrongNumber | 🟠 | Seed + actually compute correlation values |
| 9 | talent-acquisition | admin | Reports & Analytics | No data for any report type; Overview shows only Total Requisitions=5, other 5 stats blank | Blank + WrongNumber | 🟠 | Seed talent data + backend report aggregations for all stat tiles |
| 10 | onboarding-offboarding | admin | Onboarding Workflows · Offboarding Workflows · Document Templates · Compliance & Policy | All 4 tabs blank | Blank | 🔴 | Seed workflows, templates, and policy records for all four tabs |
| 11 | performance-growth | admin | Goal Framework | Empty | Blank | 🟠 | Seed goal frameworks/competency model |
| 12 | performance-growth | admin | Calibration | 3 depts (Eng/Sales/HR), can't add more, each dept blank | Blank + BrokenAction | 🟠 | Seed calibration data per dept; check the add-department action |
| 13 | performance-growth | admin | Audit Trail | "No audit entries yet" | Blank | 🟡 | Seed performance audit entries |
| 14 | performance-growth | admin | PIP Management | Empty | Blank | 🟠 | Seed PIP records |
| 15 | platform-experience | admin | Active Sessions | Large table, all columns empty | Blank | 🟠 | Seed/populate active sessions, or fix the column field mapping |
| 16 | compliance-audit | admin | Audit Trail & Logging | Audit-log User + module/entity columns blank; Trail-config entity column blank | Blank | 🟠 | Backend joins for user/module/entity; seed if thin |
| 17 | workforce-planning | admin | Org Design Studio → Planning Scenarios | Blank, with a "draft" tag | Blank | 🟠 | Seed planning scenarios with real content (not empty drafts) |
| 18 | people-analytics | admin | Report Builder | Purpose unclear / "seems weird" | Copy/UX | 🟡 | Add explanatory copy + a sample saved report; clarify the builder UX |
| 19 | _(all modules)_ | manager | Sidebar | Manager sees all 19 modules incl Cold Start, Integrations, Platform config, Demo Company — not a manager's job | Design/UX | 🟠 | Role-scope the sidebar + route-guards; define the manager module set (see discussion) |
| 20 | core-hr | manager | Team Directory | 20 members all "unassigned", yet Sarah sees all 20 → no reporting hierarchy; team view falls back to whole-org | Bug/Seed (ROOT CAUSE) | 🔴 | Seed a real reporting hierarchy (employees → Sarah); team views must filter by managerId, not show all |
| 21 | core-hr | manager | Compensation (Team Comp Overview) | Blank | Blank | 🟠 | Depends on #20 hierarchy + seed team comp |
| 22 | core-hr | manager | Team Compliance | Total Items + Expiring Soon cards blank | Blank | 🟠 | Seed team compliance items + fix card counts |
| 23 | attendance | manager | Team Dashboard | Shows 20 absent (no attendance today) — seed should populate, not wait for employees to clock in | Blank/Seed | 🟠 | Seed today's + recent attendance (present/varied) around the SEED_TODAY anchor |
| 24 | attendance | manager | Shift Planning | Current/near dates all blank | Blank/Seed | 🟠 | Seed shifts spanning the anchor week |
| 25 | attendance | manager | OT Approval | Cards all 0 but table has 2 pending rows → cards/table mismatch | WrongNumber/Bug | 🟠 | Reconcile card query with the table; seed OT |
| 26 | attendance | manager | Regularization Request | Blank | Blank | 🟠 | Seed regularization requests |
| 27 | attendance | manager | Leave & Attendance (calendar) | Near-current dates blank | Blank/Seed | 🟠 | Seed leave/attendance around the anchor so the calendar shows entries |
| 28 | leave-management | manager | Delegation | Blank | Blank | 🟡 | Seed a delegation example (or intentional empty w/ CTA) |
| 29 | daily-work-logging | manager | Team Dashboard | Blank | Blank | 🟠 | #20 hierarchy + seed team timesheets |
| 30 | daily-work-logging | manager | Approval Queue | Blank | Blank | 🟠 | Seed pending timesheet approvals for the team |
| 31 | daily-work-logging | manager | Productivity | Blank | Blank | 🟠 | Seed + compute productivity |
| 32 | daily-work-logging | manager | Compliance (Timesheet) | Cards 0, table blank | Blank | 🟠 | Seed timesheet compliance |
| 33 | talent-acquisition | manager | Offer Approval | Blank | Blank | 🟠 | Seed offers pending approval |
| 34 | performance-growth | manager | Team Performance (Direct Reports) | Except Name, all zero/blank; Pending Actions + Rating Distribution blank | Blank/Bug | 🟠 | #20 hierarchy + seed reviews/ratings per report |
| 35 | engagement-culture | manager | Feedback & Suggestion | All tables + cards blank | Blank | 🟠 | Seed feedback/suggestions |
| 36 | platform-experience | manager | Custom Dashboards | Unclear / feels weird | Copy/UX | 🟡 | Clarify purpose + a sample dashboard (pairs with admin #18 / people-analytics) |
| 37 | payroll-processing | manager | Approval Workflows | Blank | Blank | 🟠 | Seed approval workflow + pending items |
| 38 | payroll-processing | manager | Team Cost Report | Total Budget + Utilization cards 0; Leave Impact Summary empty | WrongNumber/Blank | 🟠 | Seed budgets + compute; seed leave-impact |
| 39 | compliance-audit | manager | Policy Violation Tracking | Blank | Blank | 🟠 | Seed violations |
| 40 | compliance-audit | manager | Audit Support (Certifications, Evidence Collection) | Blank | Blank | 🟠 | Seed certifications + evidence |
| 41 | workforce-planning | manager | _(multiple tabs)_ | Team-size number inconsistent across tabs (7 vs 20 vs 60) | WrongNumber/Bug | 🟠 | One source of truth for team/headcount; tie to #20 hierarchy |
| 42 | demo-company | manager | Sample Reports | Download PDF + CSV don't work; all reports show "Updated Invalid Date" | BrokenAction + WrongNumber | 🟠 | Wire the downloads; fix updatedAt (Invalid Date = null/bad field) |
| 43 | _(all modules)_ | employee | Sidebar | Employee sees too many modules — should be scoped to self-service relevant ones | Design/UX | 🟠 | Role-scope sidebar (one workstream with #19); employee set ≈ Core HR(self), Leave, Attendance, Daily Work Logging, Performance(self), Talent(internal board), Expense, Payroll(payslips), Engagement |
| 44 | core-hr | employee | Org Chart | Broken + blank | Bug/Blank | 🔴 | Fix org-chart render; depends on hierarchy (#20) for structure |
| 45 | core-hr | employee | Payslip History / Tax Summary | "Coming soon" placeholder | Missing | 🟠 | Build + seed payslip history + tax summary — no "coming soon" in a demo |
| 46 | attendance | employee | My Attendance | Blank calendar — needs current-date data | Blank/Seed | 🟠 | Seed self attendance around the anchor |
| 47 | attendance | employee | Shift Schedule | Blank | Blank/Seed | 🟠 | Seed self shifts |
| 48 | attendance | employee | Shift Swap | Blank | Blank | 🟡 | Seed a shift-swap example or intentional empty w/ CTA |
| 49 | leave-management | employee | Leave Calendar | Blank calendar | Blank/Seed | 🟠 | Seed self leave around the anchor |
| 50 | leave-management | employee | Comp-off | All cards blank | Blank | 🟠 | Seed comp-off balance/records for self |
| 51 | leave-management | employee | Insights | Broken | Bug | 🟠 | Fix insights endpoint/render |
| 52 | daily-work-logging | employee | Daily Timesheet | All zero / no data | Blank/Seed | 🟠 | Seed self timesheet entries around the anchor |
| 53 | daily-work-logging | employee | Timesheet History | All zero / no data | Blank/Seed | 🟠 | Seed history |
| 54 | daily-work-logging | employee | Timer | All zero / no data | Blank | 🟡 | Timer is live-use; seed recent sessions or accept empty |
| 55 | talent-acquisition | employee | Internal Job Board | No data | Blank | 🟠 | Seed internal job postings |
| 56 | talent-acquisition | employee | My Applications | No data | Blank | 🟡 | Seed an application for emp01 (or intentional empty) |
| 57 | talent-acquisition | employee | Interview Schedule | No data | Blank | 🟡 | Seed an interview (or empty) |
| 58 | talent-acquisition | employee | Offer & Joining | No data | Blank | 🟡 | Seed an offer (or empty) |
| 59 | performance-growth | employee | Self-Review | No data | Blank | 🟠 | Seed a self-review cycle |
| 60 | performance-growth | employee | Feedback | No data | Blank | 🟠 | Seed feedback received |
| 61 | platform-experience | employee | Self Service | Almost no data | Blank | 🟠 | Seed self-service items |
| 62 | platform-experience | employee | Search & Navigation | Didn't make sense | Copy/UX | 🟡 | Clarify purpose or drop from demo |
| 63 | platform-experience | employee | Preferences & Accessibility | All mock — nothing actually changes | BrokenAction/Mock | 🟠 | Wire preferences to persist + apply, or mark explicitly non-demo |
| 64 | payroll-processing | employee | Reimbursement Claims | Blank | Blank | 🟠 | Seed reimbursement claims for self |
| 65 | expense-management | employee | Expense Tracking | Cards zero | WrongNumber/Blank | 🟠 | Seed self expenses + fix card counts |
| 66 | compliance-audit | employee | Consent Settings & Account Deletion | Too much power for an employee | Design/Permissions | 🟠 | Reconsider exposing account-deletion to employees — gate behind admin/request flow or remove |
| 67 | _(main dashboard)_ | all | Dashboard | Identical for admin/manager/employee — should differ by role (admin most comprehensive → manager team-scoped → employee personal) | Design/UX | 🔴 | Build role-differentiated dashboards: admin = org KPIs, manager = team KPIs, employee = personal widgets |

## Patterns observed (admin pass — 18 items)
- **Missing backend joins → blank sub-columns** (#2 User, #4 Employee, #6, #16 user/entity): row exists but a joined name/entity isn't returned. The crawler can't catch this (the row isn't "empty"). Cluster of cheap backend fixes.
- **Whole-tab seed gaps the crawler's heuristic missed** (#10 onboarding ×4, #11/#13/#14 performance, #15, #17): tab showed *something* (a header/stat/draft tag) so it wasn't flagged EMPTY, but it's functionally blank. → seed.ts additions.
- **Real bugs / crashes** (#1 edit broken, #7 report crash, #12 can't add dept): genuine functional defects, highest priority.
- **"Reports & Analytics — no AI" (#3, #5):** these tabs were never in the AI feature set (AI = the assistant + 10 standalone features). Standard analytics. Treat AI-in-reports as an *optional enhancement*, not a bug — confirm intent before building.
- This is exactly why the human pass matters: 0 crawler-flagged issues, 18 real ones. ✅

## Patterns observed (manager pass — 24 items)
- **ROOT CAUSE — no reporting hierarchy seeded (#20).** The 20 employees have no manager assigned, so every "team / direct-reports" view either shows the whole org (wrong — Sarah seeing "unassigned" people) or shows nothing (#21, #22, #29, #30, #31, #32, #34, and the inconsistent team counts in #41). **Fixing the seed to put a real team under Sarah is the single highest-leverage fix for the entire manager experience** — it lights up ~8 of these at once. Pair with making team queries filter by `managerId` instead of falling back to all-org.
- **Anchor-date seed gaps (#23, #24, #27).** Attendance/shifts/calendar are blank around "today" because data wasn't seeded relative to `SEED_TODAY`. Agreed with the owner: seed should populate current/recent dates so it looks alive without anyone clocking in.
- **Card-vs-table mismatches (#25, #38, #41).** Stat cards and the table below them are computed by different queries and disagree. Real bugs.
- **Role-scoping (#19).** Sidebar shows admin-only modules to managers — a believability problem for the demo, not just clutter.
- **Broken actions / dates (#42).** Download buttons + "Invalid Date" — same date-bug family as admin #2.

## Patterns observed (employee pass — 25 items)
- **Anchor-date seed gaps repeat** (#46, #49, #52, #53) — blank "my" calendars/timesheets around today. Same fix as manager #23/#27: seed self-data relative to `SEED_TODAY`.
- **Placeholders that shouldn't ship** (#45 "Coming soon", #63 mock preferences, #62 unclear search) — honesty gaps for a demo: either build/seed them or cut them from the walk.
- **Self-data seed gaps** (#50, #55–#61, #64, #65) — employee-scoped tables empty for emp01; seed emp01's records.
- **Real bugs** (#44 org chart, #51 insights).
- **Permissions smell** (#66) — account deletion exposed to employees.

## ⭐ Cross-cutting themes (all 3 passes — these drive the fix-sprint plan)
Beyond the ~67 individual items, **four structural issues** explain most of them and should be tackled as workstreams, not one-offs:
1. **Reporting hierarchy not seeded (#20)** — root cause of most *manager* blanks + inconsistent team counts. Highest leverage single fix.
2. **No role-based navigation/permissions (#19, #43, #66)** — every role sees every module; account-deletion exposed to employees. Needs a per-role module map + route guards.
3. **Dashboards identical across roles (#67)** — should be admin(org) → manager(team) → employee(personal). Currently one shared placeholder.
4. **Recurring seed/data patterns:** anchor-date gaps (today's calendars/timesheets blank), missing backend joins (blank Employee/User/entity columns), card-vs-table mismatches, and the "Invalid Date" family (#2, #42).

**Totals:** 67 items — 🔴 6 high (root-cause/bugs/design) · ~46 🟠 med · ~15 🟡 low. Roughly: **~40 seed-data**, **~12 backend (joins/bugs/endpoints)**, **~8 frontend/UX**, **~4 structural/design**, **~3 "by design / cut from demo"**.

## Notes
- Owner walks the app (`localhost:3000`, logins: admin@acme.com/Admin@123, manager@acme.com/Manager@123, emp01@acme.com/Employee@123) and calls out items one by one.
- Each call-out → one row. Cross-referenced against the crawler screenshot when useful (`apps/web/e2e/screenshots/<role>/<module>/`).
- When the walk is done → group rows into a fix-sprint plan (seed tweaks vs. frontend layout vs. backend bug).
