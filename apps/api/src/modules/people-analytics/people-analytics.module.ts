import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { PEOPLE_ANALYTICS_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { ReportBuilderController } from './features/admin/report-builder.controller';
import { HrDashboardsController } from './features/admin/hr-dashboards.controller';
import { WorkforceAnalyticsController } from './features/admin/workforce-analytics.controller';
import { ComplianceAnalyticsController } from './features/admin/compliance-analytics.controller';
import { CustomMetricsController } from './features/admin/custom-metrics.controller';

// Admin services
import { ReportBuilderService } from './features/admin/report-builder.service';
import { HrDashboardsService } from './features/admin/hr-dashboards.service';
import { WorkforceAnalyticsService } from './features/admin/workforce-analytics.service';
import { ComplianceAnalyticsService } from './features/admin/compliance-analytics.service';
import { CustomMetricsService } from './features/admin/custom-metrics.service';

// Manager controllers
import { TeamAnalyticsDashboardController } from './features/manager/team-analytics-dashboard.controller';
import { PerformanceInsightsController } from './features/manager/performance-insights.controller';
import { LeaveAttendanceTrendsController } from './features/manager/leave-attendance-trends.controller';

// Manager services
import { TeamAnalyticsDashboardService } from './features/manager/team-analytics-dashboard.service';
import { PerformanceInsightsService } from './features/manager/performance-insights.service';
import { LeaveAttendanceTrendsService } from './features/manager/leave-attendance-trends.service';

// Employee controllers
import { MyAnalyticsController } from './features/employee/my-analytics.controller';
import { PeerBenchmarksController } from './features/employee/peer-benchmarks.controller';

// Employee services
import { MyAnalyticsService } from './features/employee/my-analytics.service';
import { PeerBenchmarksService } from './features/employee/peer-benchmarks.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    ReportBuilderController,
    HrDashboardsController,
    WorkforceAnalyticsController,
    ComplianceAnalyticsController,
    CustomMetricsController,
    // Manager
    TeamAnalyticsDashboardController,
    PerformanceInsightsController,
    LeaveAttendanceTrendsController,
    // Employee
    MyAnalyticsController,
    PeerBenchmarksController,
  ],
  providers: [
    // Admin
    ReportBuilderService,
    HrDashboardsService,
    WorkforceAnalyticsService,
    ComplianceAnalyticsService,
    CustomMetricsService,
    // Manager
    TeamAnalyticsDashboardService,
    PerformanceInsightsService,
    LeaveAttendanceTrendsService,
    // Employee
    MyAnalyticsService,
    PeerBenchmarksService,
  ],
})
export class PeopleAnalyticsModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('people-analytics', PEOPLE_ANALYTICS_SETUP_STEPS);
  }
}
