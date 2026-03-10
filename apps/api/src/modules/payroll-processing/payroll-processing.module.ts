import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { PAYROLL_PROCESSING_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { PayrollConfigurationController } from './features/admin/payroll-configuration.controller';
import { PayrollRunController } from './features/admin/payroll-run.controller';
import { StatutoryComplianceController } from './features/admin/statutory-compliance.controller';
import { PayrollReportsController } from './features/admin/payroll-reports.controller';

// Admin services
import { PayrollConfigurationService } from './features/admin/payroll-configuration.service';
import { PayrollRunService } from './features/admin/payroll-run.service';
import { StatutoryComplianceService } from './features/admin/statutory-compliance.service';
import { PayrollReportsService } from './features/admin/payroll-reports.service';

// Manager controllers
import { TeamPayrollOverviewController } from './features/manager/team-payroll-overview.controller';
import { PayrollApprovalsController } from './features/manager/payroll-approvals.controller';
import { TeamCostReportsController } from './features/manager/team-cost-reports.controller';

// Manager services
import { TeamPayrollOverviewService } from './features/manager/team-payroll-overview.service';
import { PayrollApprovalsService } from './features/manager/payroll-approvals.service';
import { TeamCostReportsService } from './features/manager/team-cost-reports.service';

// Employee controllers
import { MyPayslipsController } from './features/employee/my-payslips.controller';
import { TaxManagementController } from './features/employee/tax-management.controller';
import { SalaryStructureController } from './features/employee/salary-structure.controller';
import { ReimbursementsClaimsController } from './features/employee/reimbursements-claims.controller';

// Employee services
import { MyPayslipsService } from './features/employee/my-payslips.service';
import { TaxManagementService } from './features/employee/tax-management.service';
import { SalaryStructureService } from './features/employee/salary-structure.service';
import { ReimbursementsClaimsService } from './features/employee/reimbursements-claims.service';

// AI
import { PayrollAiInsightsController } from './features/ai/ai-insights.controller';
import { PayrollAiInsightsService } from './features/ai/ai-insights.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    PayrollConfigurationController,
    PayrollRunController,
    StatutoryComplianceController,
    PayrollReportsController,
    // Manager
    TeamPayrollOverviewController,
    PayrollApprovalsController,
    TeamCostReportsController,
    // Employee
    MyPayslipsController,
    TaxManagementController,
    SalaryStructureController,
    ReimbursementsClaimsController,
    // AI
    PayrollAiInsightsController,
  ],
  providers: [
    // Admin
    PayrollConfigurationService,
    PayrollRunService,
    StatutoryComplianceService,
    PayrollReportsService,
    // Manager
    TeamPayrollOverviewService,
    PayrollApprovalsService,
    TeamCostReportsService,
    // Employee
    MyPayslipsService,
    TaxManagementService,
    SalaryStructureService,
    ReimbursementsClaimsService,
    // AI
    PayrollAiInsightsService,
  ],
})
export class PayrollProcessingModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('payroll-processing', PAYROLL_PROCESSING_SETUP_STEPS);
  }
}
