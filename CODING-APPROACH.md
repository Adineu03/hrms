# AI-Native HRMS — Coding Approach & Architecture Document

> **Author:** Aditya
> **Date:** 26 February 2026
> **Status:** Finalized (pre-development)
> **Purpose:** Single source of truth for all architectural decisions, build order, and conventions before writing any code.

---

## 1. What We're Building

A **multi-tenant, AI-native HRMS SaaS product** with 19 modules, 465 features (265 Standard + 176 AI-Powered + 24 Additional), serving 3 personas (Employee, Manager, Admin/HR).

The key differentiator: **plug-n-play module system** — organizations pick only the modules they need, complete a guided setup for each, and are live within minutes using smart industry defaults.

---

## 2. Source of Truth — The Excel

**File:** `HRMS-Complete-Feature-Blueprint-version-3.xlsx`

This Excel file is the **single source of truth** for every feature in the system. Every feature built must trace back to this file.

### Excel Structure (per sheet)
- **Column A:** Role headers (`Employee`, `Manager`, `Admin / HR`) and section headers (`STANDARD FEATURES`, `AI-POWERED FEATURES`, `— ADDITIONAL FEATURES (Cross-Cutting) —`)
- **Column B:** Feature group names (e.g., "Accept Invitation & Onboard")
- **Column C:** Individual feature bullet points (prefixed with `•`)

### 19 Module Sheets

| # | Sheet Name | Module |
|---|-----------|--------|
| 1 | Cold Start & Setup | Phase 1 — First-time org onboarding & configuration |
| 2 | Core HR & People Data | Phase 2 — Employee directory, departments, hierarchy |
| 3 | Time & Attendance | Phase 3 — Clock in/out, shifts, overtime |
| 4 | Leave Management | Phase 4 — Leave types, policies, approvals |
| 5 | Daily Work Logging | Phase 5 — Timesheets, task logs, activity tracking |
| 6 | Talent Acquisition | Phase 6 — Recruitment, job postings, ATS |
| 7 | Onboarding & Offboarding | Phase 7 — Joining, exit, handover workflows |
| 8 | Performance & Growth | Phase 8 — Reviews, goals, feedback cycles |
| 9 | Learning & Development | Phase 9 — Courses, certifications, skill gaps |
| 10 | Compensation & Rewards | Phase 10 — Salary structure, bonuses, recognition |
| 11 | Engagement & Culture | Phase 11 — Surveys, polls, wellness, social feed |
| 12 | Platform & Experience Layer | Phase 12 — Notifications, search, customization |
| 13 | Payroll Processing | Phase 13 — Salary computation, tax, payslips |
| 14 | Expense Management | Phase 14 — Claims, receipts, reimbursements |
| 15 | Compliance & Audit | Phase 15 — Statutory compliance, audit trails |
| 16 | Workforce Planning | Phase 16 — Headcount, budgets, org design |
| 17 | Integrations & API Platform | Phase 17 — Third-party connectors, API gateway |
| 18 | People Analytics & BI | Phase 18 — Dashboards, reports, predictive insights |
| 19 | Demo Company Feature | Phase 19 — Sandbox demo org with seeded data |

### Extracted Data (already done)
- **`diagrams/mindmap-data.json`** — All 465 features extracted in structured JSON format
- Format: `{ modules: { "Module Name": { Employee: [{n, t, b}], Manager: [...], Admin: [...] } } }`
- `n` = feature name, `t` = type (Standard/AI/Additional), `b` = array of bullet descriptions

### Existing Artifacts
- **`diagrams/combined-mind-map.html`** (also `index.html`) — Interactive radial mind-map of all 19 modules
- **`diagrams/phase-01-*.html` through `phase-19-*.html`** — Individual user journey diagrams per module (3 swim lanes: Employee, Manager, Admin)
- **`diagrams/generate-mindmap.py`** — Python script that generates the mind-map HTML from JSON data

---

## 3. Architecture Decisions

### 3.1 Modular Monolith (NOT Microservices)

**Decision:** Start with a modular monolith. Extract to microservices only when a specific module needs independent scaling.

**Why:**
- Small team / solo developer — microservices multiply operational complexity
- Modular monolith = code structured as separate modules with clear boundaries, but deployed as one unit
- Each module has its own routes, services, repositories — no cross-module DB queries
- When a module genuinely needs to scale independently (e.g., Payroll processing at month-end), extract it then

### 3.2 Multi-Tenancy

**Decision:** Shared database with `org_id` on every table.

**Why:**
- Simplest to start, scales to thousands of orgs
- PostgreSQL Row Level Security (RLS) enforces data isolation at the DB level
- Every query automatically scoped to the current org

### 3.3 Database

**Decision:** PostgreSQL. Not DB-agnostic.

