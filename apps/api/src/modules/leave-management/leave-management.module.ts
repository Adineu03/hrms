import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { LEAVE_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { LeavePolicyConfigController } from './features/admin/leave-policy-config.controller';
import { LeavePolicyConfigService } from './features/admin/leave-policy-config.service';
import { LeaveApprovalWorkflowsController } from './features/admin/leave-approval-workflows.controller';
import { LeaveApprovalWorkflowsService } from './features/admin/leave-approval-workflows.service';
import { LeaveBalanceMgmtController } from './features/admin/leave-balance-mgmt.controller';
import { LeaveBalanceMgmtService } from './features/admin/leave-balance-mgmt.service';
import { HolidayCalendarMgmtController } from './features/admin/holiday-calendar-mgmt.controller';
import { HolidayCalendarMgmtService } from './features/admin/holiday-calendar-mgmt.service';
import { LeaveReportsController } from './features/admin/leave-reports.controller';
import { LeaveReportsService } from './features/admin/leave-reports.service';
import { CompoffRulesController } from './features/admin/compoff-rules.controller';
import { CompoffRulesService } from './features/admin/compoff-rules.service';

// Manager features
import { TeamLeaveCalendarController } from './features/manager/team-leave-calendar.controller';
import { TeamLeaveCalendarService } from './features/manager/team-leave-calendar.service';
import { LeaveApprovalQueueController } from './features/manager/leave-approval-queue.controller';
import { LeaveApprovalQueueService } from './features/manager/leave-approval-queue.service';
import { TeamLeaveBalanceController } from './features/manager/team-leave-balance.controller';
import { TeamLeaveBalanceService } from './features/manager/team-leave-balance.service';
import { LeavePlanningController } from './features/manager/leave-planning.controller';
import { LeavePlanningService } from './features/manager/leave-planning.service';
import { LeaveReportsManagerController } from './features/manager/leave-reports-manager.controller';
import { LeaveReportsManagerService } from './features/manager/leave-reports-manager.service';
import { DelegationMgmtController } from './features/manager/delegation-mgmt.controller';
import { DelegationMgmtService } from './features/manager/delegation-mgmt.service';

// Employee features
import { ApplyLeaveController } from './features/employee/apply-leave.controller';
import { ApplyLeaveService } from './features/employee/apply-leave.service';
import { LeaveBalanceController } from './features/employee/leave-balance.controller';
import { LeaveBalanceService } from './features/employee/leave-balance.service';
import { LeaveHistoryController } from './features/employee/leave-history.controller';
import { LeaveHistoryService } from './features/employee/leave-history.service';
import { LeaveCalendarController } from './features/employee/leave-calendar.controller';
import { LeaveCalendarService } from './features/employee/leave-calendar.service';
import { CompoffMgmtController } from './features/employee/compoff-mgmt.controller';
import { CompoffMgmtService } from './features/employee/compoff-mgmt.service';
import { LeaveInsightsController } from './features/employee/leave-insights.controller';
import { LeaveInsightsService } from './features/employee/leave-insights.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    LeavePolicyConfigController,
    LeaveApprovalWorkflowsController,
    LeaveBalanceMgmtController,
    HolidayCalendarMgmtController,
    LeaveReportsController,
    CompoffRulesController,
    // Manager
    TeamLeaveCalendarController,
    LeaveApprovalQueueController,
    TeamLeaveBalanceController,
    LeavePlanningController,
    LeaveReportsManagerController,
    DelegationMgmtController,
    // Employee
    ApplyLeaveController,
    LeaveBalanceController,
    LeaveHistoryController,
    LeaveCalendarController,
    CompoffMgmtController,
    LeaveInsightsController,
  ],
  providers: [
    // Admin
    LeavePolicyConfigService,
    LeaveApprovalWorkflowsService,
    LeaveBalanceMgmtService,
    HolidayCalendarMgmtService,
    LeaveReportsService,
    CompoffRulesService,
    // Manager
    TeamLeaveCalendarService,
    LeaveApprovalQueueService,
    TeamLeaveBalanceService,
    LeavePlanningService,
    LeaveReportsManagerService,
    DelegationMgmtService,
    // Employee
    ApplyLeaveService,
    LeaveBalanceService,
    LeaveHistoryService,
    LeaveCalendarService,
    CompoffMgmtService,
    LeaveInsightsService,
  ],
})
export class LeaveManagementModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('leave-management', LEAVE_SETUP_STEPS);
  }
}
