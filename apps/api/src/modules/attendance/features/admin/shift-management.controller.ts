import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ShiftManagementService } from './shift-management.service';

@Controller('attendance/admin/shifts')
export class ShiftManagementController {
  constructor(
    private readonly shiftManagementService: ShiftManagementService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list() {
    const orgId = this.getOrgIdOrThrow();
    return this.shiftManagementService.list(orgId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.shiftManagementService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.shiftManagementService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.shiftManagementService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.shiftManagementService.softDelete(orgId, id);
  }

  @Post(':id/assign')
  @Roles('super_admin', 'admin')
  async assignToEmployees(
    @Param('id') id: string,
    @Body() body: { employeeIds: string[]; effectiveFrom: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.shiftManagementService.assignToEmployees(
      orgId,
      id,
      body.employeeIds,
      body.effectiveFrom,
    );
  }
}
