import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { orgs } from '../../infrastructure/database/schema/orgs';
import { orgModules } from '../../infrastructure/database/schema/org-modules';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../multi-tenancy/tenant.service';
import { TemplateService } from './template.service';

@Controller('templates')
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly tenantService: TenantService,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  @Get()
  @Public()
  listTemplates() {
    return this.templateService.listTemplates();
  }

  @Get('status')
  async getTemplateStatus() {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      return { applied: false };
    }

    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      return { applied: false };
    }

    const config = (org.config as Record<string, any>) ?? {};
    if (config.appliedTemplate) {
      const template = this.templateService.getTemplate(config.appliedTemplate);
      return {
        applied: true,
        templateId: config.appliedTemplate,
        templateName: template?.name ?? config.appliedTemplate,
      };
    }

    return { applied: false };
  }

  @Get(':industryId')
  @Public()
  getTemplate(@Param('industryId') industryId: string) {
    const template = this.templateService.getTemplate(industryId);
    if (!template) {
      throw new NotFoundException(`Template '${industryId}' not found`);
    }
    return template;
  }

  @Post('apply')
  @Roles('super_admin', 'admin')
  async applyTemplate(@Body() body: { industryId: string }) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }

    const template = this.templateService.getTemplate(body.industryId);
    if (!template) {
      throw new NotFoundException(`Template '${body.industryId}' not found`);
    }

    // 1. Update orgs.config with template data (workWeek, leave, attendance, payroll, probation)
    const [org] = await this.db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const existingConfig = (org.config as Record<string, any>) ?? {};
    const updatedOrgConfig = {
      ...existingConfig,
      appliedTemplate: template.id,
      workWeek: template.workWeek,
      leave: template.leave,
      attendance: template.attendance,
      payroll: template.payroll,
      probation: template.probation,
    };

    const now = new Date();
    await this.db
      .update(orgs)
      .set({
        industry: template.name,
        config: updatedOrgConfig,
        updatedAt: now,
      })
      .where(eq(orgs.id, orgId));

    // 2. Update cold-start-setup org_module config with pre-filled setup step data
    const [coldStartModule] = await this.db
      .select()
      .from(orgModules)
      .where(
        and(
          eq(orgModules.orgId, orgId),
          eq(orgModules.moduleId, 'cold-start-setup'),
        ),
      )
      .limit(1);

    if (coldStartModule) {
      const existingModuleConfig = (coldStartModule.config as Record<string, any>) ?? {};
      const updatedModuleConfig = {
        ...existingModuleConfig,
        workWeek: template.workWeek,
        departments: template.departments,
        designations: template.designations,
      };

      await this.db
        .update(orgModules)
        .set({
          config: updatedModuleConfig,
          updatedAt: now,
        })
        .where(
          and(
            eq(orgModules.orgId, orgId),
            eq(orgModules.moduleId, 'cold-start-setup'),
          ),
        );
    }

    return { success: true, appliedTemplate: template.id };
  }
}
