import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LmsConfigService } from './lms-config.service';

@Controller('learning-development/admin/lms-config')
export class LmsConfigController {
  constructor(
    private readonly service: LmsConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async getConfig() {
    return this.service.getLmsConfig(this.getOrgIdOrThrow());
  }

  @Post()
  @Roles('super_admin', 'admin')
  async saveConfig(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.saveLmsConfig(orgId, this.tenantService.getUserId?.() ?? orgId, body);
  }

  @Get('courses')
  @Roles('super_admin', 'admin')
  async listCourses(
    @Query('type') type?: string,
    @Query('format') format?: string,
    @Query('difficulty') difficulty?: string,
    @Query('provider') provider?: string,
  ) {
    return this.service.listCourses(this.getOrgIdOrThrow(), { type, format, difficulty, provider });
  }

  @Post('courses')
  @Roles('super_admin', 'admin')
  async createCourse(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createCourse(orgId, this.tenantService.getUserId?.() ?? orgId, body);
  }

  @Patch('courses/:id')
  @Roles('super_admin', 'admin')
  async updateCourse(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateCourse(this.getOrgIdOrThrow(), id, body);
  }

  @Delete('courses/:id')
  @Roles('super_admin', 'admin')
  async deleteCourse(@Param('id') id: string) {
    return this.service.deleteCourse(this.getOrgIdOrThrow(), id);
  }
}
