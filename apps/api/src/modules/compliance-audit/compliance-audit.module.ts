import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { COMPLIANCE_AUDIT_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { PolicyManagementController } from './features/admin/policy-management.controller';
import { AuditTrailLoggingController } from './features/admin/audit-trail-logging.controller';
import { DataPrivacyGdprController } from './features/admin/data-privacy-gdpr.controller';
import { RegulatoryComplianceController } from './features/admin/regulatory-compliance.controller';
import { DocumentRetentionController } from './features/admin/document-retention.controller';
import { EthicsWhistleblowerAdminController } from './features/admin/ethics-whistleblower-admin.controller';
import { ComplianceReportingController } from './features/admin/compliance-reporting.controller';

// Admin services
import { PolicyManagementService } from './features/admin/policy-management.service';
import { AuditTrailLoggingService } from './features/admin/audit-trail-logging.service';
import { DataPrivacyGdprService } from './features/admin/data-privacy-gdpr.service';
import { RegulatoryComplianceService } from './features/admin/regulatory-compliance.service';
import { DocumentRetentionService } from './features/admin/document-retention.service';
import { EthicsWhistleblowerAdminService } from './features/admin/ethics-whistleblower-admin.service';
import { ComplianceReportingService } from './features/admin/compliance-reporting.service';

// Manager controllers
import { TeamComplianceDashboardController } from './features/manager/team-compliance-dashboard.controller';
import { PolicyViolationTrackingController } from './features/manager/policy-violation-tracking.controller';
import { AuditSupportController } from './features/manager/audit-support.controller';
import { LaborLawComplianceController } from './features/manager/labor-law-compliance.controller';

// Manager services
import { TeamComplianceDashboardService } from './features/manager/team-compliance-dashboard.service';
import { PolicyViolationTrackingService } from './features/manager/policy-violation-tracking.service';
import { AuditSupportService } from './features/manager/audit-support.service';
import { LaborLawComplianceService } from './features/manager/labor-law-compliance.service';

// Employee controllers
import { PolicyAcknowledgmentController } from './features/employee/policy-acknowledgment.controller';
import { MandatoryTrainingTrackerController } from './features/employee/mandatory-training-tracker.controller';
import { WhistleblowerEthicsPortalController } from './features/employee/whistleblower-ethics-portal.controller';
import { DataPrivacyControlsController } from './features/employee/data-privacy-controls.controller';

// Employee services
import { PolicyAcknowledgmentService } from './features/employee/policy-acknowledgment.service';
import { MandatoryTrainingTrackerService } from './features/employee/mandatory-training-tracker.service';
import { WhistleblowerEthicsPortalService } from './features/employee/whistleblower-ethics-portal.service';
import { DataPrivacyControlsService } from './features/employee/data-privacy-controls.service';

// AI
import { ComplianceAiInsightsController } from './features/ai/ai-insights.controller';
import { ComplianceAiInsightsService } from './features/ai/ai-insights.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    PolicyManagementController,
    AuditTrailLoggingController,
    DataPrivacyGdprController,
    RegulatoryComplianceController,
    DocumentRetentionController,
    EthicsWhistleblowerAdminController,
    ComplianceReportingController,
    // Manager
    TeamComplianceDashboardController,
    PolicyViolationTrackingController,
    AuditSupportController,
    LaborLawComplianceController,
    // Employee
    PolicyAcknowledgmentController,
    MandatoryTrainingTrackerController,
    WhistleblowerEthicsPortalController,
    DataPrivacyControlsController,
    // AI
    ComplianceAiInsightsController,
  ],
  providers: [
    // Admin
    PolicyManagementService,
    AuditTrailLoggingService,
    DataPrivacyGdprService,
    RegulatoryComplianceService,
    DocumentRetentionService,
    EthicsWhistleblowerAdminService,
    ComplianceReportingService,
    // Manager
    TeamComplianceDashboardService,
    PolicyViolationTrackingService,
    AuditSupportService,
    LaborLawComplianceService,
    // Employee
    PolicyAcknowledgmentService,
    MandatoryTrainingTrackerService,
    WhistleblowerEthicsPortalService,
    DataPrivacyControlsService,
    // AI
    ComplianceAiInsightsService,
  ],
})
export class ComplianceAuditModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('compliance-audit', COMPLIANCE_AUDIT_SETUP_STEPS);
  }
}
