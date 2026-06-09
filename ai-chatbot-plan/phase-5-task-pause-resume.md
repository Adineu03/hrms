# Phase 5: Task Pause/Resume + Multi-step Workflows

## Pre-requisites

Review these logbooks before starting:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-2-ai-backend.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-3-action-execution.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-4-form-filling.md` — "Results & Changes Log"

## What This Phase Delivers

- A task state machine that tracks multi-step workflows
- Ability for the AI to pause mid-task and ask the user for clarification or additional input
- Resume capability — the AI picks up exactly where it left off
- Predefined workflow templates for common admin tasks
- A task progress indicator in the chat UI
- Task history and ability to retry failed steps

## Architecture & Key Decisions

### Task State Machine
Each multi-step task has a state object:
```
TaskState {
  id: string
  name: string                    // "Onboard New Employee"
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  steps: TaskStep[]
  currentStepIndex: number
  context: Record<string, any>    // accumulated data across steps
  createdAt: string
  updatedAt: string
}

TaskStep {
  id: string
  name: string                    // "Collect employee details"
  status: 'pending' | 'active' | 'waiting_input' | 'completed' | 'failed' | 'skipped'
  action?: ChatAction             // what to execute
  requiredInput?: string[]        // what data is needed from user
  collectedInput?: Record<string, any>
}
```

### Pause/Resume Flow
1. AI starts a multi-step task (e.g., "Onboard a new employee")
2. Step 1: AI asks for employee name, email, department (status: `waiting_input`)
3. User provides some info but not department
4. AI pauses and asks specifically for the missing field
5. User provides department
6. AI resumes: marks step 1 complete, moves to step 2
7. Step 2: AI fills the employee creation form (uses Phase 4 form filling)
8. User confirms form and submits
9. Step 3: AI suggests next actions (assign to shift, set leave balance, etc.)

### Task Persistence
- Active tasks stored in Redis (same pattern as conversation memory)
- Key: `task:{orgId}:{userId}:{taskId}`
- TTL: 7 days (longer than conversations since tasks may span days)
- Task context carries forward: data collected in step 1 is available in step 3

### Workflow Templates
Predefined multi-step workflows for common admin tasks:
1. **Onboard New Employee** — collect info -> create employee -> assign department -> set shift -> set leave balance
2. **Process Leave Approval Batch** — query pending requests -> show list -> approve/reject each -> send summary
3. **Generate Monthly Report** — select month -> gather stats -> format report -> offer download
4. **Department Restructure** — select department -> list employees -> reassign -> update hierarchy

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `apps/api/src/modules/ai-assistant/task-manager.service.ts` | Task state machine, step execution, pause/resume |
| `apps/api/src/modules/ai-assistant/workflow-templates.ts` | Predefined multi-step workflow definitions |
| `apps/api/src/modules/ai-assistant/dto/task.dto.ts` | Task-related DTOs |
| `apps/web/src/components/ai-assistant/task-progress.tsx` | Task step progress indicator |
| `apps/web/src/components/ai-assistant/task-input-form.tsx` | Inline form for collecting task inputs |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` | Integrate TaskManager for multi-step flows |
| `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts` | Add task endpoints: GET /tasks, POST /tasks/:id/resume, DELETE /tasks/:id |
| `apps/api/src/modules/ai-assistant/ai-assistant.module.ts` | Add TaskManagerService to providers |
| `apps/api/src/modules/ai-assistant/tools/function-definitions.ts` | Add start_workflow, provide_input tools |
| `apps/api/src/modules/ai-assistant/conversation-memory.service.ts` | Add task storage methods |
| `apps/web/src/lib/chat-store.ts` | Add activeTask state, task actions |
| `apps/web/src/components/ai-assistant/chat-window.tsx` | Render TaskProgress, TaskInputForm |
| `packages/shared/src/types/ai-assistant.ts` | Add TaskState, TaskStep, WorkflowTemplate types |

## Implementation Prompt

```
I need you to implement Phase 5 of the AI Chatbot Assistant — Task Pause/Resume + Multi-step Workflows. This enables the AI to run complex, multi-step tasks that can pause to collect input and resume.

IMPORTANT: First read these logbooks for full context on what Phases 1-4 delivered:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-2-ai-backend.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-3-action-execution.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-4-form-filling.md` — "Results & Changes Log"
- `ai-chatbot-plan/overview.md` — architecture context

