import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CandidateDatabaseService } from './candidate-database.service';

@Controller('talent-acquisition/admin/candidates')
export class CandidateDatabaseController {
  constructor(
    private readonly service: CandidateDatabaseService,
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
    @Query('source') source?: string,
    @Query('skills') skills?: string,
    @Query('experience') experience?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listCandidates(orgId, {
      status,
      source,
      skills,
      experience,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('duplicates')
  @Roles('super_admin', 'admin')
  async findDuplicates(
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.findDuplicates(orgId, { email, phone });
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.createCandidate(orgId, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCandidate(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateCandidate(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async delete(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.softDelete(orgId, id);
  }

  @Post(':id/tags')
  @Roles('super_admin', 'admin')
  async addTags(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.addTags(orgId, id, body);
  }

  @Delete(':id/tags/:tag')
  @Roles('super_admin', 'admin')
  async removeTag(@Param('id') id: string, @Param('tag') tag: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.removeTag(orgId, id, tag);
  }

  @Get(':id/history')
  @Roles('super_admin', 'admin')
  async getHistory(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getCandidateHistory(orgId, id);
  }
}
