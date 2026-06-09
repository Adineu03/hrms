# Phase 3: Action Execution Engine

## Pre-requisites

Review these logbooks before starting:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — "Results & Changes Log" section
- `ai-chatbot-plan/phase-2-ai-backend.md` — "Results & Changes Log" section

## What This Phase Delivers

- An action registry that maps AI intents to real HRMS API calls
- OpenAI function calling integration so the AI can trigger structured actions
- A frontend action executor that processes action payloads from the AI
- A confirmation dialog before executing any destructive/state-changing action
- Navigation actions that route the user to specific pages
- Query actions that fetch and display data inline in the chat

## Architecture & Key Decisions

### OpenAI Function Calling
Instead of parsing free-text responses to detect intents, we use OpenAI's native function calling:
- Define a set of "tools" (functions) that the AI can call
- The AI decides when to call a function based on the user's message
- The function call returns structured JSON with the action type and parameters
- The backend executes the action (or returns it to the frontend for execution)

### Action Categories

| Category | Examples | Execution |
|----------|----------|-----------|
| `navigate` | "Go to Leave Management", "Show me the attendance page" | Frontend — router.push() |
| `query` | "How many employees are on leave today?", "Show pending approvals" | Backend — calls existing API, returns data |
| `mutate` | "Approve leave request #123", "Create a new department" | Backend — calls existing API, requires confirmation |

### Confirmation Flow
1. AI returns action with `requiresConfirmation: true`
2. Frontend shows confirmation dialog: "The AI wants to: Approve leave request for John Doe (Dec 25-27). Allow?"
3. User clicks Confirm or Cancel
4. If confirmed, frontend sends `POST /ai-assistant/execute-action` with the action payload
5. Backend executes and returns result
6. AI formats the result as a chat message

### Action Registry
A centralized map of all available actions, their parameters, which API endpoint they call, and which roles can execute them. This is defined in the backend and a summary is sent to OpenAI as function definitions.

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `apps/api/src/modules/ai-assistant/action-registry.ts` | Maps action names to API calls, params, roles |
| `apps/api/src/modules/ai-assistant/action-executor.service.ts` | Executes actions by calling internal services |
| `apps/api/src/modules/ai-assistant/tools/function-definitions.ts` | OpenAI function/tool definitions array |
| `apps/web/src/components/ai-assistant/action-confirm-dialog.tsx` | Confirmation dialog for actions |
| `apps/web/src/components/ai-assistant/action-result-card.tsx` | Renders action results (data tables, success messages) |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` | Add function calling to OpenAI call, handle tool_calls response |
| `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts` | Add `POST /ai-assistant/execute-action` endpoint |
| `apps/api/src/modules/ai-assistant/ai-assistant.module.ts` | Add ActionExecutorService to providers |
| `apps/web/src/lib/chat-store.ts` | Add action handling, confirmation state, executeAction() |
| `apps/web/src/components/ai-assistant/chat-window.tsx` | Render ActionConfirmDialog and ActionResultCard |
| `apps/web/src/components/ai-assistant/chat-message.tsx` | Render action results inline |
| `packages/shared/src/types/ai-assistant.ts` | Add action types, function call types |

## Implementation Prompt

```
I need you to implement Phase 3 of the AI Chatbot Assistant — the Action Execution Engine. This enables the AI to trigger real HRMS actions (navigate, query data, approve/create/update records).