Then read the current state of these files:
- `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`
- `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts`
- `apps/api/src/modules/ai-assistant/conversation-memory.service.ts`
- `apps/api/src/modules/ai-assistant/tools/function-definitions.ts`
- `apps/web/src/lib/chat-store.ts`
- `apps/web/src/components/ai-assistant/chat-window.tsx`

Here's exactly what to build:

### 1. Shared Types (`packages/shared/src/types/ai-assistant.ts`)

Add:
```typescript
export type TaskStatus = 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'active' | 'waiting_input' | 'completed' | 'failed' | 'skipped';

export interface TaskStep {
  id: string;
  name: string;
  description: string;
  status: StepStatus;
  action?: ChatAction;
  requiredInput?: { field: string; label: string; type: string; options?: string[] }[];
  collectedInput?: Record<string, any>;
  result?: ActionResult;
  error?: string;
}

export interface TaskState {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  status: TaskStatus;
  steps: TaskStep[];
  currentStepIndex: number;
  context: Record<string, any>;   // accumulated data
  conversationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  requiredRole: string[];
  steps: Omit<TaskStep, 'id' | 'status' | 'collectedInput' | 'result'>[];
}
```

### 2. Workflow Templates (`apps/api/src/modules/ai-assistant/workflow-templates.ts`)

Define 4 workflow templates:

**onboard-employee:**
- Step 1: "Collect Employee Details" — required input: firstName, lastName, email, department, designation, dateOfJoining
- Step 2: "Create Employee Record" — action: create employee via core-hr API
- Step 3: "Assign to Shift" — action: assign shift via attendance API (optional, can skip)
- Step 4: "Set Leave Balances" — action: initialize leave balances (optional, can skip)
- Step 5: "Summary" — display what was done

**batch-leave-approval:**
- Step 1: "Fetch Pending Requests" — action: query pending leave requests
- Step 2: "Review & Decide" — for each request, ask approve/reject (waiting_input)
- Step 3: "Execute Decisions" — action: bulk approve/reject
- Step 4: "Summary" — display results

**monthly-report:**
- Step 1: "Select Period" — required input: month, year
- Step 2: "Gather Statistics" — action: query attendance, leave, payroll stats
- Step 3: "Format Report" — generate summary
- Step 4: "Present Results" — display formatted report in chat

**department-setup:**
- Step 1: "Department Details" — required input: name, code, parentDepartment
- Step 2: "Create Department" — action: create via API
- Step 3: "Add Designations" — ask for designations to add (repeatable)
- Step 4: "Summary" — display what was created

### 3. Task Manager Service (`apps/api/src/modules/ai-assistant/task-manager.service.ts`)

```typescript
@Injectable()
export class TaskManagerService {
  constructor(
    private readonly memoryService: ConversationMemoryService,
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  // Start a workflow from a template
  async startWorkflow(workflowId: string, orgId: string, userId: string, conversationId: string): Promise<TaskState>

  // Get current active task for a user
  async getActiveTask(orgId: string, userId: string): Promise<TaskState | null>

  // Provide input for a waiting step
  async provideInput(taskId: string, orgId: string, userId: string, input: Record<string, any>): Promise<TaskState>

  // Advance to next step (after current step completes)
  async advanceTask(taskId: string, orgId: string, userId: string): Promise<TaskState>

  // Skip current step
  async skipStep(taskId: string, orgId: string, userId: string): Promise<TaskState>

  // Cancel task
  async cancelTask(taskId: string, orgId: string, userId: string): Promise<TaskState>

  // Retry failed step
  async retryStep(taskId: string, orgId: string, userId: string): Promise<TaskState>

  // Internal: execute a step's action
  private async executeStepAction(task: TaskState, step: TaskStep, user: any): Promise<ActionResult>

  // Internal: persist task to Redis
  private async saveTask(task: TaskState, orgId: string, userId: string): Promise<void>
}
```

Key behavior:
- When a step has `requiredInput` and not all fields are collected, set status to `waiting_input`
- When input is provided, validate it, merge into task context, mark step complete, advance
- When a step has an `action`, execute it via ActionExecutorService
- On failure, set step status to `failed` but don't cancel the task — user can retry or skip

### 4. Function Definitions

