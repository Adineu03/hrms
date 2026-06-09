import {
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../shared/multi-tenancy/tenant.service';
import { AiAssistantService } from './ai-assistant.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ExecuteActionDto } from './dto/execute-action.dto';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

@Controller('ai-assistant')
export class AiAssistantController {
  private readonly logger = new Logger(AiAssistantController.name);

  constructor(
    private readonly aiAssistantService: AiAssistantService,
    private readonly tenantService: TenantService,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Post('chat')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    try {
      const orgId = this.getOrgIdOrThrow();
      const jwtUser = req.user;

      // Look up full user details for the system prompt
      let firstName = 'User';
      let lastName = '';
      let orgName = 'Your Organization';

      try {
        const [userRow] = await this.db
          .select({
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          })
          .from(schema.users)
          .where(eq(schema.users.id, jwtUser.userId))
          .limit(1);

        if (userRow) {
          firstName = userRow.firstName;
          lastName = userRow.lastName || '';
        }

        const [orgRow] = await this.db
          .select({ name: schema.orgs.name })
          .from(schema.orgs)
          .where(eq(schema.orgs.id, orgId))
          .limit(1);

        if (orgRow) {
          orgName = orgRow.name;
        }
      } catch (dbErr: any) {
        this.logger.warn('Failed to look up user/org details', dbErr?.message);
      }

      const chatUser = {
        id: jwtUser.userId,
        firstName,
        lastName,
        role: jwtUser.role,
        orgId,
        orgName,
      };

      return this.aiAssistantService.chat(dto, chatUser);
    } catch (err: any) {
      this.logger.error('Chat endpoint error', err?.message, err?.stack);
      return {
        message: {
          id: randomUUID(),
          role: 'assistant' as const,
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        },
        conversationId: dto.conversationId || randomUUID(),
      };
    }
  }

  @Post('execute-action')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async executeAction(@Body() dto: ExecuteActionDto, @Req() req: any) {
    try {
      const orgId = this.getOrgIdOrThrow();
      const jwtUser = req.user;

      let firstName = 'User';
      let lastName = '';
      let orgName = 'Your Organization';

      try {
        const [userRow] = await this.db
          .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
          .from(schema.users)
          .where(eq(schema.users.id, jwtUser.userId))
          .limit(1);
        if (userRow) {
          firstName = userRow.firstName;
          lastName = userRow.lastName || '';
        }
        const [orgRow] = await this.db
          .select({ name: schema.orgs.name })
          .from(schema.orgs)
          .where(eq(schema.orgs.id, orgId))
          .limit(1);
        if (orgRow) orgName = orgRow.name;
      } catch {
        // fallback to defaults
      }

      const chatUser = {
        id: jwtUser.userId,
        firstName,
        lastName,
        role: jwtUser.role,
        orgId,
        orgName,
      };

      const result = await this.aiAssistantService.resumeApprovedAction(dto.conversationId, chatUser);
      return { result };
    } catch (err: any) {
      this.logger.error('Execute action error', err?.message, err?.stack);
      return { result: { success: false, error: 'server_error', message: 'Failed to execute action' } };
    }
  }

  @Post('clear')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async clear(@Body() body: { conversationId: string }, @Req() req: any) {
    const orgId = this.getOrgIdOrThrow();
    const userId = req.user.userId;
    if (body.conversationId) {
      await this.aiAssistantService.clearConversation(orgId, userId, body.conversationId);
    }
    return { success: true };
  }
}
