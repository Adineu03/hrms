# AI Chatbot Assistant — 3-Sprint Rebuild Plan

> **STATUS (2026-06-08): Sprint 1 ✅ DONE · Sprint 2 ✅ DONE · Sprint 3 (owner UAT) ⏳ NEXT.** Built on the **OpenAI Agents SDK** (`@openai/agents@0.11.6`, `gpt-5.5`). All assistant features + standalone AI features shipped and API-smoke-tested; API build + web type-check clean. Implementation log + gotchas live in `memory/ai-chatbot-rebuild.md`. Section-by-section status is inline below.

> **READ THIS FIRST if you are a fresh session.** This document is the single source of truth for the AI Chatbot Assistant work. It supersedes the phase-by-phase plan in `phase-1` … `phase-5` md files for *how* we build (those remain useful for the original specs and logbooks, but the architecture has changed — see "The Big Decision" below). Read this top to bottom before touching code.

---

## TL;DR

We are **rebuilding the in-app AI assistant** on the **OpenAI Agents SDK / Responses API with `gpt-5.5`** (replacing the current `gpt-4o` Chat-Completions + hand-rolled function-calling). The chat widget UI on the frontend is good and stays. The backend agent loop and tool wiring get rebuilt so the assistant is genuinely agentic (multi-step, vision, clean tool-calling) instead of brittle.

Three sprints:
1. **Sprint 1 — Rebuild + finish the assistant** (the agent loop + the ~20 conversational "assistant" features as role-tagged HR tools). Absorbs the unfinished half of Phase 4 and all of Phase 5.
2. **Sprint 2 — Standalone AI features** that get their own UI (Receipt Scanner, JD Generator, Column Mapper, rules-based Anomaly Detection, …).
3. **Sprint 3 — Manual UAT** (the human owner click-tests everything; this doc defines exactly what to check).

---

## The Big Decision (and why) — DO NOT re-litigate

**Provider: OpenAI. Model: `gpt-5.5`. Auth: OpenAI API key.**

