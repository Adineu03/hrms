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
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { HolidayCalendarMgmtService } from './holiday-calendar-mgmt.service';

@Controller('leave-management/admin/holidays')
export class HolidayCalendarMgmtController {
  constructor(
    private readonly holidayCalendarMgmtService: HolidayCalendarMgmtService,
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
    @Query('year') year?: string,
    @Query('locationId') locationId?: string,
    @Query('type') type?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.list(orgId, { year, locationId, type });
  }

  @Get('multi-year')
  @Roles('super_admin', 'admin')
  async multiYear(
    @Query('fromYear') fromYear?: string,
    @Query('toYear') toYear?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.getMultiYear(orgId, { fromYear, toYear });
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.remove(orgId, id);
  }

  @Post('bulk-create')
  @Roles('super_admin', 'admin')
  async bulkCreate(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.holidayCalendarMgmtService.bulkCreate(orgId, body);
  }
}