Add to `apps/api/src/modules/ai-assistant/tools/function-definitions.ts`:
```typescript
{
  type: 'function',
  function: {
    name: 'start_workflow',
    description: 'Start a multi-step workflow. Available workflows: onboard-employee, batch-leave-approval, monthly-report, department-setup',
    parameters: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', enum: ['onboard-employee', 'batch-leave-approval', 'monthly-report', 'department-setup'] },
        initialContext: { type: 'object', description: 'Any initial data already known', additionalProperties: true },
      },
      required: ['workflowId'],
    },
  },
},
{
  type: 'function',
  function: {
    name: 'provide_task_input',
    description: 'Provide input values for the current waiting step of an active task',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        input: { type: 'object', additionalProperties: true },
      },
      required: ['taskId', 'input'],
    },
  },
},
{
  type: 'function',
  function: {
    name: 'skip_task_step',
    description: 'Skip the current step of a task (if it is optional)',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
}
```

### 5. Controller Endpoints

Add to `apps/api/src/modules/ai-assistant/ai-assistant.controller.ts`:
```
GET    /ai-assistant/tasks          — list user's tasks (active and recent completed)
GET    /ai-assistant/tasks/:id      — get task details
POST   /ai-assistant/tasks/:id/resume  — resume a paused task
POST   /ai-assistant/tasks/:id/skip    — skip current step
DELETE /ai-assistant/tasks/:id         — cancel a task
```

### 6. Update AI Service Integration

In `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`:
- When AI calls `start_workflow`, create the task and return the first step's prompt
- When AI calls `provide_task_input`, advance the task and return next step's prompt
- Include active task context in the system prompt so the AI knows there's an ongoing workflow
- After step execution, feed the result back to OpenAI so it can naturally continue the conversation

### 7. Task Progress Component (`apps/web/src/components/ai-assistant/task-progress.tsx`)

- Shows when there's an active task in the chat store
- Horizontal step indicator: circles connected by lines
- Each circle shows step status: pending (gray), active (blue pulse), waiting (yellow), completed (green check), failed (red X), skipped (gray dash)
- Step name below each circle
- Current step highlighted
- Compact design that fits within the chat window header area

### 8. Task Input Form (`apps/web/src/components/ai-assistant/task-input-form.tsx`)

- Renders inline in the chat when a step is `waiting_input`
- Shows the required fields as form inputs (text, select, date based on field type)
- Submit button: "Continue" (sends input to provide_task_input)
- Skip button (if step allows skipping)
- Cancel button (cancels entire task)
- Style: bg-background rounded-lg border border-border p-4, within the chat message flow

### 9. Update Chat Store

Add to `apps/web/src/lib/chat-store.ts`:
```typescript
// State
activeTask: TaskState | null;

// Actions
startWorkflow(workflowId: string): Promise<void>;
provideTaskInput(input: Record<string, any>): Promise<void>;
skipTaskStep(): Promise<void>;
cancelTask(): Promise<void>;
refreshTask(): Promise<void>;  // re-fetch from server
```

### 10. Update Chat Window

In `apps/web/src/components/ai-assistant/chat-window.tsx`:
- When `activeTask` exists, show `<TaskProgress />` below the header
- When a step is `waiting_input`, render `<TaskInputForm />` at the bottom of the message list
- The TaskInputForm replaces the regular ChatInput while a step is waiting for input

### Testing
After implementation:
1. Say "I want to onboard a new employee" — should start the workflow
2. The task progress indicator should appear with 5 steps, step 1 active
3. AI should ask for employee details (name, email, etc.)
4. Provide partial info: "Name is John Doe, email john@example.com"
5. AI should note what was collected and ask for remaining fields (department, etc.)
6. Provide remaining info — step 1 should complete, step 2 should start
7. Step 2 should create the employee (or fill the form if on the right page)
8. Say "skip" on step 3 (shift assignment) — should skip and move to step 4
9. Complete or cancel the workflow
10. Check that the task persists across page refresh
11. Start a "batch leave approval" workflow and verify it queries and processes correctly
```

## Acceptance Criteria

1. **Workflows start** — "Onboard a new employee" starts the multi-step workflow
2. **Progress indicator** — Visual step tracker shows in the chat window
3. **Pause/resume** — Task pauses when input is needed, resumes when provided
4. **Input collection** — Inline form appears for collecting required data
5. **Partial input** — AI handles incomplete input gracefully, asks for missing fields
6. **Step execution** — Action steps execute via the Phase 3 action executor
7. **Skip works** — Optional steps can be skipped
8. **Cancel works** — User can cancel a workflow mid-stream
9. **Retry works** — Failed steps can be retried
10. **Persistence** — Active tasks survive page refresh (Redis storage)
11. **Multiple workflows** — At least 2 workflow templates work end-to-end
12. **No regressions** — All Phase 1-4 features still work (chat, AI responses, actions, form filling)

## Results & Changes Log

<!-- Fill in after implementation -->
