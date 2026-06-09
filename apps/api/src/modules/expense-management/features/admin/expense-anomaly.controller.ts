import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { ExpenseAnomalyService } from './expense-anomaly.service';

@Roles('super_admin', 'admin')
@Controller('expense-management/admin/anomalies')
export class ExpenseAnomalyController {
  constructor(
    private readonly service: ExpenseAnomalyService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async detect() {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return this.service.detect(orgId);
  }
}
