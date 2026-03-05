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
import { CustomFieldsService } from './custom-fields.service';

@Controller('core-hr/admin/custom-fields')
export class CustomFieldsController {
  constructor(
    private readonly customFieldsService: CustomFieldsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  @Get()
  @Roles('super_admin', 'admin')
  async list(@Query('entity') entity?: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.customFieldsService.list(orgId, entity);
  }

  @Get('values/:entityId')
  @Roles('super_admin', 'admin')
  async getValues(@Param('entityId') entityId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.customFieldsService.getValues(orgId, entityId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.customFieldsService.getById(orgId, id);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: {
    entity: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    isRequired?: boolean;
    sortOrder?: number;
    options?: any[];
    validationRules?: Record<string, any>;
    defaultValue?: string;
    section?: string;
  }) {
    const orgId = this.getOrgIdOrThrow();
    return this.customFieldsService.create(orgId, body);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.customFieldsService.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async deactivate(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.customFieldsService.deactivate(orgId, id);
    return { success: true };
  }
}
