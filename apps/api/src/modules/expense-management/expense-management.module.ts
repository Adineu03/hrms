import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { EXPENSE_MANAGEMENT_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { ExpensePolicyConfigurationController } from './features/admin/expense-policy-configuration.controller';
import { ExpenseReportManagementController } from './features/admin/expense-report-management.controller';
import { ExpenseAnalyticsController } from './features/admin/expense-analytics.controller';
import { ExpenseAnomalyController } from './features/admin/expense-anomaly.controller';

// Admin services
import { ExpensePolicyConfigurationService } from './features/admin/expense-policy-configuration.service';
import { ExpenseReportManagementService } from './features/admin/expense-report-management.service';
import { ExpenseAnalyticsService } from './features/admin/expense-analytics.service';
import { ExpenseAnomalyService } from './features/admin/expense-anomaly.service';

// Manager controllers
import { TeamExpenseOverviewController } from './features/manager/team-expense-overview.controller';
import { ExpenseApprovalsController } from './features/manager/expense-approvals.controller';
import { TeamExpenseReportsController } from './features/manager/team-expense-reports.controller';

// Manager services
import { TeamExpenseOverviewService } from './features/manager/team-expense-overview.service';
import { ExpenseApprovalsService } from './features/manager/expense-approvals.service';
import { TeamExpenseReportsService } from './features/manager/team-expense-reports.service';

// Employee controllers
import { MyExpensesController } from './features/employee/my-expenses.controller';
import { ExpenseTrackingController } from './features/employee/expense-tracking.controller';
import { ExpensePoliciesViewController } from './features/employee/expense-policies-view.controller';
import { ReceiptScannerController } from './features/employee/receipt-scanner.controller';

// Employee services
import { MyExpensesService } from './features/employee/my-expenses.service';
import { ExpenseTrackingService } from './features/employee/expense-tracking.service';
import { ExpensePoliciesViewService } from './features/employee/expense-policies-view.service';
import { ReceiptScannerService } from './features/employee/receipt-scanner.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    ExpensePolicyConfigurationController,
    ExpenseReportManagementController,
    ExpenseAnalyticsController,
    ExpenseAnomalyController,
    // Manager
    TeamExpenseOverviewController,
    ExpenseApprovalsController,
    TeamExpenseReportsController,
    // Employee
    MyExpensesController,
    ExpenseTrackingController,
    ExpensePoliciesViewController,
    ReceiptScannerController,
  ],
  providers: [
    // Admin
    ExpensePolicyConfigurationService,
    ExpenseReportManagementService,
    ExpenseAnalyticsService,
    ExpenseAnomalyService,
    // Manager
    TeamExpenseOverviewService,
    ExpenseApprovalsService,
    TeamExpenseReportsService,
    // Employee
    MyExpensesService,
    ExpenseTrackingService,
    ExpensePoliciesViewService,
    ReceiptScannerService,
  ],
})
export class ExpenseManagementModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('expense-management', EXPENSE_MANAGEMENT_SETUP_STEPS);
  }
}