**Why:**
- JSONB for flexible per-org config storage
- Row Level Security for multi-tenancy
- Excellent ecosystem, free, battle-tested
- DB-agnostic = building abstractions for problems we don't have

### 3.4 Cloud

**Decision:** Pick one cloud (AWS or Azure). Not cloud-agnostic.

**Why:**
- Cloud-agnostic early on = wasted abstraction effort
- Use managed services (RDS, S3, SES) and move on

### 3.5 CI/CD from Day 1

**Decision:** Set up GitHub Actions (or GitLab CI) pipeline from the very first commit.

- Linting + type checking on every push
- Automated tests on every PR
- Staging deployment on merge to `develop`
- Production deployment on merge to `main`

---

## 4. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| **Backend** | Node.js + NestJS (or FastAPI if Python preferred) | Modular by design, great ecosystem |
| **Frontend** | React + Next.js | Component-based, SSR, huge talent pool |
| **Database** | PostgreSQL | Multi-tenancy (RLS), JSONB, reliable |
| **Cache** | Redis | Sessions, OTP, rate limiting, queues |
| **Queue** | BullMQ (Redis-backed) | Payroll processing, bulk emails, async jobs |
| **Auth** | Custom JWT + refresh tokens | Full control for multi-tenant RBAC |
| **File Storage** | S3 / Azure Blob | Documents, profile pics, exports |
| **Email** | SES / Resend | Transactional emails, notifications |
| **AI** | Claude API / OpenAI API | AI-powered features (176 features) |
| **CI/CD** | GitHub Actions or GitLab CI | From Day 1 |

---

## 5. Project Structure

```
/src
  /modules
    /cold-start-setup/          ← Phase 1
      /setup/                   ← Setup wizard steps for this module
        steps.config.ts         ← Defines required steps, order, validations
        template.xlsx           ← Downloadable Excel template for data import
      /features/                ← Actual module features (post-setup)
        /admin/
        /manager/
        /employee/
      /routes/
      /services/
      /repositories/

    /core-hr/                   ← Phase 2
      /setup/
      /features/
      ...

    /attendance/                ← Phase 3
    /leave-management/          ← Phase 4
    /daily-work-logging/        ← Phase 5
    /talent-acquisition/        ← Phase 6
    /onboarding-offboarding/    ← Phase 7
    /performance-growth/        ← Phase 8
    /learning-development/      ← Phase 9
    /compensation-rewards/      ← Phase 10
    /engagement-culture/        ← Phase 11
    /platform-experience/       ← Phase 12
    /payroll-processing/        ← Phase 13
    /expense-management/        ← Phase 14
    /compliance-audit/          ← Phase 15
    /workforce-planning/        ← Phase 16
    /integrations-api/          ← Phase 17
    /people-analytics/          ← Phase 18
    /demo-company/              ← Phase 19

  /shared
    /auth/                      ← JWT, RBAC, middleware
    /setup-engine/              ← Generic setup wizard runner
    /data-import/               ← Excel parser, validator, AI column mapper
    /module-registry/           ← Tracks which modules are active per org
    /multi-tenancy/             ← Org context, RLS helpers
    /notifications/             ← Email, push, in-app
    /ai/                        ← AI service abstraction
    /common/                    ← Shared DTOs, utils, constants

  /infrastructure
    /database/                  ← Migrations, seed scripts
    /cache/
    /queue/
    /storage/

  /templates
    /industry/
      it-services.json          ← Default config for IT companies
      manufacturing.json
      healthcare.json
      retail.json
    /module-defaults/
      core-hr.defaults.json     ← Sensible defaults per module
      leave.defaults.json
      payroll.defaults.json
      ...
```

---

## 6. Persona Build Order

### Phase A: Admin Path (Build First)

Admin is the **configurator**. Everything starts here.

#### Flow:
```
Sign Up → Login → Dashboard with 19 modules in sidebar
  │
  ├─ Module not set up → SETUP MODE (guided wizard)
  │   ├─ Step-by-step setup tasks
  │   ├─ Data import (Excel template / AI-assisted mapping / manual)
  │   └─ On completion → unlock FEATURE MODE
  │
  └─ Module set up → FEATURE MODE (what Excel promised for Admin)
      └─ All Admin features from the Excel for that module
```

#### Each module has two UI states for Admin:
1. **Setup Mode** — Shows setup tasks/wizard when module is first accessed
2. **Feature Mode** — Shows the actual Admin features (from Excel) once setup is complete

#### Data Onboarding (during setup):
- **Path 1 — Excel Template:** Download our template → fill → upload → validate → import
- **Path 2 — AI-Assisted Mapping:** Upload their own messy Excel/CSV → AI auto-maps columns to our fields → admin confirms → import
- **Path 3 — DB Connector (v2 only):** Admin provides read-only DB connection → AI maps tables → sync

### Phase B: Manager Path (Build Second)

