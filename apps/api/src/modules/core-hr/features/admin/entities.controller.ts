import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { EntitiesService } from './entities.service';

@Controller('core-hr/admin/entities')
export class EntitiesController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list() {
    const orgId = this.getOrgIdOrThrow();
    return this.entitiesService.list(orgId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.entitiesService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: {
    name: string;
    legalName?: string;
    registrationNumber?: string;
    taxId?: string;
    country: string;
    address?: string;
    city?: string;
    state?: string;
    currency?: string;
    isPrimary?: boolean;
    config?: Record<string, any>;
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.entitiesService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.entitiesService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async deactivate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.entitiesService.deactivate(orgId, id);
    return { success: true };
  }
}
