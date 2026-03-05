import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SelfServiceService } from './self-service.service';

@Controller('core-hr/employee/requests')
export class SelfServiceController {
  constructor(
    private readonly selfServiceService: SelfServiceService,
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
  async listRequests() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.selfServiceService.listRequests(orgId, userId);
  }

  @Get('types')
  async getRequestTypes() {
    return this.selfServiceService.getRequestTypes();
  }

  @Get(':id')
  async getRequest(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.selfServiceService.getRequest(orgId, userId, id);
  }

  @Post()
  async createRequest(
    @Body()
    body: {
      type: string;
      subject: string;
      description?: string;
      data?: Record<string, any>;
      attachments?: string[];
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.selfServiceService.createRequest(orgId, userId, body);
  }
}
