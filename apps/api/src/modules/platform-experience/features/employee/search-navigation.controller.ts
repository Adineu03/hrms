import { Body, Controller, Delete, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SearchNavigationService } from './search-navigation.service';

@Controller('platform-experience/employee/search')
export class SearchNavigationController {
  constructor(
    private readonly service: SearchNavigationService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('search')
  async search(@Query('q') query: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.search(orgId, userId, query);
  }

  @Get('recent')
  async getRecentItems() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getRecentItems(orgId, userId);
  }

  @Get('bookmarks')
  async listBookmarks() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listBookmarks(orgId, userId);
  }

  @Post('bookmarks')
  async createBookmark(@Body() dto: { title: string; moduleId?: string; path: string; icon?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createBookmark(orgId, userId, dto);
  }

  @Delete('bookmarks/:id')
  async deleteBookmark(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.deleteBookmark(orgId, userId, id);
  }
}
