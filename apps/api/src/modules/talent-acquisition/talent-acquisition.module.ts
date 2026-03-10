import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { TALENT_ACQUISITION_SETUP_STEPS } from './setup/steps.config';

// Admin features
import { JobRequisitionMgmtController } from './features/admin/job-requisition-mgmt.controller';
import { JobRequisitionMgmtService } from './features/admin/job-requisition-mgmt.service';
import { JobPostingController } from './features/admin/job-posting.controller';
import { JobPostingService } from './features/admin/job-posting.service';
import { PipelineConfigController } from './features/admin/pipeline-config.controller';
import { PipelineConfigService } from './features/admin/pipeline-config.service';
import { CandidateDatabaseController } from './features/admin/candidate-database.controller';
import { CandidateDatabaseService } from './features/admin/candidate-database.service';
import { RecruitmentReportsController } from './features/admin/recruitment-reports.controller';
import { RecruitmentReportsService } from './features/admin/recruitment-reports.service';
import { OfferManagementController } from './features/admin/offer-management.controller';
import { OfferManagementService } from './features/admin/offer-management.service';

// Manager features
import { MyRequisitionsController } from './features/manager/my-requisitions.controller';
import { MyRequisitionsService } from './features/manager/my-requisitions.service';
import { InterviewMgmtController } from './features/manager/interview-mgmt.controller';
import { InterviewMgmtService } from './features/manager/interview-mgmt.service';
import { CandidateReviewController } from './features/manager/candidate-review.controller';
import { CandidateReviewService } from './features/manager/candidate-review.service';
import { TeamHiringReportsController } from './features/manager/team-hiring-reports.controller';
import { TeamHiringReportsService } from './features/manager/team-hiring-reports.service';
import { ReferralMgmtController } from './features/manager/referral-mgmt.controller';
import { ReferralMgmtService } from './features/manager/referral-mgmt.service';
import { OfferApprovalController } from './features/manager/offer-approval.controller';
import { OfferApprovalService } from './features/manager/offer-approval.service';

// AI features
import { TalentAcquisitionAiController } from './features/ai/ai.controller';
import { TalentAcquisitionAiService } from './features/ai/ai.service';

// Employee features
import { InternalJobBoardController } from './features/employee/internal-job-board.controller';
import { InternalJobBoardService } from './features/employee/internal-job-board.service';
import { EmployeeReferralController } from './features/employee/employee-referral.controller';
import { EmployeeReferralService } from './features/employee/employee-referral.service';
import { MyApplicationsController } from './features/employee/my-applications.controller';
import { MyApplicationsService } from './features/employee/my-applications.service';
import { InterviewScheduleController } from './features/employee/interview-schedule.controller';
import { InterviewScheduleService } from './features/employee/interview-schedule.service';
import { CareerProfileController } from './features/employee/career-profile.controller';
import { CareerProfileService } from './features/employee/career-profile.service';
import { OfferJoiningController } from './features/employee/offer-joining.controller';
import { OfferJoiningService } from './features/employee/offer-joining.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin (6 features)
    JobRequisitionMgmtController,
    JobPostingController,
    PipelineConfigController,
    CandidateDatabaseController,
    RecruitmentReportsController,
    OfferManagementController,
    // Manager (6 features)
    MyRequisitionsController,
    InterviewMgmtController,
    CandidateReviewController,
    TeamHiringReportsController,
    ReferralMgmtController,
    OfferApprovalController,
    // AI features
    TalentAcquisitionAiController,
    // Employee (6 features)
    InternalJobBoardController,
    EmployeeReferralController,
    MyApplicationsController,
    InterviewScheduleController,
    CareerProfileController,
    OfferJoiningController,
  ],
  providers: [
    // Admin (6 features)
    JobRequisitionMgmtService,
    JobPostingService,
    PipelineConfigService,
    CandidateDatabaseService,
    RecruitmentReportsService,
    OfferManagementService,
    // Manager (6 features)
    MyRequisitionsService,
    InterviewMgmtService,
    CandidateReviewService,
    TeamHiringReportsService,
    ReferralMgmtService,
    OfferApprovalService,
    // AI features
    TalentAcquisitionAiService,
    // Employee (6 features)
    InternalJobBoardService,
    EmployeeReferralService,
    MyApplicationsService,
    InterviewScheduleService,
    CareerProfileService,
    OfferJoiningService,
  ],
})
export class TalentAcquisitionModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('talent-acquisition', TALENT_ACQUISITION_SETUP_STEPS);
  }
}
