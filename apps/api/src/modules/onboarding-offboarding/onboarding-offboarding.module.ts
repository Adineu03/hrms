import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { ONBOARDING_OFFBOARDING_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { OnboardingWorkflowBuilderController } from './features/admin/onboarding-workflow-builder.controller';
import { OnboardingWorkflowBuilderService } from './features/admin/onboarding-workflow-builder.service';
import { OffboardingWorkflowBuilderController } from './features/admin/offboarding-workflow-builder.controller';
import { OffboardingWorkflowBuilderService } from './features/admin/offboarding-workflow-builder.service';
import { DocumentTemplateMgmtController } from './features/admin/document-template-mgmt.controller';
import { DocumentTemplateMgmtService } from './features/admin/document-template-mgmt.service';
import { OnboardingAnalyticsController } from './features/admin/onboarding-analytics.controller';
import { OnboardingAnalyticsService } from './features/admin/onboarding-analytics.service';
import { OffboardingAnalyticsController } from './features/admin/offboarding-analytics.controller';
import { OffboardingAnalyticsService } from './features/admin/offboarding-analytics.service';
import { CompliancePolicyMgmtController } from './features/admin/compliance-policy-mgmt.controller';
import { CompliancePolicyMgmtService } from './features/admin/compliance-policy-mgmt.service';

// Manager features
import { TeamOnboardingController } from './features/manager/team-onboarding.controller';
import { TeamOnboardingService } from './features/manager/team-onboarding.service';
import { TeamOffboardingController } from './features/manager/team-offboarding.controller';
import { TeamOffboardingService } from './features/manager/team-offboarding.service';
import { BuddyAssignmentController } from './features/manager/buddy-assignment.controller';
import { BuddyAssignmentService } from './features/manager/buddy-assignment.service';
import { ProbationMgmtController } from './features/manager/probation-mgmt.controller';
import { ProbationMgmtService } from './features/manager/probation-mgmt.service';
import { KnowledgeTransferController } from './features/manager/knowledge-transfer.controller';
import { KnowledgeTransferService } from './features/manager/knowledge-transfer.service';
import { ExitInterviewMgmtController } from './features/manager/exit-interview-mgmt.controller';
import { ExitInterviewMgmtService } from './features/manager/exit-interview-mgmt.service';

// Employee features
import { MyOnboardingController } from './features/employee/my-onboarding.controller';
import { MyOnboardingService } from './features/employee/my-onboarding.service';
import { DocumentSubmissionController } from './features/employee/document-submission.controller';
import { DocumentSubmissionService } from './features/employee/document-submission.service';
import { OrientationTrainingController } from './features/employee/orientation-training.controller';
import { OrientationTrainingService } from './features/employee/orientation-training.service';
import { MyExitProcessController } from './features/employee/my-exit-process.controller';
import { MyExitProcessService } from './features/employee/my-exit-process.service';
import { HandoverMgmtController } from './features/employee/handover-mgmt.controller';
import { HandoverMgmtService } from './features/employee/handover-mgmt.service';
import { PostJoiningSupportController } from './features/employee/post-joining-support.controller';
import { PostJoiningSupportService } from './features/employee/post-joining-support.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    OnboardingWorkflowBuilderController,
    OffboardingWorkflowBuilderController,
    DocumentTemplateMgmtController,
    OnboardingAnalyticsController,
    OffboardingAnalyticsController,
    CompliancePolicyMgmtController,
    // Manager
    TeamOnboardingController,
    TeamOffboardingController,
    BuddyAssignmentController,
    ProbationMgmtController,
    KnowledgeTransferController,
    ExitInterviewMgmtController,
    // Employee
    MyOnboardingController,
    DocumentSubmissionController,
    OrientationTrainingController,
    MyExitProcessController,
    HandoverMgmtController,
    PostJoiningSupportController,
  ],
  providers: [
    // Admin
    OnboardingWorkflowBuilderService,
    OffboardingWorkflowBuilderService,
    DocumentTemplateMgmtService,
    OnboardingAnalyticsService,
    OffboardingAnalyticsService,
    CompliancePolicyMgmtService,
    // Manager
    TeamOnboardingService,
    TeamOffboardingService,
    BuddyAssignmentService,
    ProbationMgmtService,
    KnowledgeTransferService,
    ExitInterviewMgmtService,
    // Employee
    MyOnboardingService,
    DocumentSubmissionService,
    OrientationTrainingService,
    MyExitProcessService,
    HandoverMgmtService,
    PostJoiningSupportService,
  ],
})
export class OnboardingOffboardingModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('onboarding-offboarding', ONBOARDING_OFFBOARDING_SETUP_STEPS);
  }
}
