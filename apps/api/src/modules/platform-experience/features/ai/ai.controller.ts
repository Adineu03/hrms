import { Controller, Post, Body, Request } from '@nestjs/common';
import { PlatformExperienceAiService } from './ai.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';

@Controller('platform-experience/ai')
export class PlatformExperienceAiController {
  constructor(private readonly aiService: PlatformExperienceAiService) {}

  // Admin endpoints
  @Post('workflow-builder')
  @Roles('admin')
  autoWorkflowBuilder(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.autoWorkflowBuilder(req.user.orgId, body.context);
  }

  @Post('anomaly-watchdog')
  @Roles('admin')
  anomalyWatchdog(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.anomalyWatchdog(req.user.orgId, body.context);
  }

  @Post('governance-dashboard')
  @Roles('admin')
  aiGovernanceDashboard(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.aiGovernanceDashboard(req.user.orgId, body.context);
  }

  @Post('agentic-ops')
  @Roles('admin')
  agenticHrOps(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.agenticHrOps(req.user.orgId, body.context);
  }

  // Manager endpoints
  @Post('manager-copilot')
  @Roles('admin', 'manager')
  managerCopilot(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.managerCopilot(req.user.orgId, body.context);
  }

  @Post('nl-reports')
  @Roles('admin', 'manager')
  naturalLanguageReports(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.naturalLanguageReports(req.user.orgId, body.context);
  }

  // Employee endpoints
  @Post('universal-assistant')
  universalAiAssistant(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.universalAiAssistant(req.user.orgId, body.context);
  }

  @Post('intelligent-search')
  intelligentSearch(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.intelligentSearch(req.user.orgId, body.context);
  }

  @Post('proactive-suggestions')
  proactiveSuggestions(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.proactiveSuggestions(req.user.orgId, body.context);
  }
}
