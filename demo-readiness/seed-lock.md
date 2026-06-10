# Demo Seed — Lock & Specification

**Status: LOCKED ✅ (re-locked 2026-06-10, Fix Sprint 1).** The demo dataset is **deterministic** and **idempotent**. Re-running `pnpm seed` always produces the identical "Acme Corp" dataset documented below. This is the dataset behind the **100% green** demo-readiness survey (all allowed role×module tab-views OK; role-guarded cells assert the redirect and report **GUARDED** — see the survey baseline below).

> **Fix Sprint 1 (2026-06-10) changes:** a real **reporting hierarchy** (3 managers — see credentials), `departments.headId` set, `gradeId`/`locationId` backfilled on all 20 profiles, timesheet submissions 2→**4** (2 pending for the manager queue), and **role-scoped navigation** (manager sees 13 modules / employee 11; hidden modules redirect → survey records GUARDED).

- **Seed script:** `apps/api/src/infrastructure/database/seed.ts`
- **Run:** `pnpm seed` (from repo root)
- **Verify:** `pnpm --filter @hrms/web test:survey` → `pnpm --filter @hrms/web survey:report` → `demo-readiness/inventory.md` should read **220 OK / 0 EMPTY / 0 ERROR / 14 GUARDED** (234 rows).

---

## Guarantees

### Deterministic
- `faker.seed(1503)` is set at module load, before any faker call → identical fake values every run.
- A single time anchor `SEED_TODAY = 2026-06-09` drives **every** time-relative date via helpers:
  - `anchorPlusDays(n)` → a `Date` n days from the anchor (negative = past).
  - `fmt(d)` → `'YYYY-MM-DD'` string for `date`-typed columns.
- **No `Math.random()`, no `Date.now()`, no arg-less `new Date()`** anywhere in the seed — all "randomness" is seeded faker or index-based math.

### Idempotent
- The seed begins by deleting the demo org by slug (`acme-corp`); all ~90 `org_id` foreign keys cascade-delete, then everything is re-inserted fresh.
- Re-running is safe and resets any drift (manual edits, action-test artifacts) back to this exact dataset.

### Shifting the demo period
- Bump `SEED_TODAY` in `seed.ts` and re-run to move the whole dataset to a new "current" window — "this month" / "current period" views stay populated because every date is anchor-relative. Keep it at `2026-06-09` to match the locked survey baseline.

---

## Credentials (all under org **Acme Corp**)

| Persona | Login | Password | Name / Role |
|---|---|---|---|
| Admin | `admin@acme.com` | `Admin@123` | Alex Kumar — super_admin |
| Manager (demo persona) | `manager@acme.com` | `Manager@123` | Sarah Mehta — manager, **Engineering (emp01–08, 8 directs)** |
| Manager 2 | `manager2@acme.com` | `Manager@123` | Vikram Rao — manager, **Sales (emp09–12, 4 directs)** |
| Manager 3 | `manager3@acme.com` | `Manager@123` | Meera Joshi — manager, **HR + Finance (emp13–20, 8 directs)** |
| Employee | `emp01@acme.com` … `emp20@acme.com` | `Employee@123` | 20 employees (emp01 is the primary demo persona — given a healthy engagement score + badge) |

**Reporting hierarchy (Fix Sprint 1):** every employee profile has a real `managerId` (emp01–08 → Sarah, emp09–12 → Vikram, emp13–20 → Meera); `departments.headId` is set (Eng → Sarah, Sales → Vikram, HR/Finance → Meera). All "team" views filter by direct reports — **Sarah's expected numbers:** team 8 · pending leave 5 · pending OT 2 · pending timesheets 2 · pending expenses 3 · reviews 7 / goals 7 / dev plans 3 / one-on-ones 4 · offboarding 1 / exit interview 1.

Prereqs: local PostgreSQL (DB `hrms`, `DATABASE_URL=postgresql://postgres@127.0.0.1:5432/hrms`) + Redis. App up via `pnpm dev` (web :3000, api :3001).

---

## Produced dataset (authoritative inventory)

### Organization & people (Core HR)
- **1** org (Acme Corp), **24** users (1 admin + 3 managers + 20 employees)
- **19** modules — all activated + setup-completed (feature mode renders directly, no setup walls)
- **4** departments (Engineering, Sales, HR, Finance) with `headId` set; **8** designations; **20** employee profiles (with emergency contacts / bank / address, `managerId`, `gradeId`, `locationId`)
- **3** locations, **5** grades, **2** legal entities
- emp01–08 → Engineering (Sarah), emp09–12 → Sales (Vikram), emp13–16 → HR (Meera), emp17–20 → Finance (Meera)
- Grade spread: L2 ×14, L3 ×5, L4 ×1 (from designation level); locations: remote Eng → Remote—India, Sales → Mumbai, rest → Bengaluru HQ

