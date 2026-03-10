import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { LEARNING_DEVELOPMENT_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { LmsConfigController } from './features/admin/lms-config.controller';
import { LmsConfigService } from './features/admin/lms-config.service';
import { BudgetManagementController } from './features/admin/budget-management.controller';
import { BudgetManagementService } from './features/admin/budget-management.service';
import { TrainingCalendarController } from './features/admin/training-calendar.controller';
import { TrainingCalendarService } from './features/admin/training-calendar.service';
import { ReportingAnalyticsController } from './features/admin/reporting-analytics.controller';
import { ReportingAnalyticsService } from './features/admin/reporting-analytics.service';

// Manager features
import { TeamLearningDashboardController } from './features/manager/team-learning-dashboard.controller';
import { TeamLearningDashboardService } from './features/manager/team-learning-dashboard.service';
import { LearningAssignmentsController } from './features/manager/learning-assignments.controller';
import { LearningAssignmentsService } from './features/manager/learning-assignments.service';
import { DevelopmentPlanningController } from './features/manager/development-planning.controller';
import { DevelopmentPlanningService } from './features/manager/development-planning.service';

// AI features
import { LearningDevelopmentAiController } from './features/ai/ai.controller';
import { LearningDevelopmentAiService } from './features/ai/ai.service';

// Employee features
import { CourseCatalogController } from './features/employee/course-catalog.controller';
import { CourseCatalogService } from './features/employee/course-catalog.service';
import { MyLearningPathController } from './features/employee/my-learning-path.controller';
import { MyLearningPathService } from './features/employee/my-learning-path.service';
import { CertificationTrackerController } from './features/employee/certification-tracker.controller';
import { CertificationTrackerService } from './features/employee/certification-tracker.service';
import { LearningBudgetController } from './features/employee/learning-budget.controller';
import { LearningBudgetService } from './features/employee/learning-budget.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    LmsConfigController,
    BudgetManagementController,
    TrainingCalendarController,
    ReportingAnalyticsController,
    // Manager
    TeamLearningDashboardController,
    LearningAssignmentsController,
    DevelopmentPlanningController,
    // AI features
    LearningDevelopmentAiController,
    // Employee
    CourseCatalogController,
    MyLearningPathController,
    CertificationTrackerController,
    LearningBudgetController,
  ],
  providers: [
    // Admin
    LmsConfigService,
    BudgetManagementService,
    TrainingCalendarService,
    ReportingAnalyticsService,
    // Manager
    TeamLearningDashboardService,
    LearningAssignmentsService,
    DevelopmentPlanningService,
    // AI features
    LearningDevelopmentAiService,
    // Employee
    CourseCatalogService,
    MyLearningPathService,
    CertificationTrackerService,
    LearningBudgetService,
  ],
})
export class LearningDevelopmentModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('learning-development', LEARNING_DEVELOPMENT_SETUP_STEPS);
  }
}
