import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { SentimentEngineService } from './sentiment-engine.service';

@Roles('super_admin', 'admin')
@Controller('engagement-culture/admin/sentiment')
export class SentimentEngineController {
  constructor(
    private readonly service: SentimentEngineService,
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async analyze() {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return this.service.analyze(orgId);
  }
}
