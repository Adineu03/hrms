import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { PLATFORM_EXPERIENCE_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { NotificationAlertManagementController } from './features/admin/notification-alert-management.controller';
import { PlatformCustomizationController } from './features/admin/platform-customization.controller';
import { SearchNavigationConfigController } from './features/admin/search-navigation-config.controller';
import { SystemAdministrationController } from './features/admin/system-administration.controller';

// Admin services
import { NotificationAlertManagementService } from './features/admin/notification-alert-management.service';
import { PlatformCustomizationService } from './features/admin/platform-customization.service';
import { SearchNavigationConfigService } from './features/admin/search-navigation-config.service';
import { SystemAdministrationService } from './features/admin/system-administration.service';

// Manager controllers
import { TeamNotificationsController } from './features/manager/team-notifications.controller';
import { CustomDashboardsController } from './features/manager/custom-dashboards.controller';
import { QuickActionsController } from './features/manager/quick-actions.controller';

// Manager services
import { TeamNotificationsService } from './features/manager/team-notifications.service';
import { CustomDashboardsService } from './features/manager/custom-dashboards.service';
import { QuickActionsService } from './features/manager/quick-actions.service';

// AI features
import { PlatformExperienceAiController } from './features/ai/ai.controller';
import { PlatformExperienceAiService } from './features/ai/ai.service';

// Employee controllers
import { NotificationCenterController } from './features/employee/notification-center.controller';
import { SelfServicePortalController } from './features/employee/self-service-portal.controller';
import { SearchNavigationController } from './features/employee/search-navigation.controller';
import { MobileAccessibilityController } from './features/employee/mobile-accessibility.controller';

// Employee services
import { NotificationCenterService } from './features/employee/notification-center.service';
import { SelfServicePortalService } from './features/employee/self-service-portal.service';
import { SearchNavigationService } from './features/employee/search-navigation.service';
import { MobileAccessibilityService } from './features/employee/mobile-accessibility.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    NotificationAlertManagementController,
    PlatformCustomizationController,
    SearchNavigationConfigController,
    SystemAdministrationController,
    // Manager
    TeamNotificationsController,
    CustomDashboardsController,
    QuickActionsController,
    // AI features
    PlatformExperienceAiController,
    // Employee
    NotificationCenterController,
    SelfServicePortalController,
    SearchNavigationController,
    MobileAccessibilityController,
  ],
  providers: [
    // Admin
    NotificationAlertManagementService,
    PlatformCustomizationService,
    SearchNavigationConfigService,
    SystemAdministrationService,
    // Manager
    TeamNotificationsService,
    CustomDashboardsService,
    QuickActionsService,
    // AI features
    PlatformExperienceAiService,
    // Employee
    NotificationCenterService,
    SelfServicePortalService,
    SearchNavigationService,
    MobileAccessibilityService,
  ],
})
export class PlatformExperienceModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('platform-experience', PLATFORM_EXPERIENCE_SETUP_STEPS);
  }
}
