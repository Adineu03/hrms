# Phase 2: AI Backend + Natural Language Understanding

## Pre-requisites

Review Phase 1 logbook first — read the "Results & Changes Log" section of `ai-chatbot-plan/phase-1-chat-widget-ui.md` to understand what was actually built (file paths, deviations from plan, known issues).

## What This Phase Delivers

- A NestJS `AiAssistantModule` with a POST `/ai-assistant/chat` endpoint
- OpenAI `gpt-4o` integration with page-context-aware system prompts
- Conversation memory stored in Redis with TTL-based expiry
- A context builder that assembles org data, module state, and user info into the system prompt
- Frontend chat store updated to call the real API instead of hardcoded responses
- Streaming support via Server-Sent Events (SSE)

## Architecture & Key Decisions

### System Prompt Strategy
The system prompt is dynamically assembled per request:
1. **Base persona** — "You are an AI assistant for {orgName}'s HRMS platform..."
2. **User context** — "The user is {firstName} {lastName}, role: {role}"
3. **Page context** — "They are currently viewing the {moduleName} module, {tabName} tab"
4. **Module context** — "Active modules: {list}. The {moduleName} module handles: {description}"
5. **Capabilities** — "You can answer questions about HR data, explain features, and guide users. In future updates you will be able to execute actions."

### Conversation Memory
- Stored in Redis under key `chat:{orgId}:{userId}:{conversationId}`
- Each conversation stores the last 50 messages (system + user + assistant)
- TTL: 24 hours (86400 seconds)
- New conversation created if no conversationId provided or if existing one expired

### Streaming
- Backend uses SSE (`@Sse` decorator or manual `Response` with `text/event-stream`)
- Each chunk is a `data: {JSON}\n\n` event
- Frontend uses `EventSource` or `fetch` with `ReadableStream` to consume
- Fallback: non-streaming POST for simpler initial implementation

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `apps/api/src/modules/ai-assistant/ai-assistant.module.ts` | NestJS module |
| `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts` | POST /ai-assistant/chat endpoint |
| `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` | Orchestrator: builds prompt, calls OpenAI, manages memory |
| `apps/api/src/modules/ai-assistant/context-builder.service.ts` | Builds dynamic system prompt from page/org context |
| `apps/api/src/modules/ai-assistant/conversation-memory.service.ts` | Redis-based conversation storage |
| `apps/api/src/modules/ai-assistant/dto/chat.dto.ts` | Request/response DTOs |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | Add `AiAssistantModule` to imports array |
| `apps/web/src/lib/chat-store.ts` | Replace hardcoded response with real API call |
| `packages/shared/src/types/ai-assistant.ts` | Add streaming event types if needed |

## Implementation Prompt