Manager is the **operator**. Mostly reads/acts on what Admin configured.

- Logs in → sees the modules their org has activated
- No setup wizards (or minimal inline prompts if manager-specific config is needed)
- All Manager features from Excel are available
- Primary actions: approvals, team views, reports
- Admin can handle manager-specific setup on their behalf if needed

### Phase C: Employee Path (Build Third)

Employee is the **consumer**. Simplest experience.

- Logs in → sees 19 module tabs (only the ones org has activated)
- All Employee features from Excel are available
- No setup, no config — just use the system
- Self-service: apply leave, mark attendance, view payslips, etc.

---

## 7. Module Dependencies

Not all modules are independent. This affects both setup order and what Admin sees.

```
Cold Start & Setup (Phase 1) — MUST be first, always
  │
  ├── Core HR (Phase 2) — needs employee data from Phase 1
  │     │
  │     ├── Attendance (Phase 3) — needs employee list + shifts
  │     ├── Leave (Phase 4) — needs employee list + departments
  │     ├── Daily Work Logging (Phase 5) — needs employee list
  │     ├── Onboarding & Offboarding (Phase 7) — needs org structure
  │     ├── Performance & Growth (Phase 8) — needs reporting structure
  │     ├── Learning & Development (Phase 9) — needs employee list
  │     ├── Compensation & Rewards (Phase 10) — needs salary structure
  │     ├── Engagement & Culture (Phase 11) — needs employee list
  │     ├── Payroll (Phase 13) — needs employee list + salary structure
  │     ├── Expense Management (Phase 14) — needs employee list
  │     ├── Compliance & Audit (Phase 15) — needs org data
  │     └── Workforce Planning (Phase 16) — needs org structure
  │
  ├── Talent Acquisition (Phase 6) — can be independent (pre-hire)
  ├── Platform & Experience (Phase 12) — can be independent (UI/UX layer)
  ├── Integrations & API (Phase 17) — can be set up anytime
  ├── People Analytics (Phase 18) — needs data from other modules
  └── Demo Company (Phase 19) — independent (sandbox)
```

**The sidebar should show dependency hints:**
- "Complete Core HR first to unlock Attendance, Leave, and Payroll"
- Locked modules greyed out until dependencies are satisfied

---

## 8. Smart Defaults & Industry Templates

### The 3-Layer Config Model

```
Layer 1: Industry Template (auto-applied on org creation)
         → Covers ~80% of settings
         → Admin picks: "IT / Services", "Manufacturing", "Healthcare", "Retail", "Custom"

Layer 2: Admin Quick Review (10 minutes)
         → Toggle features on/off, adjust key numbers
         → "Leave days: 12 → change to 15"
         → "Probation: 6 months → change to 3"

Layer 3: Deep Customization (ongoing, optional)
         → Advanced settings surface as Admin uses the system
         → Custom approval chains, complex leave rules, etc.
```

### Industry Template Example (IT Services)
```json
{
  "industry": "IT Services",
  "workWeek": { "days": ["Mon","Tue","Wed","Thu","Fri"], "hours": "9:00-18:00" },
  "leave": { "casual": 12, "sick": 12, "earned": 15, "wfh": true },
  "attendance": { "flexiHours": true, "remoteEnabled": true },
  "payroll": { "taxRegime": "Indian", "ctcBased": true },
  "probation": { "months": 6 }
}
```

**Admin never configures 465 features. They pick a template, upload employee data, review defaults, and go live.**

---

## 9. RBAC Model

### Roles per Organization
- **Super Admin** — full access, can manage other admins (org owner)
- **Admin / HR** — module setup + all admin features from Excel
- **Manager** — team-scoped access + all manager features from Excel
- **Employee** — self-service + all employee features from Excel

### Permissions
- **Module-level:** Which modules a role can access
- **Feature-level:** Which features within a module a role can use
- **Scope-level:** Own data (Employee), team data (Manager), org data (Admin)

Every API endpoint checks: `(org_id, role, module, feature, scope)`

---

## 10. Module Registry & Activation

Each org has a module activation table:

```
org_modules
├── org_id
├── module_id
├── is_active         (admin toggled this on)
├── setup_status      (not_started | in_progress | completed)
├── setup_progress    (JSON: { step1: done, step2: pending, ... })
├── config            (JSONB: merged template + admin overrides)
├── activated_at
└── setup_completed_at
```

**The setup engine is generic.** Each module declares:
- What setup steps it needs (`steps.config.ts`)
- What data is required
- What the Excel template looks like
- What modules it depends on
- What defaults to apply

---

## 11. Testing Strategy

### Seed Script (Build Early — Phase 19 is Phase 0)

```bash
npm run seed:demo
```

