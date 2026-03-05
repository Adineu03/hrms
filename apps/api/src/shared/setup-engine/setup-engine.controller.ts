import {
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../multi-tenancy/tenant.service';
import { SetupEngineService } from './setup-engine.service';

@Controller('modules/:moduleId/setup')
export class SetupEngineController {
  constructor(
    private readonly setupEngineService: SetupEngineService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async getSetupInfo(@Param('moduleId') moduleId: string) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return this.setupEngineService.getSetupInfo(orgId, moduleId);
  }

  @Post(':stepId/complete')
  @Roles('super_admin', 'admin')
  async completeStep(
    @Param('moduleId') moduleId: string,
    @Param('stepId') stepId: string,
  ) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return this.setupEngineService.completeStep(orgId, moduleId, stepId);
  }

  @Post('complete')
  @Roles('super_admin', 'admin')
  async completeSetup(@Param('moduleId') moduleId: string) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    await this.setupEngineService.completeSetup(orgId, moduleId);
    return { success: true };
  }
}