### Time & attendance
- **3** shifts (General/Morning/Night); **20** shift assignments → General
- **440** attendance records (22 weekdays × 20); **14** attendance breaks; **5** overtime requests; **8** comp-off records
- **12** holiday calendar entries

### Leave
- **3** leave types (Casual/Sick/Earned); **60** balances (20 × 3); **15** requests (5 pending + 10 approved); **2** approval workflows

### Daily work logging
- **5** projects, **6** task categories, **20** project assignments; **400** timesheet entries (linked to projects/categories); **1** timesheet policy; **4** submissions (2 rejected/disputed + 2 pending approval from Sarah's team)

### Payroll
- **1** finalized run (Feb 2026) + **20** entries; **80** payslips (Feb–May); **7** salary components; **1** payroll config; **7** statutory filings; **12** investment declarations
- **3** salary structures, **20** salary assignments

### Expense
- **10** expense reports (3 draft / 3 submitted / 4 approved); **4** expense policies

### Talent acquisition
- **5** requisitions, **5** pipeline stages, **3** postings, **5** candidates, **5** applications, **3** interviews, **3** offers, **3** referrals

### Onboarding / offboarding
- **1** onboarding journey + **9** tasks; **2** offboardings; **1** exit interview; **1** knowledge transfer

### Performance & growth
- **1** review cycle + **10** review assignments; **10** goals; **6** competency frameworks; **5** development plans; **5** one-on-one meetings

### Learning & development
- **10** courses + enrollments; **5** learning paths; **6** certifications; **5** learning budgets; **3** training sessions

### Compensation & rewards
- **1** revision cycle (+20 items); **3** recognition programs; **8** nominations; reward points + transactions

### Engagement & culture
- **5** culture values; **5** surveys + **46** responses; **4** wellness programs + **14** enrollments; **3** social groups + **7** posts; **32** engagement scores (2 periods)

### Workforce planning
- **7** role/grade definitions; **5** headcount plans; **4** budgets; **4** succession plans + **6** candidates; **6** transfer/mobility requests

### Compliance & audit
- **5** policies + acknowledgments (~75%); **5** trainings + **60** completions; **6** regulatory checklists; **6** document-retention configs; **5** ethics complaints; **4** DSAR requests

### People analytics & BI
- **5** custom KPIs; **4** saved reports; **24** metric snapshots (12 months × headcount + attrition)

### Platform & experience
- **5** notification templates; **100** per-employee notifications; **3** team announcements; **4** custom dashboards + **12** widgets; **84** bookmarks

### Integrations & API
- **7** connectors (4 healthy / 1 degraded / 1 error / 1 unknown); **5** integration logs; **4** API keys; **4** webhooks; **4** OAuth apps; **4** data-sync configs

### Demo company
- **2** demo orgs; **4** guided tours (3 published); **24** demo sessions

### Cross-cutting
- **4** benefit plans + **50** enrollments; **5** custom field definitions; **24** audit logs; **62** documents; **12** self-service requests; **5** org change requests

---

## Re-survey / regression check (manual, local)

The Playwright survey is the regression net. It **reports** (never fails the build) — run it whenever the seed or any module changes:

```bash
pnpm dev            # web :3000, api :3001 (separate terminal)
pnpm seed           # reset to this locked dataset
pnpm --filter @hrms/web test:survey      # crawl all 57 role×module tests
pnpm --filter @hrms/web survey:report    # regenerate demo-readiness/inventory.md
```

**Role-scoped baseline (Fix Sprint 1, verified 2026-06-10):** the survey is guard-aware — modules hidden for a role (per `packages/shared/src/constants/role-modules.ts`: manager 13 / employee 11 / admin all 19) must redirect deep links to `/dashboard` and are recorded as **GUARDED** (counts as OK; a missing redirect is an ERROR "GUARD MISSING"). Locked baseline = **220 OK / 0 EMPTY / 0 ERROR / 14 GUARDED (234 rows)** — admin 106 OK · manager 59 OK + 6 GUARDED · employee 55 OK + 8 GUARDED. Any EMPTY/ERROR is a regression — triage from the per-tab notes + screenshots under `apps/web/e2e/screenshots/`.

> CI gating on the survey was intentionally **not** wired (per owner decision) — the survey stays a deterministic local/manual regression tool, preserving the locked "survey reports, never fails the build" stance.
