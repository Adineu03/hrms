import { Controller, Post, Body, Req } from '@nestjs/common';
import { ColdStartAiInsightsService } from './ai-insights.service';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { orgId: string; userId: string; role: string };
}

@Controller('cold-start-setup/ai')
export class ColdStartAiInsightsController {
  constructor(private readonly aiInsightsService: ColdStartAiInsightsService) {}

  @Post('ai-column-mapper')
  @Roles('admin', 'super_admin')
  async aiColumnMapper(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.aiColumnMapper(req.user.orgId, body.context);
  }

  @Post('smart-org-chart-builder')
  @Roles('admin', 'super_admin')
  async smartOrgChartBuilder(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.smartOrgChartBuilder(req.user.orgId, body.context);
  }

  @Post('data-quality-scorer')
  @Roles('admin', 'super_admin')
  async dataQualityScorer(
    @Req() req: AuthenticatedRequest,
    @Body() body: { context?: Record<string, unknown> },
  ) {
    return this.aiInsightsService.dataQualityScorer(req.user.orgId, body.context);
  }
}
