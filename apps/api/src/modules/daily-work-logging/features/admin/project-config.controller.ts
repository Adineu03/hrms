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
import { ProjectConfigService } from './project-config.service';

@Controller('daily-work-logging/admin/projects')
export class ProjectConfigController {
  constructor(
    private readonly projectConfigService: ProjectConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  // ────────────────────────────── Projects ──────────────────────────────

  @Get()
  @Roles('super_admin', 'admin')
  async listProjects(@Query('status') status?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.listProjects(orgId, status);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async createProject(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.createProject(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async updateProject(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.updateProject(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async deleteProject(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.softDeleteProject(orgId, id);
  }

  // ────────────────────────────── Task Categories ──────────────────────────────

  @Get('categories')
  @Roles('super_admin', 'admin')
  async listCategories() {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.listCategories(orgId);
  }

  @Post('categories')
  @Roles('super_admin', 'admin')
  async createCategory(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.createCategory(orgId, body);
  }

  @Patch('categories/:id')
  @Roles('super_admin', 'admin')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.updateCategory(orgId, id, body);
  }

  // ────────────────────────────── Project Assignments ──────────────────────────────

  @Get(':id/assignments')
  @Roles('super_admin', 'admin')
  async listAssignments(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.listAssignments(orgId, id);
  }

  @Post(':id/assignments')
  @Roles('super_admin', 'admin')
  async assignEmployee(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.assignEmployee(orgId, id, body);
  }

  @Delete(':id/assignments/:assignmentId')
  @Roles('super_admin', 'admin')
  async removeAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.projectConfigService.removeAssignment(orgId, id, assignmentId);
  }
}
