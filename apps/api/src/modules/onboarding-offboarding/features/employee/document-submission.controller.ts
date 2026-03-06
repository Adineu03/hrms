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
import { DocumentSubmissionService } from './document-submission.service';

@Controller('onboarding-offboarding/employee/documents')
export class DocumentSubmissionController {
  constructor(
    private readonly service: DocumentSubmissionService,
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
  async listRequiredDocuments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listRequiredDocuments(orgId, userId);
  }

  @Post(':taskId/upload')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async uploadDocument(@Param('taskId') taskId: string, @Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.uploadDocument(orgId, userId, taskId, body);
  }

  @Get(':taskId/status')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getDocumentStatus(@Param('taskId') taskId: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getDocumentStatus(orgId, userId, taskId);
  }

  @Get('offer-letter')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async getOfferLetter() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getOfferLetter(orgId, userId);
  }

  @Post('policy-acknowledgement')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async acknowledgePolicies(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.acknowledgePolicies(orgId, userId, body);
  }

  @Post('tax-declaration')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitTaxDeclaration(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitTaxDeclaration(orgId, userId, body);
  }

  @Post('bank-details')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitBankDetails(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitBankDetails(orgId, userId, body);
  }

  @Post('emergency-contact')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async submitEmergencyContact(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitEmergencyContact(orgId, userId, body);
  }

  @Post('profile-photo')
  @Roles('super_admin', 'admin', 'manager', 'employee')
  async uploadProfilePhoto(@Body() body: Record<string, any>) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.uploadProfilePhoto(orgId, userId, body);
  }
}
