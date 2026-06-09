# AI Chatbot Assistant — Master Overview

> **⚠️ OUTDATED IN PLACES — see `sprint-plan.md` for the current plan of record.** This doc captures the original Phase 1–5 architecture. As of 2026-06-08 the assistant was **rebuilt on the OpenAI Agents SDK (`@openai/agents`) with `gpt-5.5`** (not `gpt-4o` Chat-Completions), and Sprints 1 + 2 are ✅ DONE. The diagrams/flows below are still broadly accurate; only the model id (`gpt-4o` → `gpt-5.5`), the loop (raw function-calling → Agents SDK loop), and the confirmation flow (now SDK interruptions + `RunState` resume) have changed. Implementation log: `memory/ai-chatbot-rebuild.md`.

## Vision

An embedded floating AI assistant widget for the HRMS SaaS platform. It acts as the admin's personal AI assistant — aware of which page the user is on, able to answer questions about HRMS data, trigger actions (approve, create, navigate), fill forms, and execute multi-step workflows with pause/resume capability.

## Architecture Diagram

```
+-----------------------------------------------------------+
|  FRONTEND (Next.js 15 — apps/web/)                        |
|                                                           |
|  +------------------+   +-----------------------------+   |
|  | Dashboard Layout |   | ChatBubble (floating)       |   |
|  | (layout.tsx)     |   |  -> ChatWindow              |   |
|  |                  |   |     -> ChatMessageList       |   |
|  | usePageContext() <---+     -> ChatInput             |   |
|  | (current module, |   |     -> ActionConfirmDialog   |   |
|  |  tab, role)      |   |                             |   |
|  +------------------+   +------------|----------------+   |
|                                      |                    |
|  +-----------------------------------v-----------------+  |
|  | useChatStore (Zustand)                              |  |
|  | - messages[], conversationId, isStreaming            |  |
|  | - pendingAction, formFillState, taskState            |  |
|  +-----------------------------------|-----------------+  |
|                                      | POST /ai-assistant/chat
+--------------------------------------|--------------------+
                                       |
+--------------------------------------|--------------------+
|  BACKEND (NestJS — apps/api/)        v                    |
|                                                           |
|  +----------------------------------------------------+  |
|  | AiAssistantModule                                   |  |
|  |  AiAssistantController  POST /ai-assistant/chat     |  |
|  |  AiAssistantService     (orchestrator)              |  |
|  |                                                     |  |
|  |  +----------------------------------------------+   |  |
|  |  | OpenAI Integration (gpt-4o)                  |   |  |
|  |  | - System prompt with org context             |   |  |
|  |  | - Function calling for actions               |   |  |
|  |  | - Conversation memory (Redis)                |   |  |
|  |  +----------------------------------------------+   |  |
|  |                                                     |  |
|  |  +----------------------------------------------+   |  |
|  |  | ActionRegistry                               |   |  |
|  |  | - Maps intent -> API endpoint + params       |   |  |
|  |  | - navigate, approve, create, update, query   |   |  |
|  |  +----------------------------------------------+   |  |
|  |                                                     |  |
|  |  +----------------------------------------------+   |  |
|  |  | ContextBuilder                               |   |  |
|  |  | - Builds system prompt from page context     |   |  |
|  |  | - Injects org data, module state, user role  |   |  |
|  |  +----------------------------------------------+   |  |
|  +----------------------------------------------------+  |
|                                                           |
|  Existing modules (core-hr, leave, attendance, etc.)      |
|  are called internally by ActionRegistry                  |
+-----------------------------------------------------------+
```

## Phase Summary

| Phase | Title | Scope | Key Deliverables |
|-------|-------|-------|-----------------|
| 1 | Chat Widget UI + Page Context | Frontend only | Floating bubble, chat window, page context hook, Zustand store, hardcoded responses |
| 2 | AI Backend + NLU | Backend + connect | NestJS AiAssistant module, OpenAI integration, conversation memory, page-aware responses |
| 3 | Action Execution Engine | Full-stack | Action registry, OpenAI function calling, frontend action executor, confirmation UX |
| 4 | Smart Form Filling | Full-stack | Form field registry, AI-driven form population, confirmation before submit |
| 5 | Task Pause/Resume | Full-stack | Task state machine, multi-step workflows, conversation context preservation |

## Tech Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM Model | `gpt-4o` | Best balance of speed, cost, and function-calling quality |
| Conversation memory | Redis (existing) | Already in stack via `apps/api/src/infrastructure/cache/`; TTL-based expiry |
| Function calling | OpenAI native | Structured output for action execution; no LangChain overhead |
| Frontend state | Zustand | Matches existing pattern (auth-store, module-store, etc.) |
| Streaming | SSE via `text/event-stream` | Real-time token delivery without WebSocket complexity |
| Message format | Markdown | Rendered client-side; matches existing card/table UI patterns |

## Key File Paths (Existing Codebase)

```
# Frontend
apps/web/src/app/(dashboard)/layout.tsx          # Dashboard layout — chat widget mounts here
apps/web/src/lib/api.ts                           # Axios client with auth interceptors
apps/web/src/lib/auth-store.ts                    # Auth Zustand store (user, role, orgId)
apps/web/src/lib/module-store.ts                  # Module list Zustand store
apps/web/src/app/globals.css                      # Theme tokens (--color-primary, etc.)
apps/web/src/components/ui/skeleton.tsx            # Existing skeleton components
apps/web/src/components/ui/empty-state.tsx         # Existing empty state component

# Backend
apps/api/src/app.module.ts                        # Root module — register AiAssistantModule here
apps/api/src/shared/auth/guards/jwt-auth.guard.ts # Global JWT guard (auto-applies)
apps/api/src/shared/multi-tenancy/tenant.service.ts # TenantService for orgId
apps/api/src/infrastructure/cache/cache.module.ts  # Redis cache module
apps/api/src/infrastructure/cache/cache.service.ts  # Redis cache service
apps/api/src/modules/core-hr/                      # Reference module structure

# Shared
packages/shared/src/index.ts                       # Shared type exports
packages/shared/src/types/auth.ts                  # UserRole, LoginResponse types
.env                                               # OPENAI_API_KEY already configured
```

## Logbook System

Each phase document has an empty "Results & Changes Log" section at the bottom. After implementing a phase, the implementor fills in:

1. **Files created** — exact paths
2. **Files modified** — exact paths + what changed
3. **Lines of code** — approximate count
4. **Deviations from plan** — anything done differently and why
5. **Known issues** — bugs or limitations discovered
6. **Testing notes** — what was manually verified

Subsequent phases start with "Pre-requisites: Review Phase N logbook" so each implementation session has full context of what the prior phase actually delivered (vs. what was planned).

## Conventions

- All new backend code goes under `apps/api/src/modules/ai-assistant/`
- All new frontend code goes under `apps/web/src/components/ai-assistant/`
- New Zustand store: `apps/web/src/lib/chat-store.ts`
- Shared types: `packages/shared/src/types/ai-assistant.ts` (exported from index.ts)
- API prefix: `/api/v1/ai-assistant/...`
- Controller decorators: `@Roles('super_admin', 'admin')` initially; expand to manager/employee in later iterations
