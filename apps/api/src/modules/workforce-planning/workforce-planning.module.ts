import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { WORKFORCE_PLANNING_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { HeadcountPlanningController } from './features/admin/headcount-planning.controller';
import { BudgetManagementController } from './features/admin/budget-management.controller';
import { OrgDesignStudioController } from './features/admin/org-design-studio.controller';
import { RoleGradeArchitectureController } from './features/admin/role-grade-architecture.controller';
import { SuccessionPlanningController } from './features/admin/succession-planning.controller';
import { InternalMobilityTransfersController } from './features/admin/internal-mobility-transfers.controller';
import { WorkforceAnalyticsDashboardController } from './features/admin/workforce-analytics-dashboard.controller';

// Admin services
import { HeadcountPlanningService } from './features/admin/headcount-planning.service';
import { BudgetManagementService } from './features/admin/budget-management.service';
import { OrgDesignStudioService } from './features/admin/org-design-studio.service';
import { RoleGradeArchitectureService } from './features/admin/role-grade-architecture.service';
import { SuccessionPlanningService } from './features/admin/succession-planning.service';
import { InternalMobilityTransfersService } from './features/admin/internal-mobility-transfers.service';
import { WorkforceAnalyticsDashboardService } from './features/admin/workforce-analytics-dashboard.service';

// Manager controllers
import { TeamHeadcountViewController } from './features/manager/team-headcount-view.controller';
import { TeamSuccessionDashboardController } from './features/manager/team-succession-dashboard.controller';
import { TransferMobilityRequestsController } from './features/manager/transfer-mobility-requests.controller';
import { TeamCompositionAnalyticsController } from './features/manager/team-composition-analytics.controller';

// Manager services
import { TeamHeadcountViewService } from './features/manager/team-headcount-view.service';
import { TeamSuccessionDashboardService } from './features/manager/team-succession-dashboard.service';
import { TransferMobilityRequestsService } from './features/manager/transfer-mobility-requests.service';
import { TeamCompositionAnalyticsService } from './features/manager/team-composition-analytics.service';

// Employee controllers
import { CareerPathExplorerController } from './features/employee/career-path-explorer.controller';
import { InternalJobBoardController } from './features/employee/internal-job-board.controller';
import { MyTransferRequestController } from './features/employee/my-transfer-request.controller';

// Employee services
import { CareerPathExplorerService } from './features/employee/career-path-explorer.service';
import { InternalJobBoardService } from './features/employee/internal-job-board.service';
import { MyTransferRequestService } from './features/employee/my-transfer-request.service';

// AI
import { WorkforceAiInsightsController } from './features/ai/ai-insights.controller';
import { WorkforceAiInsightsService } from './features/ai/ai-insights.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    HeadcountPlanningController,
    BudgetManagementController,
    OrgDesignStudioController,
    RoleGradeArchitectureController,
    SuccessionPlanningController,
    InternalMobilityTransfersController,
    WorkforceAnalyticsDashboardController,
    // Manager
    TeamHeadcountViewController,
    TeamSuccessionDashboardController,
    TransferMobilityRequestsController,
    TeamCompositionAnalyticsController,
    // Employee
    CareerPathExplorerController,
    InternalJobBoardController,
    MyTransferRequestController,
    // AI
    WorkforceAiInsightsController,
  ],
  providers: [
    // Admin
    HeadcountPlanningService,
    BudgetManagementService,
    OrgDesignStudioService,
    RoleGradeArchitectureService,
    SuccessionPlanningService,
    InternalMobilityTransfersService,
    WorkforceAnalyticsDashboardService,
    // Manager
    TeamHeadcountViewService,
    TeamSuccessionDashboardService,
    TransferMobilityRequestsService,
    TeamCompositionAnalyticsService,
    // Employee
    CareerPathExplorerService,
    InternalJobBoardService,
    MyTransferRequestService,
    // AI
    WorkforceAiInsightsService,
  ],
})
export class WorkforcePlanningModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('workforce-planning', WORKFORCE_PLANNING_SETUP_STEPS);
  }
}
