import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { WhistleblowerEthicsPortalService } from './whistleblower-ethics-portal.service';

@Controller('compliance-audit/employee/ethics-portal')
export class WhistleblowerEthicsPortalController {
  constructor(
    private readonly service: WhistleblowerEthicsPortalService,
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

  @Post('submit')
  async submitComplaint(
    @Body()
    dto: {
      category: string;
      description: string;
      incidentDate?: string;
      location?: string;
      isAnonymous?: boolean;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitComplaint(orgId, userId, dto);
  }

  @Get('status/:referenceCode')
  async trackComplaintStatus(@Param('referenceCode') referenceCode: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.trackComplaintStatus(orgId, referenceCode);
  }

  @Get('hotline')
  async getEthicsHotlineInfo() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getEthicsHotlineInfo(orgId);
  }
}