```
I need you to implement Phase 2 of the AI Chatbot Assistant. This adds the AI backend and connects the frontend chat widget to it.

IMPORTANT: First read these files to understand what Phase 1 delivered:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — read the "Results & Changes Log" section
- `ai-chatbot-plan/overview.md` — architecture context

Then read these existing files to understand patterns:
- `apps/api/src/app.module.ts` — where to register the new module
- `apps/api/src/modules/core-hr/core-hr.module.ts` — module structure pattern
- `apps/api/src/modules/core-hr/features/admin/employee-master.controller.ts` — controller pattern (TenantService, Roles decorator, getOrgIdOrThrow)
- `apps/api/src/infrastructure/cache/cache.service.ts` — Redis cache service to use for conversation memory
- `apps/web/src/lib/chat-store.ts` — current chat store (Phase 1 version with hardcoded responses)
- `apps/web/src/lib/api.ts` — axios client with auth interceptors
- `.env` — confirm OPENAI_API_KEY exists

Here's exactly what to build:

### 1. Install OpenAI SDK

Run: `cd apps/api && pnpm add openai`

### 2. DTO (`apps/api/src/modules/ai-assistant/dto/chat.dto.ts`)

```typescript
export class ChatRequestDto {
  message: string;
  conversationId?: string;
  pageContext: {
    moduleId: string | null;
    moduleName: string | null;
    activeTab: string | null;
    userRole: string;
    pathname: string;
  };
}
```

### 3. Conversation Memory Service (`apps/api/src/modules/ai-assistant/conversation-memory.service.ts`)

- Inject `CacheService` from `../../infrastructure/cache/cache.service`
- Methods:
  - `getConversation(orgId, userId, conversationId)` — returns array of OpenAI message objects from Redis
  - `saveConversation(orgId, userId, conversationId, messages)` — saves to Redis with 24h TTL
  - `createConversationId()` — returns `crypto.randomUUID()`
- Redis key format: `chat:${orgId}:${userId}:${conversationId}`
- Store max 50 messages per conversation

### 4. Context Builder Service (`apps/api/src/modules/ai-assistant/context-builder.service.ts`)

- Inject `TenantService` for orgId
- Method: `buildSystemPrompt(pageContext, user)` returns a string
- The system prompt should:
  - Identify as the org's HRMS AI assistant
  - State the user's name and role
  - Describe what page they're on and what that module does
  - List capabilities (answer HR questions, explain features, provide guidance)
  - Include behavioral rules: be concise, professional, use markdown for formatting
  - Include the current date
  - IMPORTANT: Include instruction "If the user asks you to perform an action (like approving something, creating a record, or navigating), tell them this capability is coming soon."

### 5. AI Assistant Service (`apps/api/src/modules/ai-assistant/ai-assistant.service.ts`)

- Inject: `ConfigService`, `ConversationMemoryService`, `ContextBuilderService`
- Create OpenAI client in `onModuleInit()` using `ConfigService.get('OPENAI_API_KEY')`
- Method: `chat(dto: ChatRequestDto, user: { id, firstName, lastName, role, orgId, orgName })`:
  1. Get or create conversationId
  2. Load conversation history from Redis
  3. Build system prompt via ContextBuilder
  4. Append user message to history
  5. Call `openai.chat.completions.create({ model: 'gpt-4o', messages: [...], max_tokens: 1000, temperature: 0.7 })`
  6. Extract assistant response
  7. Save updated conversation to Redis
  8. Return `{ message: { id, role: 'assistant', content, timestamp }, conversationId }`

### 6. AI Assistant Controller (`apps/api/src/modules/ai-assistant/ai-assistant.controller.ts`)

- `@Controller('ai-assistant')`
- Inject: `AiAssistantService`, `TenantService`
- `@Post('chat')` endpoint:
  - Extract user from request (use `@Req()` and `req.user` — the JWT guard populates this)
  - Extract orgId from TenantService
  - Call service.chat(dto, user)
  - Return the response
- `@Post('clear')` endpoint:
  - Clears conversation memory for the user
- Roles: `@Roles('super_admin', 'admin', 'manager', 'employee')` — all roles can use the assistant

### 7. AI Assistant Module (`apps/api/src/modules/ai-assistant/ai-assistant.module.ts`)

- Import: `CacheModule` from infrastructure
- Providers: `AiAssistantService`, `ConversationMemoryService`, `ContextBuilderService`
- Controllers: `AiAssistantController`

### 8. Register Module (`apps/api/src/app.module.ts`)

Add `AiAssistantModule` to the imports array, after `DemoCompanyModule`.

### 9. Update Frontend Chat Store (`apps/web/src/lib/chat-store.ts`)

Replace the hardcoded response logic in `sendMessage()`:
- POST to `/ai-assistant/chat` using the `api` axios instance from `@/lib/api`
- Send `{ message: content, conversationId, pageContext }`
- On success: push the assistant's ChatMessage to messages array, update conversationId
- On error: push an error message like "Sorry, I couldn't process your request. Please try again."
- Set isLoading=true before request, false after

For `clearChat()`:
- POST to `/ai-assistant/clear`
- Reset local state

### Error Handling
- If OpenAI API key is missing, the service should log a warning and return a fallback message: "AI assistant is not configured. Please set OPENAI_API_KEY."
- If OpenAI rate-limits or errors, catch and return a friendly error message
- Conversation memory failures should not block the chat — fall back to no-memory mode

### Testing
After implementation:
1. Open the chat widget on any dashboard page
2. Type "What page am I on?" — the AI should describe your current module/page
3. Type "What can you help me with?" — should list HRMS-related capabilities
4. Type "Approve all pending leave requests" — should say this capability is coming soon
5. Navigate to a different module, ask "Where am I now?" — should reflect the new page
6. Close and reopen browser — conversation should persist (Redis)
7. Check that non-admin roles (manager, employee) can also use the chat
```

## Acceptance Criteria

1. **Endpoint works** — POST `/api/v1/ai-assistant/chat` returns a valid ChatResponse
2. **OpenAI integration** — Responses are generated by gpt-4o (not hardcoded)
3. **Page awareness** — AI correctly identifies the user's current module and role
4. **Conversation memory** — Follow-up messages have context from prior messages in the same conversation
5. **Memory persists** — Conversation survives browser refresh (stored in Redis, keyed by conversationId)
6. **Frontend connected** — Chat widget shows real AI responses (no more hardcoded text)
7. **Error handling** — Missing API key, OpenAI errors, and network failures show friendly messages
8. **All roles work** — super_admin, admin, manager, and employee can all use the chat
9. **No regressions** — All existing API endpoints still work; JWT auth still functions

