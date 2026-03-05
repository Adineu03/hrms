import {
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../multi-tenancy/tenant.service';
import { ModuleRegistryService } from './module-registry.service';

@Controller('modules')
export class ModuleRegistryController {
  constructor(
    private readonly moduleRegistryService: ModuleRegistryService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async listModules() {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return this.moduleRegistryService.listModules(orgId);
  }

  @Post(':moduleId/activate')
  @Roles('super_admin', 'admin')
  async activateModule(@Param('moduleId') moduleId: string) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return this.moduleRegistryService.activateModule(orgId, moduleId);
  }

  @Post(':moduleId/deactivate')
  @Roles('super_admin', 'admin')
  async deactivateModule(@Param('moduleId') moduleId: string) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    await this.moduleRegistryService.deactivateModule(orgId, moduleId);
    return { success: true };
  }
}
