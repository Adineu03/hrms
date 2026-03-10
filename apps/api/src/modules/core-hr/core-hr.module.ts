import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { CORE_HR_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { EmployeeMasterController } from './features/admin/employee-master.controller';
import { EmployeeMasterService } from './features/admin/employee-master.service';
import { EntitiesController } from './features/admin/entities.controller';
import { EntitiesService } from './features/admin/entities.service';
import { SalaryStructuresController } from './features/admin/salary-structures.controller';
import { SalaryStructuresService } from './features/admin/salary-structures.service';
import { AdminBenefitsController } from './features/admin/benefits.controller';
import { AdminBenefitsService } from './features/admin/benefits.service';
import { ComplianceController } from './features/admin/compliance.controller';
import { ComplianceService } from './features/admin/compliance.service';
import { DataGovernanceController } from './features/admin/data-governance.controller';
import { DataGovernanceService } from './features/admin/data-governance.service';
import { CustomFieldsController } from './features/admin/custom-fields.controller';
import { CustomFieldsService } from './features/admin/custom-fields.service';

// Manager features
import { TeamDirectoryController } from './features/manager/team-directory.controller';
import { TeamDirectoryService } from './features/manager/team-directory.service';
import { TeamOrgController } from './features/manager/team-org.controller';
import { TeamOrgService } from './features/manager/team-org.service';
import { CompensationController } from './features/manager/compensation.controller';
import { CompensationService } from './features/manager/compensation.service';
import { HeadcountController } from './features/manager/headcount.controller';
import { HeadcountService } from './features/manager/headcount.service';
import { TeamComplianceController } from './features/manager/team-compliance.controller';
import { TeamComplianceService } from './features/manager/team-compliance.service';
import { ChangeRequestsController } from './features/manager/change-requests.controller';
import { ChangeRequestsService } from './features/manager/change-requests.service';

// Employee features
import { MyProfileController } from './features/employee/my-profile.controller';
import { MyProfileService } from './features/employee/my-profile.service';
import { DocumentVaultController } from './features/employee/document-vault.controller';
import { DocumentVaultService } from './features/employee/document-vault.service';
import { OrgChartController } from './features/employee/org-chart.controller';
import { OrgChartService } from './features/employee/org-chart.service';
import { PayslipController } from './features/employee/payslip.controller';
import { PayslipService } from './features/employee/payslip.service';
import { EmployeeBenefitsController } from './features/employee/benefits.controller';
import { EmployeeBenefitsService } from './features/employee/benefits.service';
import { SelfServiceController } from './features/employee/self-service.controller';
import { SelfServiceService } from './features/employee/self-service.service';

// AI features
import { CoreHrAiController } from './features/ai/ai.controller';
import { CoreHrAiService } from './features/ai/ai.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    EmployeeMasterController,
    EntitiesController,
    SalaryStructuresController,
    AdminBenefitsController,
    ComplianceController,
    DataGovernanceController,
    CustomFieldsController,
    // Manager
    TeamDirectoryController,
    TeamOrgController,
    CompensationController,
    HeadcountController,
    TeamComplianceController,
    ChangeRequestsController,
    // Employee
    MyProfileController,
    DocumentVaultController,
    OrgChartController,
    PayslipController,
    EmployeeBenefitsController,
    SelfServiceController,
    // AI
    CoreHrAiController,
  ],
  providers: [
    // Admin
    EmployeeMasterService,
    EntitiesService,
    SalaryStructuresService,
    AdminBenefitsService,
    ComplianceService,
    DataGovernanceService,
    CustomFieldsService,
    // Manager
    TeamDirectoryService,
    TeamOrgService,
    CompensationService,
    HeadcountService,
    TeamComplianceService,
    ChangeRequestsService,
    // Employee
    MyProfileService,
    DocumentVaultService,
    OrgChartService,
    PayslipService,
    EmployeeBenefitsService,
    SelfServiceService,
    // AI
    CoreHrAiService,
  ],
})
export class CoreHRModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('core-hr', CORE_HR_SETUP_STEPS);
  }
}
