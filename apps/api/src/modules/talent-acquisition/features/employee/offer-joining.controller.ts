import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { OfferJoiningService } from './offer-joining.service';

@Controller('talent-acquisition/employee/offers')
export class OfferJoiningController {
  constructor(
    private readonly service: OfferJoiningService,
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
  async listOffers() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listOffers(orgId, userId);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOfferDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOfferDetail(orgId, userId, id);
  }

  @Post(':id/accept')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async acceptOffer(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.acceptOffer(orgId, userId, id);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async rejectOffer(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.rejectOffer(orgId, userId, id, body);
  }

  @Get(':id/document')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOfferDocument(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOfferDocument(orgId, userId, id);
  }

  @Get(':id/joining')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getJoiningFormalities(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getJoiningFormalities(orgId, userId, id);
  }

  @Post(':id/joining/confirm')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async confirmJoiningDate(@Param('id') id: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.confirmJoiningDate(orgId, userId, id, body);
  }
}
