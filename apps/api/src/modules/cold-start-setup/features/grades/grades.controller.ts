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
import type { GradeData } from '@hrms/shared';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { GradesService } from './grades.service';

@Controller('cold-start/grades')
export class GradesController {
  constructor(
    private readonly gradesService: GradesService,
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
    return this.gradesService.list(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: GradeData) {
    const orgId = this.getOrgIdOrThrow();
    return this.gradesService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Partial<GradeData>) {
    const orgId = this.getOrgIdOrThrow();
    return this.gradesService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async remove(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.gradesService.remove(orgId, id);
    return { success: true };
  }

  @Post('bulk')
  @Roles('super_admin', 'admin')
  async bulkCreate(@Body() body: { grades: GradeData[] }) {
    const orgId = this.getOrgIdOrThrow();
    return this.gradesService.bulkCreate(orgId, body.grades);
  }
}