Decision history (so the next session doesn't re-open settled questions):

1. **We considered Anthropic Claude (Agent SDK / tool-use).** Technically excellent and feature-comparable.
2. **We rejected the "use my Claude Code / Max OAuth token locally, swap to API key in prod" idea.** Using Free/Pro/Max **subscription OAuth tokens with any SDK to power an application is a Terms-of-Service violation** — categorical, not about how many users you serve, and **enforced** (Anthropic fingerprints non-Claude-Code clients and locks accounts, Feb 2026). Localhost does not cure it. Risk = losing the owner's $200 Max account. Not worth it.
3. **We chose OpenAI** because: (a) it's the owner's **own API key + existing credits → zero ToS friction, zero marginal dev cost, no LLM-mocking needed**; (b) the codebase is **already on OpenAI** (`openai ^6.27.0`, `gpt-4o`); (c) the OpenAI **Agents SDK / Responses API** gives the same agentic story (tool use, native vision, server-side web search, file search, computer use) — now available in **TypeScript**, which fits the NestJS backend.
4. **`gpt-5.5`** (released 2026-04-23; API `gpt-5.5` $5/$30 per 1M, 1M context, vision-capable). Use `gpt-5.5` for the assistant. **Reserve `gpt-5.5-pro`** ($30/$180) for genuinely hard reasoning only.

> The win the owner asked for ("smarter, less wiring") = **raw function-calling → agentic SDK loop** + **`gpt-4o` → `gpt-5.5`**. That win is fully available staying on OpenAI.

---

## Current Reality (verified against the codebase — re-verify before relying on it)

### What exists and works
- **Frontend chat widget (Phase 1): DONE, keep it.** Bubble (draggable, localStorage pos), window, message list, input. `'use client'`, theme tokens only, lucide icons.
- **Backend assistant (Phases 2–3): DONE but to be rebuilt.** OpenAI `gpt-4o` Chat Completions + function-calling + Redis conversation memory + role-aware system prompt.
- **Vision (part of Phase 4): WORKS.** Frontend captures a screenshot (`html2canvas`) + a DOM snapshot and sends both; backend passes the screenshot to `gpt-4o` vision (`image_url`, `detail: 'low'`). "What's on this page?" answers correctly from the actual screen.

### What is half-done or broken (Phase 4) — must be fixed in the rebuild
- **Form-fill / click execution is buggy:**
  - Fails to fill fields on forms that aren't in the DOM yet (e.g. an "Add Employee" form behind a button click) — the agent guesses selectors for elements that don't exist yet.
  - Sometimes clicks the **wrong** button (clicked sidebar "Cold Start" link instead of the form's Save).
  - The form-fill banner **does not clear** when navigating to a new page.

### What was never started
- **Phase 5 (Task pause/resume, multi-step workflows): NOT started.** Under the rebuild this is *mostly free* — the Agents SDK / Responses API loop natively does multi-step tool orchestration, so we do not hand-build a state machine.

### Known footguns already hit (don't repeat)
- **NestJS global `ValidationPipe({ whitelist: true })` silently strips DTO fields without class-validator decorators.** `pageSnapshotText` and `screenshot` on `ChatRequestDto` must have `@IsOptional() @IsString()` or they vanish and the AI never sees the page. This bit us once.
- **API runs `nest start --watch`** — it auto-reloads, but if behavior looks stale, confirm the process actually restarted and `dist/` recompiled.
- **Redis may be down locally** — conversation memory must fail soft (fall back to no-memory), never 500 the chat.
- **Multi-tenancy is sacred** — every tool that reads/writes data must go through the existing `TenantService` / RLS (`org_id`) path. Never bypass `org_id`.

### Key file paths (current)
**Backend** — `apps/api/src/modules/ai-assistant/`
- `ai-assistant.controller.ts` — `POST /api/v1/ai-assistant/chat`, `/clear`, `/execute-action`
- `ai-assistant.service.ts` — **the orchestrator to rebuild** (currently `gpt-4o` Chat Completions)
- `context-builder.service.ts` — builds the role-aware system prompt (+ page snapshot section)
- `conversation-memory.service.ts` — Redis-backed history (24h TTL)
- `action-executor.service.ts` — server-side action execution
- `tools/function-definitions.ts` — `BASE_TOOLS`, `AI_TOOLS`, `AI_TOOLS_WITH_SCREEN`
- `tools/screen-interaction.tools.ts` — `interact_with_page`, `read_page_data`
- `dto/chat.dto.ts` — has `message`, `conversationId`, `pageContext`, `pageSnapshotText`, `screenshot`
- `dto/execute-action.dto.ts`

**Frontend** — `apps/web/src/`
- `lib/chat-store.ts` — Zustand store; captures screenshot + DOM scan, POSTs to `/ai-assistant/chat`
- `lib/page-scanner.ts` — DOM introspection → text snapshot
- `lib/screen-action-executor.ts` — runs `fill`/`click`/`select_tab` screen actions
- `lib/screenshot-capture` (dynamic import in chat-store) — html2canvas wrapper
- `hooks/use-page-context.ts` — current module/tab/role/pathname
- `components/ai-assistant/` — `chat-bubble`, `chat-window`, `chat-message`, `chat-input`, `action-confirm-dialog`, `action-result-card`, `form-fill-banner`

**Shared** — `packages/shared/src/types/ai-assistant.ts` (`ChatMessage`, `PageContext`, `ChatRequest/Response`, `ChatAction`, `ActionType`, `ActionResult`, `ScreenAction`)

**Env** — `.env` must have `OPENAI_API_KEY`. (Confirm before Sprint 1.)

---

## The mental model (so personas don't confuse you)

It is **ONE assistant**, not 176 features and not 3 chatbots. The blueprint lists AI features per persona (Employee/Manager/Admin) because it's describing *what a user of that role can ask the assistant to do*. Same brain; the role only changes **(a) what data it can see** and **(b) what actions it's allowed to take**.

Implementation = give the assistant a set of **tools**, each tagged with `allowedRoles`. When an employee asks to approve someone's leave, the assistant simply doesn't have that tool in its keyring and declines.

Two kinds of AI feature:
- **"Assistant" features (~20)** → live **inside the chatbot** (conversational, no dedicated UI). Built as role-tagged tools. **Sprint 1.**
- **"Standalone" features (easy/medium)** → get **their own UI** (a tab, a button, or a flow step). **Sprint 2.** The chatbot can still reach into them (the tab is the home; the bot is a shortcut).

---

## SPRINT 1 — Rebuild + finish the assistant

> **STATUS: ✅ DONE (2026-06-08).** Rebuilt on the **OpenAI Agents SDK** (`@openai/agents@0.11.6`, `gpt-5.5`) — agentic multi-step loop, native vision, role-tagged HR tools for the 7 core modules, HITL confirm via SDK interruptions + `RunState` resume (persisted in Redis, with an in-memory fallback), all 3 Phase-4 bugs fixed. API smoke tests green. **Decision:** chose the full Agents SDK over raw Responses (owner's call). **Gotchas:** must use `store:true` (gpt-5.5 reasoning items persist across turns); added `express` (phantom dep) + upgraded `zod@3→4` in `apps/api`. Full details in `memory/ai-chatbot-rebuild.md`.

**Goal:** A genuinely agentic, multi-step, vision-capable assistant on the OpenAI Agents SDK / Responses API + `gpt-5.5`, with role-tagged HR tools wired for the 6–7 core modules. Delivers the ~20 conversational features and finishes Phase 4 + Phase 5.

### Tasks
1. **Confirm `OPENAI_API_KEY` in `.env`.** No OAuth, ever.
2. **Migrate the backend off Chat-Completions → Responses API (or Agents SDK).**
   - Replace the `gpt-4o` `chat.completions.create` calls in `ai-assistant.service.ts` with the Responses API. Bump model to **`gpt-5.5`**.
   - Keep native **vision** (pass the screenshot as an input image).
   - Keep Redis conversation memory (fail-soft).
   - Prefer the **Responses API + function tools** hosted in NestJS (you own the loop; tools run with tenant/RLS context). Only reach for the full Agents SDK if multi-agent handoffs are later needed.
   - Verify exact OpenAI SDK surface against current docs before writing (Responses API shapes, tool schema, vision input, streaming). Don't write from memory.
3. **Fix the 3 Phase-4 reliability bugs:**
   - After a `click` that opens a form, **re-scan the DOM** and resolve fill targets by label/placeholder, not pre-guessed selectors. Retry fills once the fields exist.
   - Constrain `interact_with_page` targets to the **main content area** (exclude the sidebar nav and the chat widget itself) so it stops clicking sidebar links.
   - **Clear the form-fill banner on route change** (subscribe to pathname).
4. **Build the role-tagged HR tool registry** for the **core 6–7 modules**: Core HR, Leave, Attendance, Expense, Performance, Compensation, People Analytics. Each tool: `{ name, description (prescriptive "call this when…"), parameters, allowedRoles, execute }`. **All execute() paths go through TenantService/RLS.**
   Representative tool set (replicate the pattern across modules):
   - **Cross-cutting:** `navigate_to_module(moduleId, tab?)`, `interact_with_page(actions[])`, `read_page`, `query_dashboard_stats()`
   - **Core HR:** `query_employees(search?, dept?, limit?)`, `get_employee(id)`, `create_employee(...)` *(admin)*, `update_employee(...)` *(admin)*
   - **Leave:** `get_my_leave_balance()`, `apply_for_leave(...)`, `list_leave_requests(status?)` *(mgr/admin)*, `approve_leave_request(id)` *(mgr/admin)*, `reject_leave_request(id, reason)` *(mgr/admin)*
   - **Attendance:** `get_attendance_summary(date?)`, `get_team_attendance(date?)` *(mgr/admin)*
   - **Expense:** `list_expense_reports(status?)`, `submit_expense(...)`, `approve_expense(id)` *(mgr/admin)*
   - **Performance:** `get_my_goals()`, `draft_review(employeeId)` *(mgr)*, `list_team_performance()` *(mgr/admin)*
   - **Compensation:** `get_my_comp()` *(employee)*, `comp_summary()` *(admin)*
   - **People Analytics:** `natural_language_report(question)` *(mgr/admin)*
5. **Confirmation gating:** mutating tools (approve/reject/create/update/delete) return as a pending action that requires the existing `action-confirm-dialog` "Allow / Cancel" before executing. Read/navigate tools run immediately.
6. **Multi-step (old Phase 5):** rely on the agentic loop. Verify a 2-step ask works end-to-end (e.g. "find Priya's pending leave and approve it" → query → confirm → approve).

### The ~20 "assistant" features this delivers (blueprint → tool mapping)
Universal AI Assistant, Intelligent Search, Proactive Suggestions (Platform); Manager Copilot, Natural Language Reports/Analytics/BI (Platform/People Analytics); Conversational Apply, Approval Copilot, Smart Leave Planner (Leave); Comp Clarity Bot (Compensation); AI Profile Assistant (Core HR); AI Onboarding Buddy (Onboarding); Compliance Reminder Bot (Compliance); Policy Copilot (Expense); Team Insights Brief, Quarterly Planning Brief (Manager reads). **These are not separate builds — they are surfaces of the one tool-equipped assistant.**

### Sprint 1 acceptance (5-minute smoke test before calling it done)
- [x] "How many employees do we have?" → queries and answers with the real number. *(API smoke ✓)*
- [x] "Show pending leave requests" → lists real rows (as mgr/admin). *(API smoke ✓)*
- [x] "Approve leave for <name>" → shows Allow/Cancel; Allow executes; **DB row flips to approved**. *(API smoke ✓ — full interruption→RunState resume→execute)*
- [x] Screen form-fill: "change company name to X and save" → fills field + clicks the **correct** Save (not sidebar), resolved from the page snapshot. *(API smoke ✓)*
- [x] As **employee** role: an approve request is declined (not authorized). *(API smoke ✓)*
- [x] Redis stopped → chat still responds (no 500); in-memory fallback kicks in. *(API smoke ✓ — whole suite ran with Redis down)*
- [~] "What page am I on?" → correct module **and tab** — verified via page context; real-screenshot (`input_image`) vision path is wired but **browser-verify in Sprint 3**.
- [~] Core HR → "add an employee" full browser flow — fill mechanics proven; **end-to-end click-through = Sprint 3 UAT**.
- [~] Navigate to another module → previous page's banner is gone — implemented (`useEffect` on pathname); **browser-verify in Sprint 3**.

---

## SPRINT 2 — Standalone AI features (their own UI)

> **STATUS: ✅ DONE (2026-06-08).** All 2B features + 2A shipped, each reusing a shared global `AiCoreService` (`apps/api/src/shared/ai/` — bootstraps the OpenAI key once; `extractStructured()` for validated/zod + vision, `generateText()` for free-form). API smoke tests green for every feature; `pnpm --filter @hrms/api build` and `pnpm --filter @hrms/web type-check` both clean. DROP list held. Per-feature details in `memory/ai-chatbot-rebuild.md`.

**Goal:** The easy/medium features that are NOT chatbot tools — they live as their own tab/button/flow step. (Effort/verdict rationale is in the analysis below.)

### 2A — Assistant-tool overflow ✅
Wired the role-tagged tool pattern from Sprint 1 across the **remaining modules** — added **12 read-only query tools** to `tool-registry.ts` (Daily Work Logging `get_my_timesheets`; Talent `list_job_postings`; Onboarding `list_onboardings`; L&D `get_my_learning`+`list_courses`; Engagement `list_surveys`; Payroll `get_my_payslips`+`list_payroll_runs`; Compliance `list_compliance_policies`; Workforce `get_workforce_plan`; Integrations `list_integrations`). All tenant-scoped, role-tagged. **Demo Company skipped** (low value — logged in code).

### 2B — Standalone AI features (build these; all `gpt-5.5`, vision where noted)
**Must incorporate (high value):**
- **Smart Receipt Scanner** (Expense) — vision: upload receipt → autofill expense line items. Flagship; reuses the vision pipeline. *Inline on the expense form.*
- **AI Column Mapper / Smart Document Parser** (Cold Start / Core HR import) — map spreadsheet columns → schema. Kills onboarding pain. *Step in the import wizard.*
- **AI JD Generator** (Talent) — generate job description from inputs. *Button on the job form.*
- **AI Review Draft / Goal Suggestions** (Performance) — draft from notes. *Button in the review/goals form.* ✅
- **Feedback Digest / Exit Interview Analyzer** — summarize text. *Button.* ✅
- **Sentiment Analysis Engine** (Engagement) — NLP over survey text. *Own dashboard/tab.* ✅
- **Rules-based Anomaly Detection** (Payroll/Expense/Attendance) — deterministic rules (>Nσ, duplicate receipts, impossible punches) + LLM explanation. **Build the honest rules version; NOT an ML "fraud model."** *Own tab.* ✅ *(Expense: duplicate / over-limit / >3σ outlier / missing-receipt rules; LLM explain-only with templated fallback.)*
- **AI Content Generator** (L&D) — course/quiz copy. *Button.* ✅

**Explicitly DROP (do not build):** anything "Predictive / Forecast / Attrition Model / Simulation" (no training data → fake on a fresh tenant); Tax/Regulatory advice and Bias/Equity audits (liability); Commute-Aware Clock-In (needs live traffic feed); autonomous agents (Sourcing Agent, Agentic HR Ops). If asked, push back with the reason. — **held: none built.**

### Sprint 2 acceptance (smoke test)
- [x] Receipt Scanner: upload a sample receipt → fields populate. *(API smoke ✓ — real receipt extracted grand-total/date/category; non-receipt → `isReceipt:false`, no hallucination)*
- [x] Column Mapper: import a CSV with odd headers → correct field mapping proposed. *(API smoke ✓ — messy headers where exact-match got 0 → AI mapped **11/11**)*
- [x] JD Generator: inputs → usable JD draft in the form. *(API smoke ✓ — overview + 7 responsibilities + 7 requirements, incorporated given skills)*
- [x] Anomaly Detection tab: seeded anomalies show with plain-English explanations; clean data shows none. *(API smoke ✓ — injected duplicate/outlier/missing-receipt all flagged; AI reused exact rule numbers; clean items not flagged)*
- [x] *(extra)* Sentiment Engine: survey free-text → correct sentiment split + grounded themes. *(API smoke ✓)*
- [x] *(extra)* 5 text-buttons + 2A tools: all reachable, outputs grounded in input, negatives return `ok:false`. *(API smoke ✓)*

> Browser/persona click-through of all the above = **Sprint 3 owner UAT** (matrix below).

---

## SPRINT 3 — Manual UAT (owner's hands-on sprint)

> **📋 The full step-by-step click-by-click script lives in [`ai-chatbot-plan/sprint-3-manual-testing.md`](sprint-3-manual-testing.md)** — exact logins, pages, prompts to type, and expected results. Use that to actually run UAT. The matrix below is the summary.

**Goal:** The owner click-tests the whole assistant + features. No coding. This is where "done" is defined. Run per persona by logging in as each role (seeded creds — see below).

### Test matrix — for EACH role (super_admin/admin, manager, employee)
**A. Assistant basics**
- [ ] Bubble appears bottom-right on every dashboard page; drag → refresh → position restored.
- [ ] Open/close; messages persist across close/reopen.
- [ ] "What page am I on?" is correct on 5 different modules **and** reflects the active **tab** (switch tabs without navigating, ask again).
- [ ] "What does this dashboard show?" describes the **actual** on-screen stats/table (not generic boilerplate).

**B. Read/query**
- [ ] Employee count, list employees, my leave balance, pending approvals, attendance summary, dashboard stats — each returns **real** data scoped to the org.
- [ ] Data scope respects role (employee sees only own; manager sees team; admin sees org).

**C. Navigation + screen actions**
- [ ] "Take me to <module>" navigates; "go to the <tab> tab" switches tab.
- [ ] "Change company name to X and save" → fills + clicks correct Save.
- [ ] "Add employee <name> <email>" → opens form, fills rendered fields, submits, row appears.

**D. Mutations + confirmation**
- [ ] "Approve leave for <name>" → Allow/Cancel dialog → Allow → state changes; Cancel → "cancelled" message, no change.
- [ ] Unauthorized action for the role is declined with a clear message.

**E. Multi-step**
- [ ] "Find <name>'s pending leave and approve it" runs as one coherent multi-step turn.

**F. Standalone features (Sprint 2)**
- [ ] Receipt Scanner, Column Mapper, JD Generator, Anomaly tab each work end-to-end.

**G. Resilience**
- [ ] Stop Redis → chat still works. Bad input → friendly error, no crash. Navigate mid-task → no stale banner.

**Success = every box checked for every applicable role.** File any failure back as a Sprint-1/2 bug.

### Seeded test credentials (verify against current seed before testing)
- Admin: `admin@acme.com` / `Admin@123` (super_admin, org "Acme Corp")
- Re-run `pnpm seed` if data is missing. Local DB: PostgreSQL, `DATABASE_URL=postgresql://postgres@127.0.0.1:5432/hrms`.

---

## Appendix — AI feature effort/verdict analysis (reference)

176 AI features in the blueprint (`diagrams/mindmap-data.json`, type `"AI"`). Judged against this stack (OpenAI `gpt-5.5` + vision, Postgres with tenant data, no ML pipeline, young product).

Two hard DROP triggers regardless of effort: **(1) no training data** (any "predictive/forecast/attrition model" is fake on a fresh tenant); **(2) liability** (tax/regulatory advice, bias/equity audits).

- **Easy (one model call):** JD Generator, Review Draft, Goal Suggestions, Feedback Digest, Exit Interview Analyzer, Comp Clarity, Conversational Apply (→assistant), Balance Forecast (deterministic). *Drop:* Interview Prep / Career Path Simulator (generic), Tax hints (liability), Wellness nudges (gimmick).
- **Medium (OCR/RAG/aggregation):** Receipt Scanner (vision), Column Mapper / Document Parser, Document Search (embeddings), Team/Manager briefs, Auto-Fill Timesheet, Sentiment Engine, NL Reports. *Drop:* Commute-Aware Clock-In, Shift Optimizer, Bias/Equity audits.
- **Hard (real ML / live feeds / agents):** *Incorporate only the rules-based Anomaly Detection.* *Drop:* all Predictors/Forecasters/Simulators, Regulatory Auto-Update, Sourcing Agent / Agentic HR Ops, AI Tutor.

Net: ~27 "must incorporate", ~20 collapse into the assistant, ~40+ dropped until there's data and a moat.

---

## What NOT to goof up (checklist for the next session)
- [ ] **OpenAI API key only.** Never subscription OAuth (ToS + ban risk).
- [ ] **Model = `gpt-5.5`** (not `gpt-4o`, not `gpt-5.5-pro` except for hard reasoning).
- [ ] **Verify OpenAI SDK syntax against current docs** before writing (Responses API, tool schema, vision, streaming). Don't code from memory.
- [ ] **Every data tool goes through TenantService/RLS** (`org_id`). Never bypass.
- [ ] **Role-tag every tool** with `allowedRoles`; enforce server-side.
- [ ] **DTO fields need class-validator decorators** or `whitelist:true` strips them.
- [ ] **Confirmation dialog for all mutations.**
- [ ] **Don't rebuild the frontend widget** — it works. Touch only the store/executor for the action fixes.
- [ ] **Smoke-test at the end of each sprint** — don't pile broken work into Sprint 3.
- [ ] **Don't build the DROP features.** Push back with the reason if asked.
