import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantService } from '../multi-tenancy/tenant.service';
import { DefaultsService } from './defaults.service';

@Controller('modules/:moduleId/defaults')
export class DefaultsController {
  constructor(
    private readonly defaultsService: DefaultsService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  getDefaults(@Param('moduleId') moduleId: string) {
    const defaults = this.defaultsService.getDefaults(moduleId);
    if (!defaults) {
      throw new NotFoundException(`No defaults found for module '${moduleId}'`);
    }
    return defaults;
  }

  @Post('apply')
  @Roles('super_admin', 'admin')
  async applyDefaults(@Param('moduleId') moduleId: string) {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }

    const mergedConfig = await this.defaultsService.applyDefaults(orgId, moduleId);
    return { success: true, config: mergedConfig };
  }
}
