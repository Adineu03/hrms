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
import type { LocationData } from '@hrms/shared';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { LocationsService } from './locations.service';

@Controller('cold-start/locations')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  @Get()
  async list() {
    const orgId = this.getOrgIdOrThrow();
    return this.locationsService.list(orgId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.locationsService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: LocationData) {
    const orgId = this.getOrgIdOrThrow();
    return this.locationsService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Partial<LocationData>) {
    const orgId = this.getOrgIdOrThrow();
    return this.locationsService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async remove(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.locationsService.remove(orgId, id);
    return { success: true };
  }

  @Post('bulk')
  @Roles('super_admin', 'admin')
  async bulkCreate(@Body() body: { locations: LocationData[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.locationsService.bulkCreate(orgId, body.locations);
  }
}