IMPORTANT: First read these files to understand what Phases 1-2 delivered:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-2-ai-backend.md` — "Results & Changes Log"
- `ai-chatbot-plan/overview.md` — architecture context

Then read these existing files:
- `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` — current AI service (Phase 2)
- `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts` — current controller
- `apps/web/src/lib/chat-store.ts` — current chat store
- `apps/web/src/components/ai-assistant/chat-window.tsx` — current chat window

Also read these to understand the existing API endpoints you'll be calling:
- `apps/api/src/modules/core-hr/features/admin/employee-master.controller.ts` — employee CRUD pattern
- `apps/api/src/modules/leave-management/` — leave approval endpoints
- `apps/api/src/modules/attendance/` — attendance endpoints

Here's exactly what to build:

### 1. Shared Types (`packages/shared/src/types/ai-assistant.ts`)

Add these types:
- `ActionType` = 'navigate' | 'query_data' | 'approve' | 'create' | 'update' | 'reject'
- `ChatAction` — update to: { type: ActionType, name: string, description: string, parameters: Record<string, any>, requiresConfirmation: boolean, result?: ActionResult }
- `ActionResult` — { success: boolean, data?: any, error?: string, message: string }
- `ExecuteActionRequest` — { actionName: string, parameters: Record<string, any>, conversationId: string }

### 2. Function Definitions (`apps/api/src/modules/ai-assistant/tools/function-definitions.ts`)

Define OpenAI tool/function definitions. Start with these core actions:

```typescript
export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'navigate_to_module',
      description: 'Navigate the user to a specific HRMS module page',
      parameters: {
        type: 'object',
        properties: {
          moduleId: { type: 'string', description: 'Module ID (e.g., core-hr, leave-management, attendance)' },
          tab: { type: 'string', description: 'Optional tab name within the module' },
        },
        required: ['moduleId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_employees',
      description: 'Search or list employees with optional filters',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search term for name or email' },
          department: { type: 'string', description: 'Filter by department name' },
          limit: { type: 'number', description: 'Max results to return (default 10)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_leave_requests',
      description: 'Get leave requests with optional status filter',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: 'Filter by status' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'approve_leave_request',
      description: 'Approve a specific leave request by ID',
      parameters: {
        type: 'object',
        properties: {
          requestId: { type: 'string', description: 'The leave request ID to approve' },
          comment: { type: 'string', description: 'Optional approval comment' },
        },
        required: ['requestId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_attendance_summary',
      description: 'Get attendance summary/stats for the team or organization',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format (default today)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_dashboard_stats',
      description: 'Get overall dashboard statistics (total employees, active modules, pending approvals)',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];
```

### 3. Action Registry (`apps/api/src/modules/ai-assistant/action-registry.ts`)

Create a registry that maps function names to:
- Which internal API path to call (or which service method)
- Required role(s) to execute
- Whether it requires user confirmation
- A human-readable description template

Example structure:
```typescript
export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  navigate_to_module: {
    type: 'navigate',
    requiresConfirmation: false,
    allowedRoles: ['super_admin', 'admin', 'manager', 'employee'],
    execute: async (params, context) => { /* return navigation URL */ },
  },
  approve_leave_request: {
    type: 'mutate',
    requiresConfirmation: true,
    allowedRoles: ['super_admin', 'admin', 'manager'],
    execute: async (params, context) => { /* call leave service */ },
  },
  // ... etc
};
```

### 4. Action Executor Service (`apps/api/src/modules/ai-assistant/action-executor.service.ts`)

- Injectable service
- Inject: `TenantService` and the `api` axios instance (or use HttpModule) to call internal endpoints
- Method: `execute(actionName, parameters, user)`:
  1. Look up action in registry
  2. Check role authorization
  3. Execute the action
  4. Return ActionResult

For "query" actions: Call the existing API endpoints using internal HTTP calls (or directly inject the relevant services — e.g., inject the Drizzle DB and query directly). Simpler approach: use the existing service classes.

For "navigate" actions: Just return the URL to navigate to — no server-side execution needed.

For "mutate" actions: Call the relevant service method.

### 5. Update AI Assistant Service

Modify `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`:
- Import AI_TOOLS from function-definitions
- Add `tools: AI_TOOLS` to the OpenAI chat completion call
- Handle the response:
  - If `response.choices[0].message.tool_calls` exists, process each tool call
  - For navigation actions: return the action to frontend (no server execution)
  - For query actions: execute immediately, feed result back to OpenAI for formatting
  - For mutate actions: return as pending action requiring confirmation
- For query flow: after executing the query, send a second OpenAI call with the function result so the AI can format it naturally

### 6. Add Execute Endpoint to Controller

Add to `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts`:
```
@Post('execute-action')
async executeAction(@Body() dto: ExecuteActionDto, @Req() req) { ... }
```

### 7. Action Confirm Dialog (`apps/web/src/components/ai-assistant/action-confirm-dialog.tsx`)

- Renders when chat store has a pendingAction
- Shows: action description, parameters in a readable format
- Two buttons: "Allow" (green) and "Cancel" (gray)
- On Allow: calls store.executeAction()
- On Cancel: calls store.cancelAction() — adds "Action cancelled" message

### 8. Update Chat Store (`apps/web/src/lib/chat-store.ts`)

Add to state:
- `pendingAction: ChatAction | null`

Add actions:
- `executeAction()` — POST to `/ai-assistant/execute-action`, handle result
- `cancelAction()` — clear pendingAction, add cancellation message

Update `sendMessage()`:
- When API response includes an action with `requiresConfirmation: true`, set `pendingAction`
- When action is type 'navigate', execute `router.push()` immediately (no confirmation needed)
- When action includes inline data (query results), render in message

### 9. Action Result Card (`apps/web/src/components/ai-assistant/action-result-card.tsx`)

- Renders query results as a compact table or list within the chat
- Shows success/error status for mutate actions
- Style: bg-background rounded-lg border border-border p-3, compact text

### Testing
After implementation:
1. Ask "How many employees do we have?" — should query and show the count
2. Ask "Show me pending leave requests" — should query and list them
3. Ask "Take me to the attendance module" — should navigate there
4. Ask "Approve leave request [ID]" — should show confirmation dialog
5. Confirm the approval — should execute and show success
6. Cancel an action — should show cancellation message
7. Try an action as employee role — should be blocked if not authorized
```

## Acceptance Criteria

1. **Function calling works** — AI correctly detects when to call a function vs. give a text response
2. **Navigation works** — "Take me to X" navigates to the correct module page
3. **Queries work** — Data questions return real data from the database
4. **Confirmation dialog** — Destructive actions show a confirmation dialog before executing
5. **Role enforcement** — Employees cannot approve leave; only authorized roles can execute actions
6. **Error handling** — Failed actions show a friendly error message in chat
7. **Conversation flow** — After an action, the AI can discuss the result naturally
8. **No regressions** — Existing AI chat from Phase 2 still works for conversational queries

## Results & Changes Log

### Implementation Date: 2026-04-08

### Status: COMPLETE

### Files Created (5)

| File | Lines | Purpose |
|------|-------|---------|
| `apps/api/src/modules/ai-assistant/tools/function-definitions.ts` | ~110 | 7 OpenAI tool definitions: navigate_to_module (with complete tab IDs for all 19 modules × 3 roles), query_employees, query_leave_requests, approve_leave_request, reject_leave_request, query_attendance_summary, query_dashboard_stats |
| `apps/api/src/modules/ai-assistant/action-executor.service.ts` | ~210 | Action registry + executor. Each action has type (navigate/query/mutate), role restrictions, requiresConfirmation flag, and a Drizzle DB handler. Exports `ActionResult` interface |
| `apps/api/src/modules/ai-assistant/dto/execute-action.dto.ts` | 12 | DTO for `POST /ai-assistant/execute-action` with class-validator decorators |
| `apps/web/src/components/ai-assistant/action-confirm-dialog.tsx` | 55 | Yellow confirmation card — shows action description, parameter list, Allow (green) and Cancel (gray) buttons. Renders above chat input when `pendingAction` is set |
| `apps/web/src/components/ai-assistant/action-result-card.tsx` | 50 | Renders success/error status with CheckCircle2/XCircle icons + key-value data display inside chat message bubbles |

### Files Modified (9)

| File | Change |
|------|--------|
| `packages/shared/src/types/ai-assistant.ts` | Added `ActionType`, `ActionResult`, `ExecuteActionRequest`. Updated `ChatAction` with name, description, parameters, requiresConfirmation, result fields |
| `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` | Added `tools: AI_TOOLS` to OpenAI call. New `handleToolCalls()` — navigate returns URL to frontend, queries execute + second OpenAI call for formatting, mutations return pending with `requiresConfirmation: true`. New `executeAction()` method. Extracted `saveHistory()` helper |
| `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts` | Added `POST /ai-assistant/execute-action` endpoint with DB user/org lookup |
| `apps/api/src/modules/ai-assistant/ai-assistant.module.ts` | Registered `ActionExecutorService` as provider |
| `apps/api/src/modules/ai-assistant/context-builder.service.ts` | System prompt now lists all 19 modules as valid navigation targets. Removed stale "coming soon" instruction. Added explicit directives to ALWAYS use tools for navigation and data queries |
| `apps/web/src/lib/chat-store.ts` | Added `pendingAction`, `executeAction()`, `cancelAction()`, `handleNavigation` + `setNavigationHandler()`. Navigate actions auto-execute via `router.push()` + set `requestedTab` in tab-navigation store. Mutate actions set pendingAction for confirmation |
| `apps/web/src/components/ai-assistant/chat-window.tsx` | Registers navigation handler via `useRouter()`. Renders `ActionConfirmDialog` when pendingAction is set. Disables input during pending action |
| `apps/web/src/components/ai-assistant/chat-message.tsx` | Renders `ActionResultCard` inside assistant message bubbles when action has a non-navigation result |

### Tab Navigation Support (41 files)

| File | Change |
|------|--------|
| `apps/web/src/lib/tab-navigation-store.ts` | **New** — Global Zustand store with `requestedTab`, `setRequestedTab()`, `consumeRequestedTab()`. Chat sets it during navigation, dashboards read on mount |
| 40 dashboard components across all 19 modules | Added `useTabNavigationStore` import + `useEffect` that watches `requestedTab` and calls `setActiveTab()` when it changes, then clears the store. Works even when already on the target module page |

### Deviations from Plan

| Planned | Actual | Reason |
|---------|--------|--------|
| Action registry as a separate file with interface | Embedded in `action-executor.service.ts` as a const + inline handlers | Simpler — no need for a separate registry file when the executor owns both the registry and execution |
| Use HttpModule / internal API calls for queries | Direct Drizzle DB queries in action handlers | More reliable and simpler — avoids auth/routing complexity of self-calling |
| Tab navigation via `?tab=` URL query param | Zustand store (`tab-navigation-store.ts`) + `useEffect` in 40 dashboards | Dashboards use `useState` for tabs with no URL sync. Zustand store enables cross-component communication without prop drilling through 77 files |
| Function definition with partial tab IDs | Complete tab IDs for all 19 modules × 3 roles | AI was not passing `tab` param because it didn't know valid IDs. Added exhaustive list so AI can always pick the correct tab |

### Bugs Fixed During Implementation

1. **OpenAI SDK v6 union type** — `ChatCompletionMessageToolCall` is a union of `FunctionToolCall | CustomToolCall`. Added `toolCall.type !== 'function'` guard to narrow the type before accessing `.function.name`
2. **`leaveRequests` schema field names** — Schema uses `fromDate`/`toDate`/`employeeId`, not `startDate`/`endDate`/`userId`. Fixed in action executor queries
3. **`ActionResult` not exported** — TypeScript error `TS4053` (return type uses unexported name). Made the interface `export`
4. **Tab navigation not working when already on page** — Initial approach used `useState` initializer (only runs on mount). Changed to `useEffect` watching `requestedTab` from Zustand store so tab switches even when component is already mounted
5. **AI not calling navigate tool** — System prompt still had Phase 2's "tell them this capability is coming soon" instruction. Replaced with "ALWAYS use the navigate_to_module tool" directive. Added full module list to system prompt
6. **AI not passing tab parameter** — Function definition only listed tabs for 7 modules. Added complete tab IDs for all 19 modules × 3 roles

### Acceptance Criteria Results

| # | Criteria | Result |
|---|----------|--------|
| 1 | Function calling works — AI detects when to call a function vs. text response | PASS |
| 2 | Navigation works — "Take me to X" navigates to the correct module | PASS |
| 3 | Tab navigation works — "Take me to entities tab in Core HR" switches tab | PASS |
| 4 | Queries work — data questions return real DB data | PASS — tested "How many employees do we have?" |
| 5 | Confirmation dialog — mutate actions show confirmation before executing | PASS |
| 6 | Role enforcement — unauthorized roles get denied | PASS — action registry checks role before execution |
| 7 | Error handling — failed actions show friendly error in chat | PASS |
| 8 | Conversation flow — AI naturally formats query results | PASS — query results fed back to OpenAI for natural language formatting |
| 9 | No regressions — existing Phase 2 conversational chat still works | PASS |

### Known Issues

- **Redis required for conversation memory** — without Redis, each message is a fresh conversation (no history). Actions still work.
- **Tab ID validation** — if AI sends an invalid tab ID, the dashboard silently ignores it and stays on the default tab. No error shown.
