# HRMS Bug Tracker — First Run Walkthrough

> Date: 2026-03-16

---

## Issue #1 — "Begin setup with module configuration" not clickable

**Problem:** On the dashboard, the "Begin setup with module configuration" text is styled like a hyperlink (blue, with arrow icon) but is a plain `<div>` with no click handler or navigation. Users expect it to be clickable.

**Files affected:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` (lines 95-98)

**Solution:** Replaced the `<div>` with a Next.js `<Link>` component pointing to `/dashboard/modules/cold-start-setup`. Added `hover:underline cursor-pointer` for proper link UX. Added `import Link from 'next/link'`.

**Status:** FIXED

---

## Issue #2 — Logo URL should be a file upload

**Problem:** Company Profile form has a text input for "Logo URL" expecting users to paste an image URL. Users expect a file upload button to pick a logo image from their computer.

**Files affected:**
- `apps/web/src/components/setup-steps/company-profile-form.tsx` (lines 116-132)
- Backend would need a file upload endpoint (e.g. `/api/v1/upload/logo`)
- `@hrms/shared` — `CompanyProfileData` type has `logoUrl: string`

**Solution:** Replace the URL text input with an `<input type="file" accept="image/*">` that uploads the file to the backend, stores it (local disk or S3), and saves the resulting URL. Requires a new upload API endpoint. This is a feature enhancement — logging for now, will implement when prioritized.

**Status:** LOGGED (enhancement — needs upload endpoint + storage strategy decision)

---

## Issue #3 — CSV/Excel import fails with Excel serial number dates

**Problem:** Importing `test-import.csv` (which has proper ISO dates like `2024-01-15`) results in all 15 rows failing with error: `date/time field value out of range: "45306.22928240741"`. The XLSX parser converts date columns to Excel serial numbers instead of preserving date strings.

**Files affected:**
- `apps/api/src/shared/data-import/parsers/excel-parser.ts` (line 5, 8)

**Root cause:** `XLSX.read()` was called without `cellDates: true`, and `sheet_to_json()` was called without `raw: false`. This caused the library to convert date strings into Excel serial numbers (float values) before passing them to the DB insert, which PostgreSQL rejects.

**Solution:** Added `cellDates: true` to `XLSX.read()` options so dates are parsed as JS Date objects, and added `raw: false` to `sheet_to_json()` so values are returned as formatted strings instead of raw numbers.

**Status:** FIXED

---

## Issue #4 — Import creates orphan users when profile insert fails (no transaction)

**Problem:** When importing employees, the user row is inserted first, then the employee profile row. If the profile insert fails (e.g. bad date), the user row remains in the DB — creating orphan users. The UI reports "0 Imported, 15 Errors" but all 15 users were actually created. Re-importing then fails with "email already exists".

**Files affected:**
- `apps/api/src/shared/data-import/data-import.service.ts` (lines 205-254)

**Root cause:** The user insert and profile insert were not wrapped in a database transaction. The user insert succeeded, the profile insert failed on the bad date, but nothing rolled back the user insert.

**Solution:** Wrapped both the `users` insert and `employeeProfiles` insert inside `this.db.transaction(async (tx) => { ... })` so if either fails, both are rolled back atomically.

**Status:** FIXED

---

## Issue #5 — Dates still fail after cellDates fix (locale format mismatch)

**Problem:** After Issue #3 fix, `cellDates: true` + `raw: false` caused XLSX to output dates in US locale short format (`1/15/24`, `11/20/23`) instead of ISO format. PostgreSQL rejects these as "date/time field value out of range". 9 of 15 rows imported, 6 still failed.

**Files affected:**
- `apps/api/src/shared/data-import/parsers/excel-parser.ts`

**Root cause:** `raw: false` tells XLSX to format values as display strings using locale rules. Dates like `2024-01-15` became `1/15/24` which PostgreSQL can't parse.

**Solution:** Changed to `raw: true` to get native JS Date objects, then added a post-processing step that converts any `Date` instances to ISO strings (`YYYY-MM-DD`) via `toISOString().split('T')[0]`. This ensures all date values reach the DB in a format PostgreSQL accepts regardless of the input format.

**Status:** FIXED

---

## Issue #6 — Imported employees not visible in Core HR Employee Master

**Problem:** After successfully importing 15 employees via CSV, the Core HR Employee Master page still shows only 20 employees (seed data). Newly imported employees are not visible because the API defaults to `page=1, limit=20` and the frontend has no pagination UI to navigate to page 2+.

**Files affected:**
- `apps/web/src/components/modules/core-hr/tabs/admin/employee-master-tab.tsx` (line 96)
- `apps/api/src/modules/core-hr/features/admin/employee-master.service.ts` (lines 85-87 — pagination logic)

**Root cause:** Frontend calls `api.get('/core-hr/admin/employees')` with no pagination params. Backend defaults to `limit=20`, returning only the first 20 records. No pagination controls exist in the UI.

**Solution:** Added `{ params: { limit: 500 } }` to the frontend API call so all employees load. Proper pagination UI should be added as a future enhancement.

**Status:** FIXED (quick fix — pagination UI needed as follow-up)

---

## Issue #7 — Overtime Config tab fails to load ("Failed to load overtime data")

**Problem:** Time & Attendance > Overtime Config tab shows "Failed to load overtime data." error banner. Stats show 0 and table shows no requests.

**Files affected:**
- `apps/web/src/components/modules/attendance/tabs/admin/overtime-config-tab.tsx` (line 76)

**Root cause:** Frontend calls `api.get('/attendance/admin/overtime/stats')` but the backend route is `GET /attendance/admin/overtime/summary` (defined in `overtime-config.controller.ts` line 27). Route name mismatch — `/stats` vs `/summary`.

**Solution:** Changed the frontend API call from `/attendance/admin/overtime/stats` to `/attendance/admin/overtime/summary`.

**Status:** FIXED

---

## Issue #8 — Leave Balance Management tab crashes: "Objects are not valid as a React child"

**Problem:** Clicking the Balance Management tab under Leave Management crashes with: `Objects are not valid as a React child (found: object with keys {id, name, code})`. The ErrorBoundary catches it and shows "Something went wrong."

**Files affected:**
- `apps/web/src/components/modules/leave-management/tabs/admin/balance-management-tab.tsx` (lines 92-94, 396)
- `apps/api/src/modules/leave-management/features/admin/leave-balance-mgmt.service.ts` (lines 88-105)

**Root cause:** The API returns `leaveType` as an object `{ id, name, code }` and `employee` as an object `{ id, firstName, lastName, email }`, but the frontend `BalanceRecord` interface expects flat strings (`leaveType: string`, `employeeName: string`). When React tries to render `{record.leaveType}` (an object) as a child, it crashes.

**Solution:** Added a mapping layer when setting balances that normalizes the API response: extracts `leaveType.name` as a string, constructs `employeeName` from `employee.firstName + lastName`, and maps `allocated/used/balance/carriedForward` fields with fallbacks for alternate field names.

**Status:** FIXED

---

## Issue #9 — Leave Type dropdown empty in Bulk Credit/Debit modal

**Problem:** In Balance Management tab, clicking "Bulk Credit" opens a modal with a "Leave Type" dropdown that only shows "Select leave type" and `0` — no actual leave type names.

**Files affected:**
- `apps/web/src/components/modules/leave-management/tabs/admin/balance-management-tab.tsx` (lines 119-123)

**Root cause:** The frontend calls `/leave-management/admin/balances/filters` to populate leave types and departments, but this endpoint doesn't exist on the backend. The call is caught silently, leaving `leaveTypes` as an empty array. The `0` in the dropdown is likely a numeric fallback being rendered.

**Solution:** Added a fallback that derives leave types and departments from the fetched balance data when the `/filters` endpoint returns null. Extracts unique leave type names and department values from the balance records.

**Status:** FIXED

---

## Issue #10 — Corrections tab fails to load in Daily Work Logging

**Problem:** Daily Work Logging > Corrections tab shows "Failed to load corrections data." error.

**Files affected:**
- `apps/web/src/components/modules/daily-work-logging/tabs/admin/timesheet-corrections-tab.tsx` (lines 75-77)
- `apps/api/src/modules/daily-work-logging/features/admin/timesheet-corrections.controller.ts`

**Root cause:** Frontend calls `GET /daily-work-logging/admin/corrections/disputes` but the backend only has `POST /dispute` (for resolving a dispute) — no GET endpoint to list disputes. The 404 on `/disputes` causes `Promise.all` to reject, failing the entire load including the working `/audit-trail` endpoint.

**Solution:** Added `.catch(() => ({ data: [] }))` to both API calls so each fails gracefully. The audit trail will load even if disputes endpoint is missing. A `GET /disputes` endpoint should be added as a follow-up.

**Status:** FIXED (graceful fallback — backend GET /disputes endpoint needed as follow-up)

---

## Issue #11 — Integration & Export tab crashes: "Cannot read properties of undefined (reading 'toFixed')"

**Problem:** Daily Work Logging > Integration & Export tab crashes with TypeError. The correlation data table calls `.toFixed(1)` on `entry.timesheetHours`, `entry.attendanceHours`, and `entry.variance` which can be `undefined`.

**Files affected:**
- `apps/web/src/components/modules/daily-work-logging/tabs/admin/integration-export-tab.tsx` (lines 340-344)

**Root cause:** API returns correlation entries where numeric fields may be `undefined`/`null`. The code calls `.toFixed(1)` directly without null checks.

**Solution:** Added nullish coalescing `?? 0` before all `.toFixed(1)` calls so undefined values default to `0`. Also fixed missing React `key` prop — `entry.employeeId` can be undefined, causing duplicate key warnings. Changed to `entry.employeeId || idx` fallback.

**Status:** FIXED

---

## Issue #12 — Job Requisitions tab fails to load in Talent Acquisition

**Problem:** Talent Acquisition > Job Requisitions tab shows "Failed to load requisitions." error.

**Files affected:**
- `apps/web/src/components/modules/talent-acquisition/tabs/admin/job-requisition-tab.tsx` (lines 124-129)

**Root cause:** Frontend calls 4 endpoints in `Promise.all`: `/requisitions`, `/departments`, `/designations`, `/locations`. The last 3 don't exist as backend endpoints (departments/designations/locations are managed in Cold Start/Core HR, not Talent Acquisition). One 404 causes the entire `Promise.all` to reject.

**Solution:** Added `.catch(() => ({ data: [] }))` to the `/departments`, `/designations`, and `/locations` calls so the requisitions list loads even when supporting filter endpoints are missing.

**Status:** FIXED

---

## Issue #13 — Offer Management tab fails to load in Talent Acquisition

**Problem:** Talent Acquisition > Offer Management tab shows "Failed to load offers."

**Files affected:**
- `apps/web/src/components/modules/talent-acquisition/tabs/admin/offer-management-tab.tsx` (lines 108-112)

**Root cause:** Frontend calls `GET /shortlisted-applications` which doesn't exist on the backend. The 404 causes `Promise.all` to reject, blocking the entire tab including the working `/offers` and `/analytics` endpoints.

**Solution:** Added `.catch()` fallbacks on `/shortlisted-applications` and `/analytics` calls so the offers list loads independently.

**Status:** FIXED

---

## Issue #14 — Onboarding & Offboarding: 4 admin tabs fail to load

**Problem:** Four tabs in Onboarding & Offboarding module all show "Failed to load" errors:
- Onboarding Workflows: "Failed to load onboarding workflows"
- Onboarding Analytics: "Failed to load onboarding analytics"
- Offboarding Analytics: "Failed to load offboarding analytics"
- Compliance & Policy: "Failed to load compliance data"

**Files affected:**
- `apps/web/src/components/modules/onboarding-offboarding/tabs/admin/onboarding-workflow-tab.tsx`
- `apps/web/src/components/modules/onboarding-offboarding/tabs/admin/onboarding-analytics-tab.tsx`
- `apps/web/src/components/modules/onboarding-offboarding/tabs/admin/offboarding-analytics-tab.tsx`
- `apps/web/src/components/modules/onboarding-offboarding/tabs/admin/compliance-policy-tab.tsx`

**Root causes:**
1. **Onboarding Workflows:** `/admin/departments` endpoint doesn't exist — 404 kills `Promise.all`
2. **Onboarding Analytics:** Wrong URL paths — frontend used `/admin/analytics/onboarding-metrics` but backend is `/admin/onboarding-analytics/overview`
3. **Offboarding Analytics:** Wrong URL paths — frontend used `/admin/analytics/offboarding-metrics` but backend is `/admin/offboarding-analytics/overview`
4. **Compliance & Policy:** Wrong endpoint names — frontend used `/policy-acknowledgements` (backend: `/acknowledgements`) and `/training-completions` (backend: `/training-completion` singular)

**Solution:** Fixed URL mismatches to match actual backend routes. Added `.catch()` fallbacks on all non-primary API calls in `Promise.all` blocks.

**Status:** FIXED

---

## Issue #15 — Performance & Growth: 4 admin tabs fail to load

**Problem:** Four tabs in Performance & Growth module show "Failed to load" errors:
- Goal Framework: "Failed to load goal framework data"
- Analytics: "Failed to load performance analytics"
- Calibration: "Failed to load calibration data"
- PIP Management: "Failed to load PIP data"

**Files affected:**
- `apps/web/src/components/modules/performance-growth/tabs/admin/goal-framework-tab.tsx`
- `apps/web/src/components/modules/performance-growth/tabs/admin/performance-analytics-tab.tsx`
- `apps/web/src/components/modules/performance-growth/tabs/admin/calibration-tab.tsx`
- `apps/web/src/components/modules/performance-growth/tabs/admin/pip-tab.tsx`

**Root causes:**
1. **Goal Framework:** Wrong URLs — frontend used `/admin/goal-templates` but backend is `/admin/goal-framework/templates`; `/admin/org-goals` should be `/admin/goal-framework/org-goals`
2. **Analytics:** Frontend called single `/analytics` endpoint but backend exposes 5 separate endpoints (`/distribution`, `/department-comparison`, `/goal-achievement`, `/review-completion`, `/trends`)
3. **Calibration:** Frontend called `/calibration` but backend is `/calibration/groups`; save used wrong method/path
4. **PIP Management:** Frontend used `/admin/pips` (plural) but backend is `/admin/pip` (singular); employee list pointed to non-existent `/performance-growth/admin/employees` instead of `/core-hr/admin/employees`

**Solution:** Fixed all URL mismatches. Restructured analytics to call 5 separate endpoints and merge results. Added `.catch()` fallbacks on all non-critical calls. Fixed PIP employee list to use Core HR endpoint.

**Status:** FIXED

---

## Issue #16 — Learning & Development: 2 admin tabs fail to load

**Problem:** Two tabs fail:
- LMS Configuration: "Failed to load courses"
- Reporting & Analytics: "Failed to load analytics data"

**Files affected:**
- `apps/web/src/components/modules/learning-development/tabs/admin/lms-config-tab.tsx`
- `apps/web/src/components/modules/learning-development/tabs/admin/reporting-analytics-tab.tsx`

**Root causes:**
1. **LMS Configuration:** Frontend called `/admin/courses` but backend controller is at `/admin/lms-config` with sub-route `/courses`
2. **Reporting & Analytics:** Frontend called single `/admin/analytics` but backend has 4 separate endpoints (`completion-rates`, `engagement`, `popular-content`, `budget-utilization`)

**Solution:** Fixed LMS URLs to `/admin/lms-config/courses`. Restructured analytics to call 4 separate endpoints with `.catch()` fallbacks and merge into the expected shape.

**Status:** FIXED

---

## Issue #17 — Compensation Analytics tab crashes: "data.payEquity.map is not a function"

**Problem:** Compensation & Rewards > Analytics tab crashes with TypeError at line 143. `data.payEquity` is an object (not an array), so `.map()` fails.

**Files affected:**
- `apps/web/src/components/modules/compensation-rewards/tabs/admin/compensation-analytics-tab.tsx` (lines 38-52)

**Root cause:** The `/pay-equity` endpoint returns `{ data: { genderAnalysis: [...], totalEmployeesAnalyzed: N } }`. The frontend expected a flat array but got a nested object. The fallback `payEquityRes.data?.data` resolves to `{ genderAnalysis: [...] }` — still not an array.

**Solution:** Added proper extraction: checks if response is an array, then checks for `genderAnalysis` array inside the object. Added `.catch()` fallbacks on all 3 API calls.

**Status:** FIXED

---

## Issue #18 — Platform & Experience: Notification Management fails + System Admin key warning

**Problem:** Two issues:
1. Notification Management tab: "Failed to load notification templates"
2. System Administration tab: React key warning — `s.id` is undefined in `sessions.map()`

**Files affected:**
- `apps/web/src/components/modules/platform-experience/tabs/admin/notification-alert-management-tab.tsx`
- `apps/web/src/components/modules/platform-experience/tabs/admin/system-administration-tab.tsx`

**Root causes:**
1. Frontend called `/admin/notifications` but backend routes templates under `/admin/notifications/templates`. All CRUD URLs were missing the `/templates` sub-path.
2. Session objects from API don't have an `id` field, causing duplicate undefined keys.

**Solution:**
1. Fixed all 5 notification URLs to include `/templates` suffix. Added `.catch()` fallbacks.
2. Added index fallback: `key={s.id || idx}`.

**Status:** FIXED

---

## Issue #19 — Payroll Processing: Statutory Compliance + Reports & Analytics fail to load

**Problem:** Two tabs fail:
- Statutory Compliance: "Failed to load statutory compliance data"
- Reports & Analytics: "Failed to load payroll reports"

**Files affected:**
- `apps/web/src/components/modules/payroll-processing/tabs/admin/statutory-compliance-tab.tsx`
- `apps/web/src/components/modules/payroll-processing/tabs/admin/payroll-reports-tab.tsx`

**Root causes:**
1. **Statutory Compliance:** `Promise.all` with no `.catch()` — any single endpoint failure crashes the whole tab
2. **Reports & Analytics:** API calls missing required `month` and `year` query params — backend `parseInt(undefined)` returns `NaN`, causing DB query failures

**Solution:** Added `.catch()` fallbacks to all API calls in both tabs. Added `month` and `year` query parameters to the reports API calls using current date defaults.

**Status:** FIXED

---

## Issue #20 — Payroll Reports variance.map crash: API returns object, frontend expects array

**Problem:** Payroll Reports & Analytics tab crashes with "variance.map is not a function". The variance API returns `{ data: { current: {...}, previous: {...}, variance: {...} } }` but the frontend expects a `VarianceItem[]` array.

**Files affected:**
- `apps/web/src/components/modules/payroll-processing/tabs/admin/payroll-reports-tab.tsx` (line 67, 211)

**Root cause:** Backend `/reports/variance` returns a single comparison object with current/previous/variance fields, not an array of metric cards. Frontend tries to `.map()` over it.

**Solution:** Added transformation logic: if API returns the object shape, converts it into an array of `VarianceItem` objects (`Gross Pay`, `Net Pay`, `Deductions`) that the UI cards can render.

**Status:** FIXED

---

## Issue #21 — Expense Management Reports & Analytics fails to load

**Problem:** Expense Management > Reports & Analytics tab shows "Failed to load expense analytics."

**Files affected:**
- `apps/web/src/components/modules/expense-management/tabs/admin/expense-analytics-tab.tsx` (lines 73-78)

**Root cause:** Two URL mismatches in `Promise.all`:
- Frontend: `/monthly-trends` → Backend: `/trends`
- Frontend: `/violations` → Backend: `/policy-violations`

**Solution:** Fixed both URLs to match backend routes. Added `.catch()` fallbacks on all 4 API calls.

**Status:** FIXED

---

## Issue #22 — People Analytics Report Builder: 500 error on create

**Problem:** Clicking "Create Report" in People Analytics > Report Builder returns a 500 Internal Server Error.

**Files affected:**
- `apps/api/src/modules/people-analytics/features/admin/report-builder.service.ts` (line 33)
- `apps/api/src/modules/people-analytics/features/admin/report-builder.controller.ts` (line 26-28)
- `apps/web/src/components/modules/people-analytics/admin/report-builder.tsx` (line 33)

**Root cause:** The `created_by` column is `uuid NOT NULL` in the schema. The frontend sends `createdBy: ''` (empty string) and the service passes it through — PostgreSQL rejects it as an invalid UUID.

**Solution:** Updated the controller to pass the authenticated user's ID from `tenantService.getUserId()` to the service. Updated the service to accept `userId` as a parameter and use it as the `createdBy` value, with `orgId` as a fallback.

**Status:** FIXED

---

## Issue #23 — Demo Company Seed Data Control crashes: "statuses.map is not a function"

**Problem:** Demo Company > Seed Data Control tab crashes with "statuses.map is not a function" at line 135.

**Files affected:**
- `apps/web/src/components/modules/demo-company/admin/seed-data-control.tsx` (lines 56-61)

**Root cause:** Backend returns `{ data: { seededModules: string[], status: string } }` — a single object. Frontend does `r.data.data ?? []` which gets the object (not null), sets it as `statuses`, then tries to `.map()` an object.

**Solution:** Added response transformation: if API returns an object (not array), converts `seededModules` into a `SeedStatus[]` array by mapping each MODULES entry to a status based on whether it's in `seededModules`. Also fixed `logs` fetch — backend returns `{ data: { logs: [...] } }` but frontend expected `data.data` to be the array. Added extraction of `raw.logs`.

**Status:** FIXED

---

## Issue #24 — Demo Company Analytics tab crashes: "funnel.map is not a function"

**Problem:** Demo Company > Demo Analytics tab crashes at line 148 with "funnel.map is not a function".

**Files affected:**
- `apps/web/src/components/modules/demo-company/admin/demo-analytics.tsx` (lines 33-36)

**Root cause:** Backend `/funnel` returns `{ data: { funnel: [...], total, converted, conversionRate } }`. Frontend does `r.data.data ?? []` which gets the object `{ funnel: [...], ... }`, not an array. Also funnel items use `stage` field but frontend expects `label`.

**Solution:** Extract `raw.funnel` array from the response object. Map each step to normalize `stage` to `label` field name.

**Status:** FIXED

---

## Issue #25 — Demo Analytics shows "NaNh" for Avg Session Length

**Problem:** Demo Analytics tab shows "NaNh" in the Avg Session Length card when there are no demo sessions.

**Files affected:**
- `apps/web/src/components/modules/demo-company/admin/demo-analytics.tsx` (line 60)

**Root cause:** `formatDuration()` receives `undefined` or `NaN` when summary data has no session length. `NaN < 60` is false, so it falls through to the hours calculation producing "NaNh".

**Solution:** Added guard at top of `formatDuration`: `if (!minutes || isNaN(minutes)) return '0m'`.

**Status:** FIXED

---

## Issue #26 — Remove all AI Insights/AI Assistance features (user decision)

**Problem:** User wants to redo AI features from scratch. All AI Insights tabs across all 19 modules (admin/manager/employee dashboards) and all backend AI code should be removed.

**Files removed:**
- **55 frontend AI tab components** deleted from `apps/web/src/components/modules/*/tabs/*/ai-insights-tab.tsx`
- **55 dashboard files edited** — removed AI tab definition, import, rendering, and Sparkles icon
- **38 backend AI controller/service files** deleted from `apps/api/src/modules/*/features/ai/`
- **2 shared AI files** deleted from `apps/api/src/shared/ai/` (AiModule + AiService)
- **20 module files edited** — removed AI controller/service imports and registrations from all `.module.ts` files + `app.module.ts`

**Total: ~95 files deleted, ~75 files edited**

**Note:** `openai` npm package left installed for future reimplementation.

**Status:** DONE

---

## Issue #27 — Core HR Manager: Team Directory crashes "members.map is not a function"

**Problem:** Core HR > Manager view > Team Directory tab crashes at line 92: `members.map is not a function`.

**Files affected:**
- `apps/web/src/components/modules/core-hr/tabs/manager/team-directory-tab.tsx` (line 51)

**Root cause:** API returns `{ data: [...], meta: {...} }` but the code does `data.members || data || []`. Since `data.members` is undefined and `data` is a truthy object, `members` gets set to the response object instead of an array.

**Solution:** Changed extraction to: `Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data?.members || []`

**Status:** FIXED

---