One command creates a fully configured test org with:
- Company "Acme Corp" (IT Services template)
- 4 departments, 20-30 fake employees covering edge cases
- All modules activated and fully configured
- 30 days of attendance data, pending leave requests, processed payslips
- Employees on probation, notice period, different shifts, part-time, contract
- 3 login accounts: admin@acme.com, manager@acme.com, employee@acme.com

### Test Layers

```
Layer 1: Seed Script
         → Sets up everything automatically
         → Reset and re-test anytime in 30 seconds

Layer 2: Automated Tests (written while building each feature)
         → API tests: "Can employee apply leave?" → assert 200
         → "Can manager approve?" → assert status changed
         → "Can unauthorized user access?" → assert 403

Layer 3: Manual Testing (only for UI/UX)
         → Login as each persona → click through flows
         → Data already seeded, no manual setup needed
```

---

## 12. Development Build Order

### Release 1 — MVP (Foundation)
**Goal:** One org can sign up, set up Core HR, and basic daily modules work.

1. Auth + Multi-tenancy + Org Registration
2. Module Registry + Setup Engine (generic)
3. Industry Templates + Smart Defaults
4. Cold Start & Setup (Phase 1) — signup, setup wizard, data import
5. Core HR & People Data (Phase 2) — employee directory, departments, hierarchy
6. Time & Attendance (Phase 3) — clock in/out, basic shift management
7. Leave Management (Phase 4) — apply, approve, balances
8. Demo Company Seed (Phase 19) — test data for development

### Release 2 — Core Business
**Goal:** Payroll works, recruitment pipeline, performance reviews.

9. Daily Work Logging (Phase 5)
10. Talent Acquisition (Phase 6)
11. Onboarding & Offboarding (Phase 7)
12. Performance & Growth (Phase 8)
13. Payroll Processing (Phase 13)
14. Expense Management (Phase 14)

### Release 3 — Growth & Intelligence
**Goal:** AI features, analytics, learning, culture modules.

15. Learning & Development (Phase 9)
16. Compensation & Rewards (Phase 10)
17. Engagement & Culture (Phase 11)
18. Platform & Experience Layer (Phase 12)
19. Compliance & Audit (Phase 15)
20. Workforce Planning (Phase 16)
21. Integrations & API Platform (Phase 17)
22. People Analytics & BI (Phase 18)

### Each Module Build Follows This Pattern:
1. Read the Excel sheet for that module — extract every feature for all 3 roles
2. Design the DB schema (tables, relationships)
3. Build the Setup Wizard (Admin's setup steps for this module)
4. Build Admin features (from Excel)
5. Build Manager features (from Excel)
6. Build Employee features (from Excel)
7. Write API tests
8. Add to seed script

---

## 13. Key Conventions

### Naming
- Module folders: `kebab-case` matching module name
- DB tables: `snake_case`, always prefixed with module (e.g., `leave_policies`, `leave_requests`)
- Every table has: `id`, `org_id`, `created_at`, `updated_at`
- API routes: `/api/v1/{module}/{resource}` (e.g., `/api/v1/leave/requests`)

### Feature Traceability
- Every feature built should reference its Excel source: module name + feature name
- This ensures nothing from the 465 features is missed and everything is traceable

### Theme & UI
- **Light matte theme** — always (user preference, confirmed multiple times)
- Background: `#f5f5f0` range
- Cards: white with subtle shadows
- Text: `#2c2c2c`
- Accent colors per module cluster (as defined in mind-map)

---

## 14. What's Already Done

| Artifact | Status | Location |
|----------|--------|----------|
| Feature Blueprint Excel | Complete | `HRMS-Complete-Feature-Blueprint-version-3.xlsx` |
| Extracted JSON data (465 features) | Complete | `diagrams/mindmap-data.json` |
| Interactive Mind Map (all 19 modules) | Complete | `diagrams/combined-mind-map.html` |
| Deployable Mind Map | Complete | `diagrams/index.html` (Netlify-ready) |
| 19 User Journey Diagrams | Complete | `diagrams/phase-01-*.html` through `phase-19-*.html` |
| User Journey Prompt Templates | Complete | `HRMS-User-Journey-Diagram-Prompts.md` |
| This Coding Approach Document | Complete | `CODING-APPROACH.md` |

---

## 15. Open Decisions (To Finalize Before Coding)

- [ ] **Tech stack confirmation:** NestJS vs FastAPI? Next.js confirmed?
- [ ] **Cloud provider:** AWS vs Azure?
- [ ] **AI provider:** Claude API vs OpenAI vs both?
- [ ] **Hosting:** Self-hosted vs Vercel/Railway + managed DB?
- [ ] **Payment/Billing:** Stripe? Per-module pricing? Per-employee pricing?
- [ ] **Mobile:** React Native? PWA? Native later?

---

*This document should be the first thing read at the start of any new coding session. All features come from the Excel. All architecture follows this document.*
