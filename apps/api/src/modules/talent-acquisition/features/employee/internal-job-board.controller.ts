import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { InternalJobBoardService } from './internal-job-board.service';

@Controller('talent-acquisition/employee/jobs')
export class InternalJobBoardController {
  constructor(
    private readonly service: InternalJobBoardService,
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

  @Get()
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async listJobs(
    @Query('department') department?: string,
    @Query('location') location?: string,
    @Query('grade') grade?: string,
    @Query('employmentType') employmentType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listJobs(orgId, {
      department,
      location,
      grade,
      employmentType,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('bookmarks')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getBookmarks() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getBookmarks(orgId, userId);
  }

  @Get('recommended')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getRecommended() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getRecommended(orgId, userId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getJobDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getJobDetail(orgId, id);
  }

  @Post(':id/apply')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async applyToJob(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.applyToJob(orgId, userId, id, body);
  }

  @Post(':id/bookmark')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async bookmarkJob(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.bookmarkJob(orgId, userId, id);
  }

  @Delete(':id/bookmark')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async removeBookmark(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.removeBookmark(orgId, userId, id);
  }
}
