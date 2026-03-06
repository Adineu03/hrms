import { Body, Controller, Delete, Get, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyExpensesService } from './my-expenses.service';

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('expense-management/employee/my-expenses')
export class MyExpensesController {
  constructor(
    private readonly service: MyExpensesService,
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

  @Get('reports')
  async listReports() {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.listReports(orgId, userId);
  }

  @Post('reports')
  async createReport(
    @Body() dto: { title: string; description?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.createReport(orgId, userId, dto);
  }

  @Get('reports/:id')
  async getReportDetail(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.getReportDetail(orgId, userId, id);
  }

  @Patch('reports/:id')
  async updateReport(
    @Param('id') id: string,
    @Body() dto: { title?: string; description?: string },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateReport(orgId, userId, id, dto);
  }

  @Post('reports/:id/submit')
  async submitReport(@Param('id') id: string) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.submitReport(orgId, userId, id);
  }

  @Post('reports/:id/items')
  async addItem(
    @Param('id') id: string,
    @Body()
    dto: {
      categoryId?: string;
      date: string;
      amount: string;
      vendor?: string;
      description: string;
      receiptUrl?: string;
      receiptName?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.addItem(orgId, userId, id, dto);
  }

  @Patch('reports/:id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body()
    dto: {
      categoryId?: string;
      date?: string;
      amount?: string;
      vendor?: string;
      description?: string;
      receiptUrl?: string;
      receiptName?: string;
    },
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.updateItem(orgId, userId, id, itemId, dto);
  }

  @Delete('reports/:id/items/:itemId')
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const orgId = this.getOrgIdOrThrow();
    const userId = this.getUserIdOrThrow();
    return this.service.removeItem(orgId, userId, id, itemId);
  }
}
