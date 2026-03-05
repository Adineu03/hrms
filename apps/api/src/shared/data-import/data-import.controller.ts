import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { ColumnMappingData } from '@hrms/shared';
import { Roles } from '../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../shared/multi-tenancy/tenant.service';
import { DataImportService } from './data-import.service';

@Controller('data-import')
export class DataImportController {
  constructor(
    private readonly dataImportService: DataImportService,
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

  // ─── Template Download ────────────────────────────────────────────

  @Get('templates/:type')
  @Roles('super_admin', 'admin')
  async downloadTemplate(@Param('type') type: string, @Res() res: Response) {
    const buffer = this.dataImportService.generateTemplate(type);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${type}-template.xlsx`,
    );
    res.send(buffer);
  }

  // ─── Upload ───────────────────────────────────────────────────────

  @Post('upload')
  @Roles('super_admin', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.dataImportService.uploadFile(
      orgId,
      userId,
      file.buffer,
      file.originalname,
      type || 'employees',
    );
  }

  // ─── History ──────────────────────────────────────────────────────
  // NOTE: Static routes must be defined before parameterized routes
  // to prevent NestJS from matching "history" as :importId.

  @Get('history')
  @Roles('super_admin', 'admin')
  async getHistory() {
    const orgId = this.getOrgIdOrThrow();
    return this.dataImportService.getHistory(orgId);
  }

  // ─── Column Mapping ───────────────────────────────────────────────

  @Post(':importId/map-columns')
  @Roles('super_admin', 'admin')
  async mapColumns(
    @Param('importId') importId: string,
    @Body() body: { mapping: ColumnMappingData },
  ) {
    const orgId = this.getOrgIdOrThrow();
    await this.dataImportService.mapColumns(orgId, importId, body.mapping);
    return { success: true };
  }

  // ─── Validate ─────────────────────────────────────────────────────

  @Get(':importId/validate')
  @Roles('super_admin', 'admin')
  async validate(@Param('importId') importId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataImportService.validate(orgId, importId);
  }

  // ─── Execute Import ───────────────────────────────────────────────

  @Post(':importId/execute')
  @Roles('super_admin', 'admin')
  async execute(@Param('importId') importId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataImportService.execute(orgId, importId);
  }

  // ─── Status ───────────────────────────────────────────────────────

  @Get(':importId/status')
  @Roles('super_admin', 'admin')
  async getStatus(@Param('importId') importId: string) {
    const orgId = this.getOrgIdOrThrow();
    return this.dataImportService.getStatus(orgId, importId);
  }
}
