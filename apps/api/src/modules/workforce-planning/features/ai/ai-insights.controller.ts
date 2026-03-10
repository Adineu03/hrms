import { Controller, Post, Body, Req } from '@nestjs/common';
import { WorkforceAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('workforce-planning/ai')
export class WorkforceAiInsightsController {
  constructor(private readonly aiInsightsService: WorkforceAiInsightsService) {}

  @Post('headcount-optimizer')
  @Roles('admin', 'super_admin')
  async headcountOptimizer(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.headcountOptimizer(req.user.orgId, body.context);
  }

  @Post('turnover-predictor')
  @Roles('admin', 'super_admin')
  async turnoverPredictor(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.turnoverPredictor(req.user.orgId, body.context);
  }

  @Post('workforce-scenario-modeler')
  @Roles('admin', 'super_admin')
  async workforceScenarioModeler(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.workforceScenarioModeler(req.user.orgId, body.context);
  }

  @Post('skills-gap-forecaster')
  @Roles('admin', 'super_admin')
  async skillsGapForecaster(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.skillsGapForecaster(req.user.orgId, body.context);
  }

  @Post('team-capacity-optimizer')
  @Roles('manager', 'admin', 'super_admin')
  async teamCapacityOptimizer(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.teamCapacityOptimizer(req.user.orgId, req.user.userId, body.context);
  }

  @Post('succession-planning-assistant')
  @Roles('manager', 'admin', 'super_admin')
  async successionPlanningAssistant(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.successionPlanningAssistant(req.user.orgId, req.user.userId, body.context);
  }

  @Post('career-growth-predictor')
  @Roles('employee', 'manager', 'admin', 'super_admin')
  async careerGrowthPredictor(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.careerGrowthPredictor(req.user.orgId, req.user.userId, body.context);
  }
}
