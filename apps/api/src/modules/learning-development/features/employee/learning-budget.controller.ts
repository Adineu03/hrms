import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LearningBudgetService } from './learning-budget.service';

@Controller('learning-development/employee/budget')
export class LearningBudgetController {
  constructor(
    private readonly service: LearningBudgetService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getMyBudget() {
    return this.service.getMyBudget(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Get('history')
  async getSpendHistory() {
    return this.service.getSpendHistory(this.getOrgIdOrThrow(), this.getUserIdOrThrow());
  }

  @Post('request')
  async requestApproval(@Body() body: {
    courseName: string;
    provider?: string;
    cost: number;
    currency?: string;
    url?: string;
    justification?: string;
  }) {
    return this.service.requestCourseApproval(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body);
  }
}
