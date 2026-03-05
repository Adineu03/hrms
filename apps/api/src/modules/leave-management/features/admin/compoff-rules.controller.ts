import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CompoffRulesService } from './compoff-rules.service';

@Controller('leave-management/admin/compoff')
export class CompoffRulesController {
  constructor(
    private readonly compoffRulesService: CompoffRulesService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('records')
  @Roles('super_admin', 'admin')
  async listRecords(
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.compoffRulesService.listRecords(orgId, {
      status,
      employeeId,
      departmentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('records/:id')
  @Roles('super_admin', 'admin')
  async getRecord(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.compoffRulesService.getRecord(orgId, id);
  }

  @Patch('records/:id')
  @Roles('super_admin', 'admin')
  async reviewRecord(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.compoffRulesService.reviewRecord(orgId, id, body, adminUserId);
  }

  @Get('rules')
  @Roles('super_admin', 'admin')
  async getRules() {
    const orgId = this.getOrgIdOrThrow();
    return this.compoffRulesService.getRules(orgId);
  }

  @Post('rules')
  @Roles('super_admin', 'admin')
  async updateRules(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.compoffRulesService.updateRules(orgId, body);
  }

  @Get('leave-types')
  @Roles('super_admin', 'admin')
  async getSpecialLeaveTypes() {
    const orgId = this.getOrgIdOrThrow();
    return this.compoffRulesService.getSpecialLeaveTypes(orgId);
  }
}
