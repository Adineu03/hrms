import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import type { EmployeeProfileData } from '@hrms/shared';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EmployeesService } from './employees.service';

@Controller('cold-start/employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const filters: { departmentId?: string; isActive?: boolean } = {};

    if (departmentId) {
      filters.departmentId = departmentId;
    }
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    return this.employeesService.list(orgId, filters);
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  async getStats() {
    const orgId = this.getOrgIdOrThrow();
    return this.employeesService.getStats(orgId);
  }

  @Get('org-chart')
  async getOrgChart() {
    const orgId = this.getOrgIdOrThrow();
    return this.employeesService.getOrgChart(orgId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeesService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName?: string;
      role?: string;
      departmentId?: string;
      designationId?: string;
      locationId?: string;
      gradeId?: string;
      managerId?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeesService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<EmployeeProfileData>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeesService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async deactivate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.employeesService.deactivate(orgId, id);
    return { success: true };
  }
}
