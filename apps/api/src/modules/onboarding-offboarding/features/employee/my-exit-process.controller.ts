import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyExitProcessService } from './my-exit-process.service';

@Controller('onboarding-offboarding/employee/my-exit')
export class MyExitProcessController {
  constructor(
    private readonly service: MyExitProcessService,
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
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOverview() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOverview(orgId, userId);
  }

  @Post('resign')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitResignation(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitResignation(orgId, userId, body);
  }

  @Get('clearance')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getClearanceStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getClearanceStatus(orgId, userId);
  }

  @Get('assets')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAssetChecklist() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getAssetChecklist(orgId, userId);
  }

  @Patch('assets/:id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async markAssetReturned(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.markAssetReturned(orgId, userId, id, body);
  }

  @Get('knowledge-transfer')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getKnowledgeTransfers() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getKnowledgeTransfers(orgId, userId);
  }

  @Get('settlement')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSettlementEstimate() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSettlementEstimate(orgId, userId);
  }

  @Get('survey')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getExitSurvey() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getExitSurvey(orgId, userId);
  }

  @Post('survey')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitExitSurvey(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitExitSurvey(orgId, userId, body);
  }

  @Get('letters')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getLetters() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getLetters(orgId, userId);
  }
}
