import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SearchNavigationConfigService } from './search-navigation-config.service';

@Roles('super_admin', 'admin')
@Controller('platform-experience/admin/search-nav')
export class SearchNavigationConfigController {
  constructor(
    private readonly service: SearchNavigationConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get('config')
  async getSearchConfig() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSearchConfig(orgId);
  }

  @Patch('config')
  async updateSearchConfig(@Body() dto: { globalSearchEnabled?: boolean; recentSearchLimit?: number; suggestionsEnabled?: boolean; moduleSearchScope?: string[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateSearchConfig(orgId, dto);
  }

  @Get('shortcuts')
  async listGlobalShortcuts() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listGlobalShortcuts(orgId);
  }

  @Post('shortcuts')
  async createShortcut(@Body() dto: { title: string; moduleId?: string; path: string; icon?: string }) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createShortcut(orgId, dto);
  }

  @Delete('shortcuts/:id')
  async deleteShortcut(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.deleteShortcut(orgId, id);
  }

  @Get('module-visibility')
  async getModuleVisibility() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getModuleVisibility(orgId);
  }
}
