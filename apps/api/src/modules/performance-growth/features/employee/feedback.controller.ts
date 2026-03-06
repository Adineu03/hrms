import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { FeedbackService } from './feedback.service';

@Controller('performance-growth/employee/feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get() @Roles('super_admin', 'admin', 'manager', 'employee')
  async getReceived() { return this.service.getMyFeedback(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('given') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getGiven() { return this.service.getFeedbackGiven(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('requests') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getPendingRequests() { return this.service.getPendingFeedbackRequests(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('wall') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getWall() { return this.service.getFeedbackWall(this.getOrgIdOrThrow()); }

  @Post() @Roles('super_admin', 'admin', 'manager', 'employee')
  async give(@Body() body: Record<string, any>) { return this.service.giveFeedback(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body); }

  @Post('request') @Roles('super_admin', 'admin', 'manager', 'employee')
  async request(@Body() body: Record<string, any>) { return this.service.requestFeedback(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body); }

  @Post(':id/respond') @Roles('super_admin', 'admin', 'manager', 'employee')
  async respond(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.respondToFeedback(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }
}
