import { Body, Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SocialCommunityService } from './social-community.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('engagement-culture/employee/social')
export class SocialCommunityController {
  constructor(
    private readonly service: SocialCommunityService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId?.();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get('feed')
  async getFeed() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getSocialFeed(orgId);
  }

  @Post('posts')
  async createPost(@Body() dto: { type?: string; content: string; groupId?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createPost(orgId, userId, dto);
  }

  @Post('posts/:id/like')
  async likePost(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.likePost(orgId, userId, id);
  }

  @Get('groups')
  async listGroups() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.listGroups(orgId);
  }

  @Post('groups')
  async createGroup(@Body() dto: { name: string; description?: string; type?: string }) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createGroup(orgId, userId, dto);
  }

  @Post('groups/:id/join')
  async joinGroup(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.joinGroup(orgId, userId, id);
  }

  @Post('groups/:id/leave')
  async leaveGroup(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.leaveGroup(orgId, userId, id);
  }

  @Get('shoutouts')
  async getShoutouts() {
    const orgId = this.getOrgIdOrThrow();
    return this.service.getShoutouts(orgId);
  }
}
