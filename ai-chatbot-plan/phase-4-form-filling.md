# Phase 4: Universal Screen Interaction — AI Can Do Anything the Admin Can

## Pre-requisites

Review these logbooks before starting:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-2-ai-backend.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-3-action-execution.md` — "Results & Changes Log"

## What This Phase Delivers

- AI can interact with **everything on the current screen** — not just pre-registered forms
- Automatic DOM introspection: AI sees all forms, buttons, tabs, dropdowns, tables, modals on the page
- AI fills any form field, clicks any button, switches any tab, selects any dropdown option
- AI reads table data, filter states, stat cards — full page awareness
- Confirmation before destructive actions (delete, submit, approve)
- Visual highlights on elements the AI is about to interact with
- Undo for form fills, no undo needed for navigation/tab switches

## Core Philosophy

**No manual registration per form.** The system automatically scrapes the current page's interactive elements and sends them to the AI as context. When a new tab or module is built, the AI can interact with it immediately — zero integration effort.

## Architecture & Key Decisions

### How It Works (Flow)

1. User says "Set the department name to Engineering and click Save"
2. Frontend's **Page Scanner** runs, capturing all interactive elements on screen:
   - Form fields: inputs, selects, textareas, checkboxes, date pickers
   - Buttons: submit, cancel, create, delete, approve, reject
   - Tabs: which tabs exist, which is active
   - Tables: column headers, row count, action buttons per row
   - Modals: if open, what fields/buttons are inside
   - Stat cards: labels and values
   - Dropdowns/filters: current selection, available options
3. This "page snapshot" is sent alongside the user message to the backend
4. AI returns structured actions: `[{ type: 'fill', selector: '#dept-name', value: 'Engineering' }, { type: 'click', selector: 'button:Save' }]`
5. Frontend **Action Executor** processes each action sequentially
6. For form fills: highlights field, sets value, shows confirmation banner
7. For clicks: highlights button briefly, then clicks (with confirmation for destructive actions)

### Page Scanner — DOM Introspection

The scanner runs on every chat message and captures a structured snapshot:

```typescript
interface PageSnapshot {
  url: string;
  moduleId: string | null;
  activeTab: string | null;
  pageTitle: string;

  forms: FormSnapshot[];        // All forms on screen
  buttons: ButtonSnapshot[];    // All actionable buttons
  tabs: TabSnapshot[];          // Tab bar items
  tables: TableSnapshot[];      // Data tables
  modals: ModalSnapshot[];      // Open modals
  statCards: StatCardSnapshot[]; // Stat/metric cards
  filters: FilterSnapshot[];    // Active filters/dropdowns
}

interface FormSnapshot {
  id: string;                   // Generated unique ID
  fields: {
    name: string;               // input name or generated ID
    label: string;              // Associated label text
    type: string;               // input type
    currentValue: string;       // What's currently filled
    placeholder: string;
    options?: string[];          // For select/radio
    required: boolean;
    disabled: boolean;
    selector: string;           // CSS selector to target this element
  }[];
}

interface ButtonSnapshot {
  text: string;                 // Button label
  type: string;                 // submit, button, reset
  disabled: boolean;
  variant: string;              // primary, danger, secondary (inferred from classes)
  selector: string;
}

interface TableSnapshot {
  columns: string[];
  rowCount: number;
  hasActions: boolean;          // Has action buttons per row
  actionLabels: string[];       // e.g., ["Edit", "Delete", "View"]
  selector: string;
}

