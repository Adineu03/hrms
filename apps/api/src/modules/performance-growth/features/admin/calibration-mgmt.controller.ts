import { Body, Controller, Get, Param, Patch, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CalibrationMgmtService } from './calibration-mgmt.service';

@Controller('performance-growth/admin/calibration')
export class CalibrationMgmtController {
  constructor(private readonly service: CalibrationMgmtService, private readonly tenantService: TenantService) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('groups')
  @Roles('super_admin', 'admin')
  async listGroups(@Query('cycleId') cycleId?: string) { return this.service.listCalibrationGroups(this.getOrgIdOrThrow(), cycleId); }

  @Get('groups/:groupId')
  @Roles('super_admin', 'admin')
  async getGroup(@Param('groupId') groupId: string, @Query('cycleId') cycleId?: string) { return this.service.getCalibrationGroup(this.getOrgIdOrThrow(), groupId, cycleId); }

  @Patch('ratings')
  @Roles('super_admin', 'admin')
  async updateRatings(@Body() body: { updates: { assignmentId: string; calibratedRating: number; notes?: string }[] }) {
    return this.service.updateCalibrationRatings(this.getOrgIdOrThrow(), body.updates);
  }

  @Get('audit-trail')
  @Roles('super_admin', 'admin')
  async getAuditTrail(@Query('cycleId') cycleId?: string) { return this.service.getCalibrationAuditTrail(this.getOrgIdOrThrow(), cycleId); }

  @Get('force-distribution')
  @Roles('super_admin', 'admin')
  async getForceDistribution(@Query('cycleId') cycleId?: string) { return this.service.getForceDistribution(this.getOrgIdOrThrow(), cycleId); }
}
