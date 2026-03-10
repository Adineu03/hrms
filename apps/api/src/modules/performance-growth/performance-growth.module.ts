import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { PERFORMANCE_GROWTH_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { ReviewCycleConfigController } from './features/admin/review-cycle-config.controller';
import { ReviewCycleConfigService } from './features/admin/review-cycle-config.service';
import { GoalFrameworkSetupController } from './features/admin/goal-framework-setup.controller';
import { GoalFrameworkSetupService } from './features/admin/goal-framework-setup.service';
import { CompetencyLibraryController } from './features/admin/competency-library.controller';
import { CompetencyLibraryService } from './features/admin/competency-library.service';
import { PerformanceAnalyticsController } from './features/admin/performance-analytics.controller';
import { PerformanceAnalyticsService } from './features/admin/performance-analytics.service';
import { CalibrationMgmtController } from './features/admin/calibration-mgmt.controller';
import { CalibrationMgmtService } from './features/admin/calibration-mgmt.service';
import { PipMgmtController } from './features/admin/pip-mgmt.controller';
import { PipMgmtService } from './features/admin/pip-mgmt.service';

// Manager features
import { TeamPerformanceDashboardController } from './features/manager/team-performance-dashboard.controller';
import { TeamPerformanceDashboardService } from './features/manager/team-performance-dashboard.service';
import { GoalManagementController } from './features/manager/goal-management.controller';
import { GoalManagementService } from './features/manager/goal-management.service';
import { ReviewFeedbackController } from './features/manager/review-feedback.controller';
import { ReviewFeedbackService } from './features/manager/review-feedback.service';
import { OneOnOneMeetingController } from './features/manager/one-on-one-meeting.controller';
import { OneOnOneMeetingService } from './features/manager/one-on-one-meeting.service';
import { TeamDevelopmentController } from './features/manager/team-development.controller';
import { TeamDevelopmentService } from './features/manager/team-development.service';
import { TalentAssessmentController } from './features/manager/talent-assessment.controller';
import { TalentAssessmentService } from './features/manager/talent-assessment.service';

// Employee features
import { MyGoalsController } from './features/employee/my-goals.controller';
import { MyGoalsService } from './features/employee/my-goals.service';
import { SelfReviewController } from './features/employee/self-review.controller';
import { SelfReviewService } from './features/employee/self-review.service';
import { FeedbackController } from './features/employee/feedback.controller';
import { FeedbackService } from './features/employee/feedback.service';
import { MyReviewsController } from './features/employee/my-reviews.controller';
import { MyReviewsService } from './features/employee/my-reviews.service';
import { DevelopmentPlanController } from './features/employee/development-plan.controller';
import { DevelopmentPlanService } from './features/employee/development-plan.service';
import { CareerGrowthController } from './features/employee/career-growth.controller';
import { CareerGrowthService } from './features/employee/career-growth.service';

// AI features
import { PerformanceGrowthAiController } from './features/ai/ai.controller';
import { PerformanceGrowthAiService } from './features/ai/ai.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    ReviewCycleConfigController,
    GoalFrameworkSetupController,
    CompetencyLibraryController,
    PerformanceAnalyticsController,
    CalibrationMgmtController,
    PipMgmtController,
    // Manager
    TeamPerformanceDashboardController,
    GoalManagementController,
    ReviewFeedbackController,
    OneOnOneMeetingController,
    TeamDevelopmentController,
    TalentAssessmentController,
    // Employee
    MyGoalsController,
    SelfReviewController,
    FeedbackController,
    MyReviewsController,
    DevelopmentPlanController,
    CareerGrowthController,
    // AI
    PerformanceGrowthAiController,
  ],
  providers: [
    // Admin
    ReviewCycleConfigService,
    GoalFrameworkSetupService,
    CompetencyLibraryService,
    PerformanceAnalyticsService,
    CalibrationMgmtService,
    PipMgmtService,
    // Manager
    TeamPerformanceDashboardService,
    GoalManagementService,
    ReviewFeedbackService,
    OneOnOneMeetingService,
    TeamDevelopmentService,
    TalentAssessmentService,
    // Employee
    MyGoalsService,
    SelfReviewService,
    FeedbackService,
    MyReviewsService,
    DevelopmentPlanService,
    CareerGrowthService,
    // AI
    PerformanceGrowthAiService,
  ],
})
export class PerformanceGrowthModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('performance-growth', PERFORMANCE_GROWTH_SETUP_STEPS);
  }
}
