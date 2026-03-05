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
import { SalaryStructuresService } from './salary-structures.service';

@Controller('core-hr/admin/salary-structures')
export class SalaryStructuresController {
  constructor(
    private readonly salaryStructuresService: SalaryStructuresService,
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
    return this.salaryStructuresService.list(orgId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.salaryStructuresService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: {
    name: string;
    description?: string;
    components?: any[];
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.salaryStructuresService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.salaryStructuresService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async deactivate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.salaryStructuresService.deactivate(orgId, id);
    return { success: true };
  }

  @Post('assign')
  @Roles('super_admin', 'admin')
  async assign(@Body() body: {
    employeeId: string;
    salaryStructureId: string;
    ctc?: string;
    basicSalary?: string;
    effectiveFrom: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.salaryStructuresService.assign(orgId, body);
  }

  @Get('assignments/:employeeId')
  @Roles('super_admin', 'admin')
  async getAssignments(@Param('employeeId') employeeId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.salaryStructuresService.getAssignments(orgId, employeeId);
  }
}
