import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { MyGoalsService } from './my-goals.service';

@Controller('performance-growth/employee/my-goals')
export class MyGoalsController {
  constructor(private readonly service: MyGoalsService, private readonly tenantService: TenantService) {}
  private getOrgIdOrThrow(): string { const o = this.tenantService.getOrgId(); if (!o) throw new UnauthorizedException('Missing organization context'); return o; }
  private getUserIdOrThrow(): string { const u = this.tenantService.getUserId(); if (!u) throw new UnauthorizedException('Missing user context'); return u; }

  @Get() @Roles('super_admin', 'admin', 'manager', 'employee')
  async list(@Query('status') status?: string) { return this.service.listMyGoals(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), status); }

  @Get('history') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getHistory() { return this.service.getGoalHistory(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get('alignment') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getAlignment() { return this.service.getGoalAlignment(this.getOrgIdOrThrow(), this.getUserIdOrThrow()); }

  @Get(':id') @Roles('super_admin', 'admin', 'manager', 'employee')
  async getById(@Param('id') id: string) { return this.service.getGoal(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id); }

  @Post(':id/update') @Roles('super_admin', 'admin', 'manager', 'employee')
  async updateProgress(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.updateGoalProgress(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }

  @Post(':id/request-modification') @Roles('super_admin', 'admin', 'manager', 'employee')
  async requestModification(@Param('id') id: string, @Body() body: Record<string, any>) { return this.service.requestModification(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body); }

  @Post('personal') @Roles('super_admin', 'admin', 'manager', 'employee')
  async addPersonal(@Body() body: Record<string, any>) { return this.service.addPersonalGoal(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), body); }
}
