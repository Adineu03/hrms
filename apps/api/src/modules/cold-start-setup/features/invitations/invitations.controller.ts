import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { SendInvitationData, AcceptInviteData } from '@hrms/shared';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { Public } from '../../../../shared/auth/decorators/public.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { InvitationsService } from './invitations.service';

@Controller('cold-start/invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) {
      throw new UnauthorizedException('Missing organization context');
    }
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return userId;
  }

  // ─── Admin Endpoints ────────────────────────────────────────────────

  @Get()
  @Roles('super_admin', 'admin')
  async list() {
    const orgId = this.getOrgIdOrThrow();
    return this.invitationsService.list(orgId);
  }

  @Post('send')
  @Roles('super_admin', 'admin')
  async send(@Body() body: SendInvitationData) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.invitationsService.send(orgId, userId, body);
  }

  @Post('send-bulk')
  @Roles('super_admin', 'admin')
  async sendBulk(@Body() body: { invitations: SendInvitationData[] }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.invitationsService.sendBulk(orgId, userId, body.invitations);
  }

  @Post('resend/:id')
  @Roles('super_admin', 'admin')
  async resend(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.invitationsService.resend(orgId, id);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async revoke(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    await this.invitationsService.revoke(orgId, id);
    return { success: true };
  }

  // ─── Public Endpoints (token-based) ─────────────────────────────────

  @Get('accept/:token')
  @Public()
  async validateToken(@Param('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  @Post('accept/:token')
  @Public()
  async acceptInvite(
    @Param('token') token: string,
    @Body() body: AcceptInviteData,
  ) {
    return this.invitationsService.accept(token, body);
  }
}
