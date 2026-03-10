import { Body, Controller, Get, Param, Patch, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MandatoryTrainingTrackerService } from './mandatory-training-tracker.service';

@Controller('compliance-audit/employee/mandatory-training')
export class MandatoryTrainingTrackerController {
  constructor(
    private readonly service: MandatoryTrainingTrackerService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async getMyTrainings() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyTrainings(orgId, userId);
  }

  @Get('overdue')
  async getOverdueTrainings() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOverdueTrainings(orgId, userId);
  }

  @Get('certificates')
  async getMyCertificates() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMyCertificates(orgId, userId);
  }

  @Patch(':completionId/start')
  async markTrainingStarted(@Param('completionId') completionId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.markTrainingStarted(orgId, userId, completionId);
  }

  @Patch(':completionId/complete')
  async markTrainingCompleted(
    @Param('completionId') completionId: string,
    @Body() dto: { score?: number },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.markTrainingCompleted(orgId, userId, completionId, dto);
  }
}
