import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { ATTENDANCE_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { ShiftManagementController } from './features/admin/shift-management.controller';
import { ShiftManagementService } from './features/admin/shift-management.service';
import { AttendancePoliciesController } from './features/admin/attendance-policies.controller';
import { AttendancePoliciesService } from './features/admin/attendance-policies.service';
import { OvertimeConfigController } from './features/admin/overtime-config.controller';
import { OvertimeConfigService } from './features/admin/overtime-config.service';
import { AttendanceReportsController } from './features/admin/attendance-reports.controller';
import { AttendanceReportsService } from './features/admin/attendance-reports.service';
import { AttendanceCorrectionsController } from './features/admin/attendance-corrections.controller';
import { AttendanceCorrectionsService } from './features/admin/attendance-corrections.service';
import { IntegrationSettingsController } from './features/admin/integration-settings.controller';
import { IntegrationSettingsService } from './features/admin/integration-settings.service';

// Manager features
import { TeamDashboardController } from './features/manager/team-dashboard.controller';
import { TeamDashboardService } from './features/manager/team-dashboard.service';
import { ShiftPlanningController } from './features/manager/shift-planning.controller';
import { ShiftPlanningService } from './features/manager/shift-planning.service';
import { OvertimeApprovalController } from './features/manager/overtime-approval.controller';
import { OvertimeApprovalService } from './features/manager/overtime-approval.service';
import { TeamRegularizationController } from './features/manager/team-regularization.controller';
import { TeamRegularizationService } from './features/manager/team-regularization.service';
import { TeamReportsController } from './features/manager/team-reports.controller';
import { TeamReportsService } from './features/manager/team-reports.service';
import { LeaveCorrelationController } from './features/manager/leave-correlation.controller';
import { LeaveCorrelationService } from './features/manager/leave-correlation.service';

// Employee features
import { ClockController } from './features/employee/clock.controller';
import { ClockService } from './features/employee/clock.service';
import { MyAttendanceController } from './features/employee/my-attendance.controller';
import { MyAttendanceService } from './features/employee/my-attendance.service';
import { ShiftViewController } from './features/employee/shift-view.controller';
import { ShiftViewService } from './features/employee/shift-view.service';
import { OvertimeTrackerController } from './features/employee/overtime-tracker.controller';
import { OvertimeTrackerService } from './features/employee/overtime-tracker.service';
import { RegularizationController } from './features/employee/regularization.controller';
import { RegularizationService } from './features/employee/regularization.service';
import { AttendanceInsightsController } from './features/employee/attendance-insights.controller';
import { AttendanceInsightsService } from './features/employee/attendance-insights.service';

// AI features
import { AttendanceAiController } from './features/ai/ai.controller';
import { AttendanceAiService } from './features/ai/ai.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    ShiftManagementController,
    AttendancePoliciesController,
    OvertimeConfigController,
    AttendanceReportsController,
    AttendanceCorrectionsController,
    IntegrationSettingsController,
    // Manager
    TeamDashboardController,
    ShiftPlanningController,
    OvertimeApprovalController,
    TeamRegularizationController,
    TeamReportsController,
    LeaveCorrelationController,
    // Employee
    ClockController,
    MyAttendanceController,
    ShiftViewController,
    OvertimeTrackerController,
    RegularizationController,
    AttendanceInsightsController,
    // AI
    AttendanceAiController,
  ],
  providers: [
    // Admin
    ShiftManagementService,
    AttendancePoliciesService,
    OvertimeConfigService,
    AttendanceReportsService,
    AttendanceCorrectionsService,
    IntegrationSettingsService,
    // Manager
    TeamDashboardService,
    ShiftPlanningService,
    OvertimeApprovalService,
    TeamRegularizationService,
    TeamReportsService,
    LeaveCorrelationService,
    // Employee
    ClockService,
    MyAttendanceService,
    ShiftViewService,
    OvertimeTrackerService,
    RegularizationService,
    AttendanceInsightsService,
    // AI
    AttendanceAiService,
  ],
})
export class AttendanceModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('attendance', ATTENDANCE_SETUP_STEPS);
  }
}
