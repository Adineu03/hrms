import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { DAILY_WORK_LOGGING_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { TimesheetPolicyConfigController } from './features/admin/timesheet-policy-config.controller';
import { TimesheetPolicyConfigService } from './features/admin/timesheet-policy-config.service';
import { ProjectConfigController } from './features/admin/project-config.controller';
import { ProjectConfigService } from './features/admin/project-config.service';
import { ApprovalWorkflowsController } from './features/admin/approval-workflows.controller';
import { ApprovalWorkflowsService } from './features/admin/approval-workflows.service';
import { TimesheetReportsController } from './features/admin/timesheet-reports.controller';
import { TimesheetReportsService } from './features/admin/timesheet-reports.service';
import { TimesheetCorrectionsController } from './features/admin/timesheet-corrections.controller';
import { TimesheetCorrectionsService } from './features/admin/timesheet-corrections.service';
import { IntegrationExportController } from './features/admin/integration-export.controller';
import { IntegrationExportService } from './features/admin/integration-export.service';

// Manager features
import { TeamDashboardController } from './features/manager/team-dashboard.controller';
import { TeamDashboardService } from './features/manager/team-dashboard.service';
import { ApprovalQueueController } from './features/manager/approval-queue.controller';
import { ApprovalQueueService } from './features/manager/approval-queue.service';
import { ProjectTrackingController } from './features/manager/project-tracking.controller';
import { ProjectTrackingService } from './features/manager/project-tracking.service';
import { TeamProductivityController } from './features/manager/team-productivity.controller';
import { TeamProductivityService } from './features/manager/team-productivity.service';
import { ResourceAllocationController } from './features/manager/resource-allocation.controller';
import { ResourceAllocationService } from './features/manager/resource-allocation.service';
import { TimesheetComplianceController } from './features/manager/timesheet-compliance.controller';
import { TimesheetComplianceService } from './features/manager/timesheet-compliance.service';

// Employee features
import { DailyTimesheetController } from './features/employee/daily-timesheet.controller';
import { DailyTimesheetService } from './features/employee/daily-timesheet.service';
import { WeeklyTimesheetController } from './features/employee/weekly-timesheet.controller';
import { WeeklyTimesheetService } from './features/employee/weekly-timesheet.service';
import { ActivityLogController } from './features/employee/activity-log.controller';
import { ActivityLogService } from './features/employee/activity-log.service';
import { TimesheetHistoryController } from './features/employee/timesheet-history.controller';
import { TimesheetHistoryService } from './features/employee/timesheet-history.service';
import { ProductivityDashboardController } from './features/employee/productivity-dashboard.controller';
import { ProductivityDashboardService } from './features/employee/productivity-dashboard.service';
import { TimerController } from './features/employee/timer.controller';
import { TimerService } from './features/employee/timer.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin (6 features)
    TimesheetPolicyConfigController,
    ProjectConfigController,
    ApprovalWorkflowsController,
    TimesheetReportsController,
    TimesheetCorrectionsController,
    IntegrationExportController,
    // Manager (6 features)
    TeamDashboardController,
    ApprovalQueueController,
    ProjectTrackingController,
    TeamProductivityController,
    ResourceAllocationController,
    TimesheetComplianceController,
    // Employee (6 features)
    DailyTimesheetController,
    WeeklyTimesheetController,
    ActivityLogController,
    TimesheetHistoryController,
    ProductivityDashboardController,
    TimerController,
  ],
  providers: [
    // Admin (6 features)
    TimesheetPolicyConfigService,
    ProjectConfigService,
    ApprovalWorkflowsService,
    TimesheetReportsService,
    TimesheetCorrectionsService,
    IntegrationExportService,
    // Manager (6 features)
    TeamDashboardService,
    ApprovalQueueService,
    ProjectTrackingService,
    TeamProductivityService,
    ResourceAllocationService,
    TimesheetComplianceService,
    // Employee (6 features)
    DailyTimesheetService,
    WeeklyTimesheetService,
    ActivityLogService,
    TimesheetHistoryService,
    ProductivityDashboardService,
    TimerService,
  ],
})
export class DailyWorkLoggingModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('daily-work-logging', DAILY_WORK_LOGGING_SETUP_STEPS);
  }
}
