import { Controller, Post, Body, Request } from '@nestjs/common';
import { LearningDevelopmentAiService } from './ai.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';

@Controller('learning-development/ai')
export class LearningDevelopmentAiController {
  constructor(private readonly aiService: LearningDevelopmentAiService) {}

  // Admin endpoints
  @Post('content-generator')
  @Roles('admin')
  aiContentGenerator(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.aiContentGenerator(req.user.orgId, body.context);
  }

  @Post('skill-taxonomy')
  @Roles('admin')
  skillTaxonomyEngine(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.skillTaxonomyEngine(req.user.orgId, body.context);
  }

  @Post('learning-impact')
  @Roles('admin')
  learningImpactModeler(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.learningImpactModeler(req.user.orgId, body.context);
  }

  // Manager endpoints
  @Post('team-skill-map')
  @Roles('admin', 'manager')
  teamSkillMap(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.teamSkillMap(req.user.orgId, body.context);
  }

  @Post('learning-roi')
  @Roles('admin', 'manager')
  learningRoiInsights(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.learningRoiInsights(req.user.orgId, body.context);
  }

  @Post('development-copilot')
  @Roles('admin', 'manager')
  developmentCopilot(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.developmentCopilot(req.user.orgId, body.context);
  }

  // Employee endpoints
  @Post('learning-curator')
  aiLearningCurator(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.aiLearningCurator(req.user.orgId, body.context);
  }

  @Post('ai-tutor')
  aiTutor(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.aiTutor(req.user.orgId, body.context);
  }

  @Post('skill-inference')
  skillInferenceEngine(@Request() req: { user: { orgId: string } }, @Body() body: { context?: Record<string, unknown> }) {
    return this.aiService.skillInferenceEngine(req.user.orgId, body.context);
  }
}
