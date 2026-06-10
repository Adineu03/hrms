import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Agent,
  run,
  RunState,
  setDefaultOpenAIKey,
  setTracingDisabled,
} from '@openai/agents';
import { randomUUID } from 'crypto';
import { MODULES, isModuleAllowedForRole } from '@hrms/shared';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { ConversationMemoryService } from './conversation-memory.service';
import { ContextBuilderService } from './context-builder.service';
import { ChatRequestDto } from './dto/chat.dto';
import {
  buildAgentTools,
  getToolDef,
  getToolKind,
  type ActionResult,
  type ToolContext,
} from './tools/tool-registry';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  orgId: string;
  orgName: string;
}

type HistoryTurn = { role: 'system' | 'user' | 'assistant'; content: string };

const MODEL = 'gpt-5.5';
const AGENT_NAME = 'HRMS Assistant';

@Injectable()
export class AiAssistantService implements OnModuleInit {
  private readonly logger = new Logger(AiAssistantService.name);
  private ready = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryService: ConversationMemoryService,
    private readonly contextBuilder: ContextBuilderService,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      setDefaultOpenAIKey(apiKey);
      // Do not export traces (employee data) to OpenAI.
      setTracingDisabled(true);
      this.ready = true;
      this.logger.log('OpenAI Agents SDK initialized (model: ' + MODEL + ')');
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI assistant will return fallback responses');
    }
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  async chat(dto: ChatRequestDto, user: ChatUser) {
    const conversationId = dto.conversationId || this.memoryService.createConversationId();

    if (!this.ready) {
      return this.message('AI assistant is not configured. Please set OPENAI_API_KEY.', conversationId);
    }

    const history = await this.memoryService.getConversation(user.orgId, user.id, conversationId);

    const hasSnapshot = !!dto.pageSnapshotText;
    const hasScreenshot = !!dto.screenshot;
    this.logger.log(
      `Chat — snapshot: ${hasSnapshot ? `${dto.pageSnapshotText!.length} chars` : 'none'}, ` +
        `screenshot: ${hasScreenshot ? 'yes' : 'no'}, role: ${user.role}`,
    );

    const instructions = this.contextBuilder.buildSystemPrompt(
      dto.pageContext,
      { firstName: user.firstName, lastName: user.lastName, role: user.role, orgName: user.orgName },
      dto.pageSnapshotText,
      hasScreenshot,
    );

    const ctx: ToolContext = { userId: user.id, orgId: user.orgId, role: user.role, db: this.db };
    const agent = this.buildAgent(instructions, user.role, ctx, hasSnapshot);

    const input: any[] = this.historyToInput(history);
    input.push(this.userInputItem(dto.message, dto.screenshot));

    try {
      // Tenant context reaches tools via the closure in buildAgentTools, not run() options.
      const result = await run(agent, input);

      const interruption = result.interruptions?.[0];
      if (interruption) {
        return this.handleInterruption(interruption, result, dto, user, conversationId, history);
      }

      const text = this.asText(result.finalOutput) || 'I could not generate a response. Please try again.';
      this.saveHistory(user, conversationId, history, dto.message, text);
      return this.message(text, conversationId);
    } catch (err: any) {
      this.logger.error('Agent run error', err?.message || err);
      const content =
        err?.status === 429
          ? "I'm receiving too many requests right now. Please wait a moment and try again."
          : 'Sorry, I encountered an error processing your request. Please try again.';
      return this.message(content, conversationId);
    }
  }

  /**
   * The agent paused on a needsApproval tool. Branch on the tool kind:
   *  - screen   → return screen actions for the frontend to execute (no resume)
   *  - navigate → return a navigation action (no resume)
   *  - mutate   → persist the run state and return a pending confirmation action
   */
  private async handleInterruption(
    interruption: any,
    result: any,
    dto: ChatRequestDto,
    user: ChatUser,
    conversationId: string,
    history: HistoryTurn[],
  ) {
    const rawItem = interruption?.rawItem;
    const toolName: string = rawItem?.name ?? interruption?.toolName ?? '';
    let args: Record<string, any> = {};
    try {
      args = JSON.parse(rawItem?.arguments || '{}');
    } catch {
      args = {};
    }
    // Do NOT read result.finalOutput here — it is not available on an interrupted
    // run (the SDK warns/returns nothing). Use our own crafted messages instead.
    const preface = '';
    const kind = getToolKind(toolName);

    // --- Screen interaction (fill/click/select) ---
    if (kind === 'screen' && toolName === 'interact_with_page') {
      const actions = (args.actions || []).map((a: any) => ({
        type: a.type,
        selector: a.selector,
        value: a.value ?? undefined,
        description: a.description,
        requiresConfirmation: !!a.requiresConfirmation,
      }));
      const hasConfirmation = actions.some((a: any) => a.requiresConfirmation);
      const description = actions.map((a: any) => a.description).filter(Boolean).join('; ');
      const content = preface || `I'll ${description || 'update the page'}.`;
      this.saveHistory(user, conversationId, history, dto.message, content);
      return this.message(content, conversationId, {
        screenActions: actions,
        action: {
          type: 'screen_action',
          name: 'interact_with_page',
          description,
          parameters: args,
          requiresConfirmation: hasConfirmation,
        },
      });
    }

    // --- Read page data ---
    if (kind === 'screen' && toolName === 'read_page') {
      const selectors: string[] = args.selectors || [];
      const screenActions = selectors.map((s) => ({
        type: 'read' as const,
        selector: s,
        description: `Read content from ${s}`,
      }));
      const content = preface || 'Let me read that data from the page for you.';
      this.saveHistory(user, conversationId, history, dto.message, content);
      return this.message(content, conversationId, {
        screenActions,
        action: {
          type: 'screen_action',
          name: 'read_page',
          description: 'Read page data',
          parameters: args,
          requiresConfirmation: false,
        },
      });
    }

    // --- Navigation ---
    if (kind === 'navigate') {
      // Enforce the shared per-role module map: deny unknown or disallowed
      // targets without an action payload so the client never navigates.
      const targetModule = MODULES[args.moduleId];
      if (!targetModule) {
        const content = `I couldn't find a module called "${args.moduleId}".`;
        this.saveHistory(user, conversationId, history, dto.message, content);
        return this.message(content, conversationId);
      }
      if (!isModuleAllowedForRole(user.role, args.moduleId)) {
        const content = `The ${targetModule.name} module isn't available for your role.`;
        this.saveHistory(user, conversationId, history, dto.message, content);
        return this.message(content, conversationId);
      }
      const url = args.tab
        ? `/dashboard/modules/${args.moduleId}?tab=${args.tab}`
        : `/dashboard/modules/${args.moduleId}`;
      const content =
        preface || `Taking you to ${args.moduleId}${args.tab ? ` → ${args.tab}` : ''}.`;
      this.saveHistory(user, conversationId, history, dto.message, content);
      return this.message(content, conversationId, {
        action: {
          type: 'navigate',
          name: 'navigate_to_module',
          description: `Navigate to ${args.moduleId}`,
          parameters: args,
          requiresConfirmation: false,
          result: { success: true, data: { url, moduleId: args.moduleId }, message: `Navigate to ${args.moduleId}` },
        },
      });
    }

    // --- Mutation → requires Allow/Cancel confirmation ---
    const def = getToolDef(toolName);
    if (def && !def.allowedRoles.includes(user.role as any)) {
      const denied = `You don't have permission to perform this action. Required roles: ${def.allowedRoles.join(', ')}.`;
      this.saveHistory(user, conversationId, history, dto.message, denied);
      return this.message(denied, conversationId);
    }

    const description = this.describeMutation(toolName, args);
    const content = preface || `I'd like to ${description}. Please confirm to proceed.`;

    // Persist the paused run so /execute-action can resume after approval.
    await this.memoryService.savePendingApproval(user.orgId, user.id, conversationId, {
      state: result.state.toString(),
      userMessage: dto.message,
    });

    return this.message(content, conversationId, {
      action: {
        type: this.mapMutationType(toolName),
        name: toolName,
        description,
        parameters: args,
        requiresConfirmation: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Resume (Allow on a pending mutation)
  // ---------------------------------------------------------------------------

  async resumeApprovedAction(conversationId: string | undefined, user: ChatUser): Promise<ActionResult> {
    if (!this.ready) return { success: false, error: 'not_configured', message: 'AI assistant is not configured.' };
    if (!conversationId) return { success: false, error: 'no_conversation', message: 'Missing conversation context.' };

    const pending = await this.memoryService.getPendingApproval(user.orgId, user.id, conversationId);
    if (!pending) {
      return { success: false, error: 'expired', message: 'This confirmation has expired. Please ask me again.' };
    }

    const instructions = this.contextBuilder.buildSystemPrompt(
      { moduleId: null, moduleName: null, activeTab: null, userRole: user.role, pathname: '' },
      { firstName: user.firstName, lastName: user.lastName, role: user.role, orgName: user.orgName },
    );
    const ctx: ToolContext = { userId: user.id, orgId: user.orgId, role: user.role, db: this.db };
    const agent = this.buildAgent(instructions, user.role, ctx, false);

    let state: RunState<unknown, typeof agent>;
    try {
      state = await RunState.fromString(agent, pending.state);
    } catch (err: any) {
      this.logger.error('Failed to rehydrate run state', err?.message || err);
      await this.memoryService.clearPendingApproval(user.orgId, user.id, conversationId);
      return { success: false, error: 'resume_failed', message: 'Could not resume the action. Please try again.' };
    }

    for (const it of state.getInterruptions()) {
      state.approve(it);
    }

    try {
      const result = await run(agent, state);
      await this.memoryService.clearPendingApproval(user.orgId, user.id, conversationId);

      const text = this.asText(result.finalOutput) || 'Done.';
      const history = await this.memoryService.getConversation(user.orgId, user.id, conversationId);
      this.saveHistory(user, conversationId, history, pending.userMessage, text);

      return { success: true, message: text };
    } catch (err: any) {
      this.logger.error('Resume run error', err?.message || err);
      await this.memoryService.clearPendingApproval(user.orgId, user.id, conversationId);
      return { success: false, error: 'execution_error', message: 'The action could not be completed. Please try again.' };
    }
  }

  async clearConversation(orgId: string, userId: string, conversationId: string) {
    await this.memoryService.clearConversation(orgId, userId, conversationId);
    await this.memoryService.clearPendingApproval(orgId, userId, conversationId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildAgent(instructions: string, role: string, ctx: ToolContext, hasSnapshot: boolean) {
    return new Agent({
      name: AGENT_NAME,
      instructions,
      model: MODEL,
      // store defaults to true — required so the Responses API persists reasoning
      // items between turns (multi-step tool use and the approve→resume flow both
      // reference prior items by id). Tracing is disabled separately in onModuleInit.
      tools: buildAgentTools(role, () => ctx, hasSnapshot),
    });
  }

  /** Map stored text turns into Agents SDK input items. */
  private historyToInput(history: HistoryTurn[]): any[] {
    return history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) =>
        m.role === 'assistant'
          ? { role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: m.content }] }
          : { role: 'user', content: m.content },
      );
  }

  /** Build the current user input item, attaching the screenshot for vision when present. */
  private userInputItem(message: string, screenshot?: string): any {
    if (screenshot) {
      return {
        role: 'user',
        content: [
          { type: 'input_text', text: message },
          { type: 'input_image', image: `data:image/jpeg;base64,${screenshot}`, providerData: { detail: 'low' } },
        ],
      };
    }
    return { role: 'user', content: message };
  }

  private asText(finalOutput: unknown): string {
    if (typeof finalOutput === 'string') return finalOutput;
    if (finalOutput == null) return '';
    try {
      return String(finalOutput);
    } catch {
      return '';
    }
  }

  private message(content: string, conversationId: string, extra?: Record<string, any>) {
    return {
      message: {
        id: randomUUID(),
        role: 'assistant' as const,
        content,
        timestamp: new Date().toISOString(),
        ...(extra || {}),
      },
      conversationId,
    };
  }

  private saveHistory(
    user: ChatUser,
    conversationId: string,
    history: HistoryTurn[],
    userMessage: string,
    assistantContent: string,
  ) {
    const updated: HistoryTurn[] = [
      ...history,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantContent },
    ];
    this.memoryService
      .saveConversation(user.orgId, user.id, conversationId, updated)
      .catch(() => {});
  }

  private describeMutation(toolName: string, params: Record<string, any>): string {
    switch (toolName) {
      case 'approve_leave_request':
        return `approve leave request ${params.requestId}`;
      case 'reject_leave_request':
        return `reject leave request ${params.requestId}${params.reason ? ` (reason: "${params.reason}")` : ''}`;
      case 'apply_for_leave':
        return `apply for leave from ${params.fromDate} to ${params.toDate}`;
      case 'approve_expense_report':
        return `approve expense report ${params.reportId}`;
      case 'create_employee':
        return `create employee ${params.firstName ?? ''} ${params.lastName ?? ''} (${params.email})`.replace(/\s+/g, ' ').trim();
      case 'update_employee':
        return `update employee ${params.employeeId}`;
      default:
        return `run ${toolName}`;
    }
  }

  private mapMutationType(toolName: string): 'approve' | 'reject' | 'create' | 'update' {
    if (toolName.includes('approve')) return 'approve';
    if (toolName.includes('reject')) return 'reject';
    if (toolName.includes('create') || toolName.includes('apply')) return 'create';
    return 'update';
  }
}