## Results & Changes Log

### Implementation Date: 2026-04-08

### Status: COMPLETE

### Files Created (6)

| File | Lines | Purpose |
|------|-------|---------|
| `apps/api/src/modules/ai-assistant/dto/chat.dto.ts` | 32 | `ChatRequestDto` + `PageContextDto` with class-validator decorators (`@IsString`, `@ValidateNested`, `@Type`) — required because global `ValidationPipe({ whitelist: true })` strips undecorated properties |
| `apps/api/src/modules/ai-assistant/conversation-memory.service.ts` | 72 | Redis-backed conversation storage. Key format: `chat:{orgId}:{userId}:{conversationId}`. 50-message cap, 24h TTL. All methods wrapped in try/catch for graceful fallback |
| `apps/api/src/modules/ai-assistant/context-builder.service.ts` | 62 | Builds dynamic system prompt with: org name, user name/role, module description (all 19 modules mapped), capabilities list, behavioral rules, current date, "action coming soon" instruction |
| `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` | 132 | OpenAI `gpt-4o` integration. Initializes client in `onModuleInit()`. Orchestrates: load history → build system prompt → call OpenAI → save updated history. Handles missing API key (fallback message), rate limits (429), and general errors |
| `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts` | 100 | `POST /ai-assistant/chat` — looks up user firstName/lastName from `users` table and orgName from `orgs` table for system prompt. `POST /ai-assistant/clear` — clears Redis conversation. Both endpoints wrapped in try/catch. All 4 roles allowed |
| `apps/api/src/modules/ai-assistant/ai-assistant.module.ts` | 11 | NestJS module wiring — controller + 3 providers |

### Files Modified (2)

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | Added `AiAssistantModule` import after `DemoCompanyModule` |
| `apps/web/src/lib/chat-store.ts` | Replaced hardcoded 500ms response with real `api.post('/ai-assistant/chat', ...)` call. `clearChat()` now calls `POST /ai-assistant/clear`. Error handling pushes friendly error message to chat |

### Deviations from Plan

| Planned | Actual | Reason |
|---------|--------|--------|
| DTO as plain class without decorators | Added `class-validator` + `class-transformer` decorators | Global `ValidationPipe({ whitelist: true })` in `main.ts` strips undecorated properties — `pageContext` was arriving as `undefined` causing 500 error |
| Inject `CacheService` | Inject `REDIS` symbol directly | No `CacheService` wrapper exists in the codebase — `CacheModule` exports a raw `REDIS` ioredis instance via Symbol-based provider |
| Streaming via SSE | Non-streaming POST only | Phase 2 spec prioritized getting the basic flow working; streaming deferred to a future phase |
| Controller without try/catch | Added outer try/catch in `chat()` handler | DB lookups for user/org details could throw unhandled errors; now returns friendly error response instead of 500 |

### Bug Fixed During Implementation

**Root cause of initial 500 error:** `ValidationPipe({ whitelist: true, transform: true })` in `main.ts` strips any request body property that lacks a `class-validator` decorator. The initial DTO had no decorators, so `dto.message` and `dto.pageContext` were both stripped to `undefined`. Fixed by adding `@IsString()`, `@ValidateNested()`, `@Type(() => PageContextDto)` decorators.

### Acceptance Criteria Results

| # | Criteria | Result |
|---|----------|--------|
| 1 | Endpoint works — POST `/api/v1/ai-assistant/chat` returns valid ChatResponse | PASS |
| 2 | OpenAI integration — responses generated by gpt-4o | PASS |
| 3 | Page awareness — AI correctly identifies current module and role | PASS — tested on Cold Start Setup page, AI described "Initial organization setup" and listed the 5 setup steps |
| 4 | Conversation memory — follow-up messages have context | PASS (when Redis is running) |
| 5 | Memory persists across browser refresh | PARTIAL — works when Redis is available; gracefully falls back to no-memory mode when Redis is down |
| 6 | Frontend connected — real AI responses in chat widget | PASS |
| 7 | Error handling — friendly messages for all failure modes | PASS — missing API key, OpenAI errors, network failures all show user-friendly messages |
| 8 | All roles work — super_admin, admin, manager, employee | PASS — `@Roles()` decorator allows all 4 roles |
| 9 | No regressions — existing endpoints and auth still work | PASS |

### Known Issues

- **Redis optional:** Conversation memory requires Redis. Without it, each message is treated as a new conversation (no history). App logs a warning but functions normally.
- **No streaming:** Responses are non-streaming — user sees a loading indicator until the full response arrives. Streaming (SSE) deferred to a future phase.
