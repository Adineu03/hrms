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
import { AttendanceCorrectionsService } from './attendance-corrections.service';

@Controller('attendance/admin/corrections')
export class AttendanceCorrectionsController {
  constructor(
    private readonly attendanceCorrectionsService: AttendanceCorrectionsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async listRecords(
    @Query('date') date?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceCorrectionsService.listRecords(orgId, {
      date,
      employeeId,
      status,
      departmentId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async adminOverride(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.attendanceCorrectionsService.adminOverride(orgId, id, body, adminUserId);
  }

  @Post('bulk-correct')
  @Roles('super_admin', 'admin')
  async bulkCorrect(
    @Body() body: { recordIds: string[]; updates: Record<string, any> },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.attendanceCorrectionsService.bulkCorrect(
      orgId,
      body.recordIds,
      body.updates,
      adminUserId,
    );
  }

  @Get('regularizations')
  @Roles('super_admin', 'admin')
  async listRegularizations() {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceCorrectionsService.listRegularizations(orgId);
  }

  @Patch('regularizations/:id')
  @Roles('super_admin', 'admin')
  async reviewRegularization(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const adminUserId = this.tenantService.getUserId();
    return this.attendanceCorrectionsService.reviewRegularization(
      orgId,
      id,
      body,
      adminUserId,
    );
  }

  @Post('lock')
  @Roles('super_admin', 'admin')
  async lockRecords(@Body() body: { month: number; year: number }) {
    const orgId = this.getOrgIdOrThrow();
    return this.attendanceCorrectionsService.lockRecords(orgId, body.month, body.year);
  }
}
