import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  EnhancedCompanyProfileData,
  OrgSettingsData,
  WorkWeekData,
  DepartmentData,
  DesignationData,
  InviteEmployeesData,
} from '@hrms/shared';
import { Roles } from '../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../shared/multi-tenancy/tenant.service';
import { SetupEngineService } from '../../shared/setup-engine/setup-engine.service';
import { ColdStartService } from './cold-start.service';

@Controller('cold-start')
export class ColdStartController {
  constructor(
    private readonly coldStartService: ColdStartService,
    private readonly setupEngineService: SetupEngineService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  // ─── Company Profile ──────────────────────────────────────────────

  @Get('company-profile')
  async getCompanyProfile() {
    const orgId = this.getOrgIdOrThrow();
    return this.coldStartService.getCompanyProfile(orgId);
  }

  @Post('company-profile')
  @Roles('super_admin', 'admin')
  async saveCompanyProfile(@Body() body: EnhancedCompanyProfileData) {
    const orgId = this.getOrgIdOrThrow();
    const saved = await this.coldStartService.saveCompanyProfile(orgId, body);
    await this.setupEngineService.completeStep(
      orgId,
      'cold-start-setup',
      'company-profile',
    );
    return saved;
  }

  // ─── Organization Settings ──────────────────────────────────────────

  @Get('org-settings')
  async getOrgSettings() {
    const orgId = this.getOrgIdOrThrow();
    return this.coldStartService.getOrgSettings(orgId);
  }

  @Post('org-settings')
  @Roles('super_admin', 'admin')
  async saveOrgSettings(@Body() body: OrgSettingsData) {
    const orgId = this.getOrgIdOrThrow();
    const saved = await this.coldStartService.saveOrgSettings(orgId, body);
    await this.setupEngineService.completeStep(
      orgId,
      'cold-start-setup',
      'org-settings',
    );
    return saved;
  }

  @Get('country-defaults/:country')
  getCountryDefaults(@Param('country') country: string) {
    return this.coldStartService.getCountryDefaults(country);
  }

  // ─── Work Week ────────────────────────────────────────────────────

  @Get('work-week')
  async getWorkWeek() {
    const orgId = this.getOrgIdOrThrow();
    return this.coldStartService.getWorkWeek(orgId);
  }

  @Post('work-week')
  @Roles('super_admin', 'admin')
  async saveWorkWeek(@Body() body: WorkWeekData) {
    const orgId = this.getOrgIdOrThrow();
    const saved = await this.coldStartService.saveWorkWeek(orgId, body);
    await this.setupEngineService.completeStep(
      orgId,
      'cold-start-setup',
      'work-week',
    );
    return saved;
  }

  // ─── Departments ──────────────────────────────────────────────────

  @Get('departments')
  async getDepartments() {
    const orgId = this.getOrgIdOrThrow();
    return this.coldStartService.getDepartments(orgId);
  }

  @Post('departments')
  @Roles('super_admin', 'admin')
  async saveDepartments(@Body() body: { departments: DepartmentData[] }) {
    const orgId = this.getOrgIdOrThrow();
    const saved = await this.coldStartService.saveDepartments(
      orgId,
      body.departments,
    );
    await this.setupEngineService.completeStep(
      orgId,
      'cold-start-setup',
      'departments',
    );
    return saved;
  }

  @Delete('departments/:id')
  @Roles('super_admin', 'admin')
  async deleteDepartment(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.coldStartService.deleteDepartment(orgId, id);
    return { success: true };
  }

  // ─── Designations ────────────────────────────────────────────────

  @Get('designations')
  async getDesignations() {
    const orgId = this.getOrgIdOrThrow();
    return this.coldStartService.getDesignations(orgId);
  }

  @Post('designations')
  @Roles('super_admin', 'admin')
  async saveDesignations(@Body() body: { designations: DesignationData[] }) {
    const orgId = this.getOrgIdOrThrow();
    const saved = await this.coldStartService.saveDesignations(
      orgId,
      body.designations,
    );
    await this.setupEngineService.completeStep(
      orgId,
      'cold-start-setup',
      'designations',
    );
    return saved;
  }

  @Delete('designations/:id')
  @Roles('super_admin', 'admin')
  async deleteDesignation(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.coldStartService.deleteDesignation(orgId, id);
    return { success: true };
  }

  // ─── Invite Employees ─────────────────────────────────────────────

  @Get('invite-employees')
  async getInvitedEmails() {
    const orgId = this.getOrgIdOrThrow();
    return this.coldStartService.getInvitedEmails(orgId);
  }

  @Post('invite-employees')
  @Roles('super_admin', 'admin')
  async saveInvitedEmails(@Body() body: InviteEmployeesData) {
    const orgId = this.getOrgIdOrThrow();
    const saved = await this.coldStartService.saveInvitedEmails(
      orgId,
      body.emails,
    );
    await this.setupEngineService.completeStep(
      orgId,
      'cold-start-setup',
      'invite-employees',
    );
    return saved;
  }
}
