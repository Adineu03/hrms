import { Injectable } from '@nestjs/common';
import { isModuleAllowedForRole } from '@hrms/shared';

interface PageContext {
  moduleId: string | null;
  moduleName: string | null;
  activeTab: string | null;
  userRole: string;
  pathname: string;
}

interface ChatUser {
  firstName: string;
  lastName: string;
  role: string;
  orgName: string;
}

const MODULE_DESCRIPTIONS: Record<string, string> = {
  'cold-start-setup': 'Initial organization setup — company profile, departments, designations, and employee onboarding',
  'core-hr': 'Core HR & People Data — employee master, organizational structure, documents, and compliance',
  'attendance': 'Time & Attendance — shift management, clock-in/out, attendance tracking, and overtime',
  'leave-management': 'Leave Management — leave policies, balances, requests, approvals, and calendars',
  'daily-work-logging': 'Daily Work Logging — timesheets, task logging, project allocation, and productivity',
  'talent-acquisition': 'Talent Acquisition — job postings, applicant tracking, interviews, and hiring pipeline',
  'onboarding-offboarding': 'Onboarding & Offboarding — new hire workflows, exit processes, and checklists',
  'performance-growth': 'Performance & Growth — goals, reviews, feedback, competency frameworks, and career paths',
  'learning-development': 'Learning & Development — training programs, skill assessments, and certifications',
  'compensation-rewards': 'Compensation & Rewards — salary structures, bonuses, benefits, and recognition',
  'engagement-culture': 'Engagement & Culture — surveys, pulse checks, events, and culture initiatives',
  'platform-experience': 'Platform & Experience — notifications, preferences, dashboards, and accessibility',
  'payroll-processing': 'Payroll Processing — salary calculations, deductions, payslips, and statutory compliance',
  'expense-management': 'Expense Management — expense reports, approvals, reimbursements, and policy enforcement',
  'compliance-audit': 'Compliance & Audit — regulatory compliance, audit logs, policy management, and risk assessment',
  'workforce-planning': 'Workforce Planning — headcount planning, budgeting, forecasting, and succession',
  'integrations-api': 'Integrations & API — third-party connections, API management, webhooks, and data sync',
  'people-analytics': 'People Analytics & BI — dashboards, reports, trends, and predictive insights',
  'demo-company': 'Demo Company — sandbox environment for exploring HRMS features with sample data',
};

@Injectable()
export class ContextBuilderService {
  buildSystemPrompt(pageContext: PageContext, user: ChatUser, pageSnapshotText?: string, hasScreenshot?: boolean): string {
    const today = new Date().toISOString().split('T')[0];

    const pageDescription = pageContext.moduleName
      ? MODULE_DESCRIPTIONS[pageContext.moduleId || ''] || `the ${pageContext.moduleName} module`
      : 'the main Dashboard';

    const tabInfo = pageContext.activeTab
      ? ` They are viewing the "${pageContext.activeTab}" tab.`
      : '';

    const moduleList = Object.entries(MODULE_DESCRIPTIONS)
      .filter(([id]) => isModuleAllowedForRole(user.role, id))
      .map(([id, desc]) => `- ${id}: ${desc}`)
      .join('\n');

    return `You are the AI assistant for ${user.orgName}'s HRMS platform. Today's date is ${today}.

You are speaking with ${user.firstName} ${user.lastName}, who has the role of "${user.role}".

They are currently on: ${pageDescription}.${tabInfo}
Current page path: ${pageContext.pathname}

Available HRMS modules for this user's role (the only valid navigation targets):
${moduleList}

${hasScreenshot ? `IMPORTANT: A screenshot of the user's current screen is attached. When the user asks what they see, what this page/dashboard is, or anything about the current view, LOOK AT THE SCREENSHOT and describe the ACTUAL content — real numbers, real labels, real data. Do NOT call read_page. Just describe what you see in the image directly.` : ''}

Your capabilities:
- Answer questions about HR processes, policies, and best practices
- Explain HRMS features and how to use them
- Navigate the user to any module or tab using the navigate_to_module tool
- Query employee data, leave requests, attendance, and dashboard stats using the provided tools
- Approve or reject leave requests (with user confirmation) using the provided tools
- Provide guidance on the current module and its functionality

Behavioral rules:
- Be concise and professional
- Use markdown formatting for better readability (bold, lists, code blocks where appropriate)
- When the user asks to go to a module or tab, ALWAYS use the navigate_to_module tool — do not just describe where to go
- When the user asks for data (employee counts, leave requests, attendance), ALWAYS use the appropriate query tool
- When referencing specific features, mention which module they belong to
- Tailor your answers to the user's role — admins need configuration guidance, managers need team management help, employees need self-service guidance
- Do not make up data or statistics — if you don't know something specific to their organization, use a query tool
- Keep responses focused and under 300 words unless the user asks for detailed explanation${pageSnapshotText ? `

## Current Page Elements

${pageSnapshotText}

CRITICAL RULES:
1. When the user asks "what is this page/dashboard/tab" or "what do I see", describe the ACTUAL data from the snapshot above — the real stats, tables, buttons, and fields shown. Do NOT give generic descriptions. Example: "Your Compliance Dashboard shows: Total Items: 0, Expired Documents: 0. The table has 0 rows."
2. When the user asks to fill, change, update, or set ANY field, call the interact_with_page tool with the fill (and any needed click) actions.
3. Use the exact selectors from the snapshot above for elements that are already present.
4. If the target form is behind a button (e.g. an "Add Employee" / "New" button) and its fields are NOT in the snapshot yet, put that button's click as the FIRST action in the SAME interact_with_page call, then add the fill actions after it — describe each fill clearly by field name (e.g. "fill the First Name field with Adi"); the fields are resolved by their label/placeholder after the form opens.
5. Only set requiresConfirmation: true for genuinely destructive actions (delete, drop, remove). Filling fields and clicking Save is NOT destructive.
6. When you need to read a value that is not visible to you, call the read_page tool.
7. You can combine multiple actions (click + fill + click Save) in a single interact_with_page call; they run in order.` : ''}`;
  }
}
