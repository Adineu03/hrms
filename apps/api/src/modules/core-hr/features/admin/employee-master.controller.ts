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
import { EmployeeMasterService } from './employee-master.service';

@Controller('core-hr/admin/employees')
export class EmployeeMasterController {
  constructor(
    private readonly employeeMasterService: EmployeeMasterService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
    @Query('gradeId') gradeId?: string,
    @Query('employmentType') employmentType?: string,
    @Query('workModel') workModel?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.list(orgId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      locationId,
      gradeId,
      employmentType,
      workModel,
      departmentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('search')
  @Roles('super_admin', 'admin')
  async search(@Query('q') q: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.search(orgId, q ?? '');
  }

  @Get('duplicates')
  @Roles('super_admin', 'admin')
  async findDuplicates() {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.findDuplicates(orgId);
  }

  @Post('duplicates/merge')
  @Roles('super_admin', 'admin')
  async mergeDuplicates(
    @Body() body: { primaryId: string; duplicateId: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.mergeDuplicates(orgId, body.primaryId, body.duplicateId);
  }

  @Post('mass-update')
  @Roles('super_admin', 'admin')
  async massUpdate(
    @Body() body: { employeeIds: string[]; updates: Record<string, any> },
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.massUpdate(orgId, body.employeeIds, body.updates);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.getById(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.employeeMasterService.update(orgId, id, body);
  }
}
