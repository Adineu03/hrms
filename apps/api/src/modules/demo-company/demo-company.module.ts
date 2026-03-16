import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { DEMO_COMPANY_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { DemoOrgManagementController } from './features/admin/demo-org-management.controller';
import { SeedDataControlController } from './features/admin/seed-data-control.controller';
import { DemoPersonasController } from './features/admin/demo-personas.controller';
import { GuidedTourBuilderController } from './features/admin/guided-tour-builder.controller';
import { DemoAnalyticsController } from './features/admin/demo-analytics.controller';

// Admin services
import { DemoOrgManagementService } from './features/admin/demo-org-management.service';
import { SeedDataControlService } from './features/admin/seed-data-control.service';
import { DemoPersonasService } from './features/admin/demo-personas.service';
import { GuidedTourBuilderService } from './features/admin/guided-tour-builder.service';
import { DemoAnalyticsService } from './features/admin/demo-analytics.service';

// Manager controllers
import { DemoWalkthroughController } from './features/manager/demo-walkthrough.controller';
import { SampleReportsController } from './features/manager/sample-reports.controller';

// Manager services
import { DemoWalkthroughService } from './features/manager/demo-walkthrough.service';
import { SampleReportsService } from './features/manager/sample-reports.service';

// Employee controllers
import { DemoOnboardingTourController } from './features/employee/demo-onboarding-tour.controller';
import { FeatureHighlightsController } from './features/employee/feature-highlights.controller';

// Employee services
import { DemoOnboardingTourService } from './features/employee/demo-onboarding-tour.service';
import { FeatureHighlightsService } from './features/employee/feature-highlights.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    DemoOrgManagementController,
    SeedDataControlController,
    DemoPersonasController,
    GuidedTourBuilderController,
    DemoAnalyticsController,
    // Manager
    DemoWalkthroughController,
    SampleReportsController,
    // Employee
    DemoOnboardingTourController,
    FeatureHighlightsController,
  ],
  providers: [
    // Admin
    DemoOrgManagementService,
    SeedDataControlService,
    DemoPersonasService,
    GuidedTourBuilderService,
    DemoAnalyticsService,
    // Manager
    DemoWalkthroughService,
    SampleReportsService,
    // Employee
    DemoOnboardingTourService,
    FeatureHighlightsService,
  ],
})
export class DemoCompanyModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('demo-company', DEMO_COMPANY_SETUP_STEPS);
  }
}