interface TabSnapshot {
  label: string;
  isActive: boolean;
  selector: string;
}
```

### How Scanner Finds Elements

- **Forms**: Query all `<form>`, `<input>`, `<select>`, `<textarea>` elements. Walk up to find `<label>` associations via `htmlFor`, `aria-label`, or closest preceding text
- **Buttons**: Query all `<button>`, `[role="button"]`, `<a>` with action-like text. Classify by class names (e.g., `bg-red` → danger, `bg-primary` → primary)
- **Tabs**: Query elements matching the HRMS tab pattern (the `overflow-x-auto` tab bars with buttons)
- **Tables**: Query `<table>` or common table patterns, extract `<th>` for columns
- **Modals**: Detect open modals via `[role="dialog"]`, fixed/absolute positioned overlays
- **Stat cards**: Query the common card pattern (`.bg-card` with stat label + value)

### Action Executor

Processes AI-returned actions:

```typescript
interface ScreenAction {
  type: 'fill' | 'click' | 'select_tab' | 'select_option' | 'scroll_to' | 'read';
  selector: string;             // CSS selector
  value?: string;               // For fill/select actions
  requiresConfirmation?: boolean; // For destructive actions
  description: string;          // Human-readable: "Set department name to Engineering"
}
```

Execution rules:
- **fill**: Find element by selector, dispatch React-compatible change events (both `input` and `change` events with proper prototype override for React controlled components)
- **click**: Find element, highlight briefly (200ms blue outline), then `.click()`
- **select_tab**: Find tab button, click it, wait for content to render
- **select_option**: For `<select>` — set value + dispatch change. For custom dropdowns — click to open, find option, click it
- **Destructive clicks** (delete, remove, reject, submit): Show confirmation dialog first
- **Sequential execution**: Actions run one at a time with 300ms delay between, so the user can see what's happening

### React Controlled Component Strategy

React controlled inputs ignore direct `.value = x` changes. To fill them:

```typescript
function setReactInputValue(element: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;
  nativeInputValueSetter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
```

This works with React's synthetic event system.

### Context Size Management

A full page snapshot could be huge. Optimization:
- Only send **visible** elements (not hidden/collapsed sections)
- Truncate table data to column headers + row count (not all row data)
- For selects with 50+ options, send first 20 + "and N more"
- Total snapshot should be < 2000 tokens
- Scanner caches snapshot, only re-scans on tab change, modal open/close, or explicit re-scan

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/page-scanner.ts` | DOM introspection engine — scans current page for all interactive elements |
| `apps/web/src/lib/action-executor.ts` | Processes AI actions — fill, click, tab switch, with confirmation |
| `apps/web/src/components/ai-assistant/action-confirmation-dialog.tsx` | "AI wants to click Delete. Allow?" dialog |
| `apps/web/src/components/ai-assistant/action-highlight.tsx` | Visual highlight overlay on targeted elements |
| `apps/web/src/components/ai-assistant/form-fill-banner.tsx` | "AI filled N fields — review and submit" banner |
| `apps/api/src/modules/ai-assistant/tools/screen-interaction.tools.ts` | OpenAI function defs for screen actions |

### Modified Files

| File | Change |
|------|--------|
| `apps/api/src/modules/ai-assistant/ai-assistant.service.ts` | Accept pageSnapshot in chat request, include in context |
| `apps/api/src/modules/ai-assistant/context-builder.service.ts` | Build system prompt section from page snapshot |
| `apps/web/src/lib/chat-store.ts` | Add pageSnapshot, pendingActions, actionQueue state |
| `apps/web/src/components/ai-assistant/chat-window.tsx` | Trigger page scan on message send, show action status |
| `packages/shared/src/types/ai-assistant.ts` | Add PageSnapshot, ScreenAction, ActionResult types |

## Implementation Prompt

```
I need you to implement Phase 4 of the AI Chatbot Assistant — Universal Screen Interaction. This enables the AI to interact with ANYTHING on the current screen — fill any form, click any button, switch tabs, read data.

IMPORTANT: First read these logbooks for context on what Phases 1-3 delivered:
- `ai-chatbot-plan/phase-1-chat-widget-ui.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-2-ai-backend.md` — "Results & Changes Log"
- `ai-chatbot-plan/phase-3-action-execution.md` — "Results & Changes Log"
- `ai-chatbot-plan/overview.md` — architecture context

Then read the current state of these files:
- `apps/web/src/lib/chat-store.ts`
- `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`
- `apps/api/src/modules/ai-assistant/tools/function-definitions.ts`
- `apps/api/src/modules/ai-assistant/context-builder.service.ts`

Also read a few tab components to understand the DOM structure of HRMS pages:
- `apps/web/src/components/modules/core-hr/tabs/admin/employee-master-tab.tsx`
- `apps/web/src/components/modules/leave-management/tabs/admin/balance-management-tab.tsx`
- `apps/web/src/components/modules/attendance/tabs/admin/overtime-config-tab.tsx`

Here's what to build:

### 1. Page Scanner (`apps/web/src/lib/page-scanner.ts`)

Build a DOM introspection engine that captures a structured snapshot of all interactive elements:

- `scanPage(): PageSnapshot` — main function, returns the full snapshot
- Finds ALL forms/inputs/selects/textareas on the page with their labels, current values, types, options, and CSS selectors
- Finds ALL buttons with their text, type (submit/button), and whether they look destructive (red classes)
- Finds ALL tabs in the HRMS tab bar pattern
- Finds ALL tables with column headers and row counts
- Detects open modals
- Reads stat cards (label + value pairs)
- Each element gets a unique CSS selector for targeting
- Only scans VISIBLE elements (not display:none or hidden)
- Keeps snapshot under ~2000 tokens by truncating long option lists and table data

Selector generation strategy: prefer `#id`, then `[name="x"]`, then `button:has-text("X")`, then nth-child path.

### 2. Action Executor (`apps/web/src/lib/action-executor.ts`)

Processes an array of ScreenAction objects returned by the AI:

```typescript
interface ScreenAction {
  type: 'fill' | 'click' | 'select_tab' | 'select_option' | 'scroll_to' | 'read';
  selector: string;
  value?: string;
  requiresConfirmation?: boolean;
  description: string;
}
```

- `executeActions(actions: ScreenAction[]): Promise<ActionResult[]>` — runs actions sequentially with 300ms delay
- For `fill`: Use the React-compatible value setter trick (Object.getOwnPropertyDescriptor on HTMLInputElement.prototype) to set values and dispatch input+change events
- For `click`: Highlight element with blue outline for 200ms, then click. If `requiresConfirmation`, show confirmation dialog first and wait for user response
- For `select_tab`: Find and click the tab button
- For `select_option`: Handle both native <select> and custom dropdown components
- For `scroll_to`: Scroll element into view with smooth behavior
- For `read`: Return the element's text content (for AI to answer questions about page data)
- After filling form fields, show a FormFillBanner at the top of the form area

### 3. Action Confirmation Dialog (`apps/web/src/components/ai-assistant/action-confirmation-dialog.tsx`)

A modal that appears for destructive actions:
- "AI Assistant wants to: [description]"
- "Allow" (green) and "Deny" (gray) buttons
- Auto-deny after 30 seconds
- Style: centered modal with backdrop, consistent with HRMS theme (bg-card, border-border)

### 4. Form Fill Banner (`apps/web/src/components/ai-assistant/form-fill-banner.tsx`)

- Fixed banner at top of the form area when AI fills fields
- "✨ AI filled {N} fields. Review the values below, then submit when ready."
- "Undo All" button restores previous values
- "Dismiss" button just hides the banner
- Each AI-filled field gets a subtle blue left-border highlight (via a CSS class `ai-filled`)
- Style: bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg

### 5. Screen Interaction Tools (`apps/api/src/modules/ai-assistant/tools/screen-interaction.tools.ts`)

OpenAI function calling tools:

1. `interact_with_page` — The main tool. AI returns a list of actions:
   ```
   {
     name: 'interact_with_page',
     description: 'Interact with elements on the current page. You can fill form fields, click buttons, switch tabs, and read data. The page snapshot shows all available elements.',
     parameters: {
       actions: [{ type, selector, value, description, requiresConfirmation }]
     }
   }
   ```

2. `read_page_data` — For when AI needs to answer questions about what's on screen:
   ```
   {
     name: 'read_page_data',
     description: 'Read specific data from the current page (table contents, stat values, form values)',
     parameters: {
       what: string // description of what to read
     }
   }
   ```

### 6. Update Context Builder

In `context-builder.service.ts`, add a section to the system prompt when pageSnapshot is present:

```
## Current Page State

You are looking at: [pageTitle] ([url])
Active tab: [tab name]

### Available Form Fields:
- Department Name (text input, currently empty, selector: "#dept-name")
- Head of Department (select, options: ["John Doe", "Jane Smith"], selector: "#dept-head")
...

### Available Buttons:
- "Save Department" (primary submit button, selector: "button.bg-primary")
- "Cancel" (secondary, selector: "button.bg-gray-200")
...

### Data Tables:
- Employee table: 35 rows, columns: [Name, Email, Department, Designation, Status]
...

### Current Stats:
- Total Employees: 35
- Active Modules: 12
...

You can interact with ANY of these elements using the interact_with_page tool. Fill fields, click buttons, switch tabs. Always describe what you're doing. For destructive actions (delete, reject), set requiresConfirmation: true.
```

### 7. Update Chat Store

Add to `apps/web/src/lib/chat-store.ts`:

```typescript
// New state
pendingActions: ScreenAction[] | null;
actionResults: ActionResult[] | null;
formFillActive: boolean;
formFillUndoData: Record<string, string> | null;

// New actions
scanAndSendMessage(message: string): Promise<void>;  // Scans page, attaches snapshot, sends
executePendingActions(): Promise<void>;               // Runs actions from AI response
undoFormFill(): void;
dismissFormFill(): void;
```

Flow: when user sends a message via `scanAndSendMessage`:
1. Run `scanPage()` to get snapshot
2. Send message + snapshot to `/ai-assistant/chat`
3. If AI returns `interact_with_page` tool call, parse actions
4. Run `executeActions()` which handles fills, clicks, confirmations
5. Show results in chat

### 8. Update Chat Window

- Before sending each message, the chat window calls `scanAndSendMessage` instead of the plain send
- Show action execution status in chat: "Filling department name... ✓", "Clicking Save... ✓"
- Show a small "🔍 Page scanned" indicator when snapshot is captured

### Testing

1. Go to any admin module tab (e.g., Core HR > Employee Master)
2. Type "How many employees are showing?" — AI should read the table/stats and answer
3. Type "Switch to the Settings tab" — AI should click the tab
4. Go to Cold Start > Departments step
5. Type "Add a department called Product Management with code PM" — form fields should fill
6. Banner appears, fields have blue highlight
7. Click "Undo All" — fields revert
8. Try "Click the Save button" — AI clicks it (with confirmation for submit)
9. Go to Leave Management > Balance Management
10. Type "What leave types are configured?" — AI reads the table and answers
11. Go to any page you've never tested — the scanner should still work because it's DOM-based, not form-registered

IMPORTANT: The key differentiator is that this works on ANY page without pre-registration. The DOM scanner is the magic — it makes every existing and future page AI-interactive for free.
```

## Acceptance Criteria

1. **Universal scanning** — Page scanner works on ANY module tab without pre-registration
2. **Form filling** — AI can fill any form field on the current page via natural language
3. **Button clicking** — AI can click any button, with confirmation for destructive ones
4. **Tab switching** — AI can switch tabs via natural language
5. **Data reading** — AI can answer questions about visible data (tables, stats, filters)
6. **React compatibility** — Form fills work with React controlled components (useState)
7. **Visual feedback** — Filled fields highlighted, action progress shown in chat
8. **Undo** — Form fills can be undone; navigation can't (but that's expected)
9. **Destructive safety** — Delete/submit/approve buttons require explicit confirmation
10. **No registration needed** — Works on a brand-new tab with zero code changes
11. **Reasonable snapshot size** — Page snapshot stays under ~2000 tokens

## Results & Changes Log

<!-- Fill in after implementation -->
