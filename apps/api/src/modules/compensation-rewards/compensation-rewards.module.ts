import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { COMPENSATION_REWARDS_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { SalaryStructureConfigController } from './features/admin/salary-structure-config.controller';
import { CompensationPlanningController } from './features/admin/compensation-planning.controller';
import { RewardsRecognitionSetupController } from './features/admin/rewards-recognition-setup.controller';
import { CompensationAnalyticsController } from './features/admin/compensation-analytics.controller';

// Admin services
import { SalaryStructureConfigService } from './features/admin/salary-structure-config.service';
import { CompensationPlanningService } from './features/admin/compensation-planning.service';
import { RewardsRecognitionSetupService } from './features/admin/rewards-recognition-setup.service';
import { CompensationAnalyticsService } from './features/admin/compensation-analytics.service';

// Manager controllers
import { TeamCompensationViewController } from './features/manager/team-compensation-view.controller';
import { RecognitionManagementController } from './features/manager/recognition-management.controller';
import { IncrementPlanningController } from './features/manager/increment-planning.controller';

// Manager services
import { TeamCompensationViewService } from './features/manager/team-compensation-view.service';
import { RecognitionManagementService } from './features/manager/recognition-management.service';
import { IncrementPlanningService } from './features/manager/increment-planning.service';

// Employee controllers
import { MyCompensationController } from './features/employee/my-compensation.controller';
import { PaySlipsTaxController } from './features/employee/pay-slips-tax.controller';
import { RecognitionAwardsController } from './features/employee/recognition-awards.controller';
import { BenefitsEnrollmentController } from './features/employee/benefits-enrollment.controller';

// Employee services
import { MyCompensationService } from './features/employee/my-compensation.service';
import { PaySlipsTaxService } from './features/employee/pay-slips-tax.service';
import { RecognitionAwardsService } from './features/employee/recognition-awards.service';
import { BenefitsEnrollmentService } from './features/employee/benefits-enrollment.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    SalaryStructureConfigController,
    CompensationPlanningController,
    RewardsRecognitionSetupController,
    CompensationAnalyticsController,
    // Manager
    TeamCompensationViewController,
    RecognitionManagementController,
    IncrementPlanningController,
    // Employee
    MyCompensationController,
    PaySlipsTaxController,
    RecognitionAwardsController,
    BenefitsEnrollmentController,
  ],
  providers: [
    // Admin
    SalaryStructureConfigService,
    CompensationPlanningService,
    RewardsRecognitionSetupService,
    CompensationAnalyticsService,
    // Manager
    TeamCompensationViewService,
    RecognitionManagementService,
    IncrementPlanningService,
    // Employee
    MyCompensationService,
    PaySlipsTaxService,
    RecognitionAwardsService,
    BenefitsEnrollmentService,
  ],
})
export class CompensationRewardsModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('compensation-rewards', COMPENSATION_REWARDS_SETUP_STEPS);
  }
}
