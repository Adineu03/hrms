import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { ENGAGEMENT_CULTURE_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { SurveyPulseManagementController } from './features/admin/survey-pulse-management.controller';
import { CultureValuesSetupController } from './features/admin/culture-values-setup.controller';
import { WellnessProgramManagementController } from './features/admin/wellness-program-management.controller';
import { EngagementAnalyticsController } from './features/admin/engagement-analytics.controller';

// Admin services
import { SurveyPulseManagementService } from './features/admin/survey-pulse-management.service';
import { CultureValuesSetupService } from './features/admin/culture-values-setup.service';
import { WellnessProgramManagementService } from './features/admin/wellness-program-management.service';
import { EngagementAnalyticsService } from './features/admin/engagement-analytics.service';

// Manager controllers
import { TeamEngagementDashboardController } from './features/manager/team-engagement-dashboard.controller';
import { TeamWellnessViewController } from './features/manager/team-wellness-view.controller';
import { FeedbackSuggestionsController } from './features/manager/feedback-suggestions.controller';

// Manager services
import { TeamEngagementDashboardService } from './features/manager/team-engagement-dashboard.service';
import { TeamWellnessViewService } from './features/manager/team-wellness-view.service';
import { FeedbackSuggestionsService } from './features/manager/feedback-suggestions.service';

// AI features
import { EngagementCultureAiController } from './features/ai/ai.controller';
import { EngagementCultureAiService } from './features/ai/ai.service';

// Employee controllers
import { SurveyParticipationController } from './features/employee/survey-participation.controller';
import { SocialCommunityController } from './features/employee/social-community.controller';
import { WellnessPortalController } from './features/employee/wellness-portal.controller';
import { MyEngagementScoreController } from './features/employee/my-engagement-score.controller';

// Employee services
import { SurveyParticipationService } from './features/employee/survey-participation.service';
import { SocialCommunityService } from './features/employee/social-community.service';
import { WellnessPortalService } from './features/employee/wellness-portal.service';
import { MyEngagementScoreService } from './features/employee/my-engagement-score.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    SurveyPulseManagementController,
    CultureValuesSetupController,
    WellnessProgramManagementController,
    EngagementAnalyticsController,
    // Manager
    TeamEngagementDashboardController,
    TeamWellnessViewController,
    FeedbackSuggestionsController,
    // AI features
    EngagementCultureAiController,
    // Employee
    SurveyParticipationController,
    SocialCommunityController,
    WellnessPortalController,
    MyEngagementScoreController,
  ],
  providers: [
    // Admin
    SurveyPulseManagementService,
    CultureValuesSetupService,
    WellnessProgramManagementService,
    EngagementAnalyticsService,
    // Manager
    TeamEngagementDashboardService,
    TeamWellnessViewService,
    FeedbackSuggestionsService,
    // AI features
    EngagementCultureAiService,
    // Employee
    SurveyParticipationService,
    SocialCommunityService,
    WellnessPortalService,
    MyEngagementScoreService,
  ],
})
export class EngagementCultureModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('engagement-culture', ENGAGEMENT_CULTURE_SETUP_STEPS);
  }
}
