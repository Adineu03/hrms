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
import { OfferManagementService } from './offer-management.service';

@Controller('talent-acquisition/admin/offers')
export class OfferManagementController {
  constructor(
    private readonly service: OfferManagementService,
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listOffers(orgId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('analytics')
  @Roles('super_admin', 'admin')
  async getAnalytics() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOfferAnalytics(orgId);
  }

  @Get('templates')
  @Roles('super_admin', 'admin')
  async getTemplates() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOfferTemplates(orgId);
  }

  @Post()
  @Roles('super_admin', 'admin')
  async create(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const createdBy = body.createdBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.createOffer(orgId, createdBy, body);
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  async getById(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getOffer(orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.updateOffer(orgId, id, body);
  }

  @Post(':id/submit')
  @Roles('super_admin', 'admin')
  async submit(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.submitForApproval(orgId, id);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin')
  async approve(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const approvedBy = body.approvedBy ?? this.tenantService.getUserId?.() ?? orgId;
    return this.service.approveOffer(orgId, id, approvedBy);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'admin')
  async reject(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.rejectOffer(orgId, id, body);
  }

  @Post(':id/send')
  @Roles('super_admin', 'admin')
  async send(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.sendOffer(orgId, id);
  }

  @Post(':id/revoke')
  @Roles('super_admin', 'admin')
  async revoke(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    return this.service.revokeOffer(orgId, id, body);
  }
}
