import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OrientationTrainingService } from './orientation-training.service';

@Controller('onboarding-offboarding/employee/orientation')
export class OrientationTrainingController {
  constructor(
    private readonly service: OrientationTrainingService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('sessions')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getSessions() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getSessions(orgId, userId);
  }

  @Get('materials')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getMaterials() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getMaterials(orgId, userId);
  }

  @Get('modules')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getModules() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getModules(orgId, userId);
  }

  @Post('modules/:id/complete')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async completeModule(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.completeModule(orgId, userId, id);
  }

  @Post('modules/:id/quiz')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitQuiz(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitQuiz(orgId, userId, id, body);
  }

  @Get('completion-status')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCompletionStatus() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCompletionStatus(orgId, userId);
  }

  @Get('certificates')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getCertificates() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getCertificates(orgId, userId);
  }

  @Post('feedback')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitFeedback(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitFeedback(orgId, userId, body);
  }

  @Get('resources')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getResources() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getResources(orgId, userId);
  }
}
