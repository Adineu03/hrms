import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { JobPostingService } from './job-posting.service';

@Controller('talent-acquisition/admin/postings')
export class JobPostingController {
  constructor(
    private readonly service: JobPostingService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(
    @Query('status') status?: string,
    @Query('postingType') postingType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listPostings(orgId, {
      status,
      postingType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = body.createdBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.createPosting(orgId, createdBy, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPosting(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updatePosting(orgId, id, body);
  }

  @Post(':id/publish')
  @Roles('super_admin', 'admin')
  async publish(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.publishPosting(orgId, id);
  }

  @Post(':id/pause')
  @Roles('super_admin', 'admin')
  async pause(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.pausePosting(orgId, id);
  }

  @Post(':id/close')
  @Roles('super_admin', 'admin')
  async close(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.closePosting(orgId, id);
  }

  @Get(':id/analytics')
  @Roles('super_admin', 'admin')
  async analytics(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getPostingAnalytics(orgId, id);
  }
}
