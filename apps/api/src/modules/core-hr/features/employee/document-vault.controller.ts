import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { DocumentVaultService } from './document-vault.service';

@Controller('core-hr/employee/documents')
export class DocumentVaultController {
  constructor(
    private readonly documentVaultService: DocumentVaultService,
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
  async listDocuments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.documentVaultService.listDocuments(orgId, userId);
  }

  @Get('expiring')
  async getExpiringDocuments() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.documentVaultService.getExpiringDocuments(orgId, userId);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.documentVaultService.getDocument(orgId, userId, id);
  }

  @Post()
  async createDocument(
    @Body()
    body: {
      category: string;
      name: string;
      description?: string;
      expiryDate?: string;
      fileUrl?: string;
      fileSize?: string;
      mimeType?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.documentVaultService.createDocument(orgId, userId, body);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.documentVaultService.deleteDocument(orgId, userId, id);
  }
}
