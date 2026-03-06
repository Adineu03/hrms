import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { RecruitmentReportsService } from './recruitment-reports.service';

@Controller('talent-acquisition/admin/reports')
export class RecruitmentReportsController {
  constructor(
    private readonly service: RecruitmentReportsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('overview')
  @Roles('super_admin', 'admin')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOverview(orgId);
  }

  @Get('time-to-hire')
  @Roles('super_admin', 'admin')
  async getTimeToHire(@Query('groupBy') groupBy?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getTimeToHire(orgId, { groupBy });
  }

  @Get('source-effectiveness')
  @Roles('super_admin', 'admin')
  async getSourceEffectiveness() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSourceEffectiveness(orgId);
  }

  @Get('pipeline-funnel')
  @Roles('super_admin', 'admin')
  async getPipelineFunnel(@Query('requisitionId') requisitionId?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPipelineFunnel(orgId, { requisitionId });
  }

  @Get('recruiter-productivity')
  @Roles('super_admin', 'admin')
  async getRecruiterProductivity() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getRecruiterProductivity(orgId);
  }

  @Get('hiring-cost')
  @Roles('super_admin', 'admin')
  async getHiringCost() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getHiringCost(orgId);
  }
}
