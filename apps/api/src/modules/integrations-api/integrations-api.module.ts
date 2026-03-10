import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { INTEGRATIONS_API_SETUP_STEPS } from './setup/steps.config';

// Admin controllers
import { IntegrationMarketplaceController } from './features/admin/integration-marketplace.controller';
import { ApiKeyManagementController } from './features/admin/api-key-management.controller';
import { WebhookConfigurationController } from './features/admin/webhook-configuration.controller';
import { OauthAppRegistryController } from './features/admin/oauth-app-registry.controller';
import { DataSyncController } from './features/admin/data-sync.controller';
import { ApiUsageAnalyticsController } from './features/admin/api-usage-analytics.controller';

// Admin services
import { IntegrationMarketplaceService } from './features/admin/integration-marketplace.service';
import { ApiKeyManagementService } from './features/admin/api-key-management.service';
import { WebhookConfigurationService } from './features/admin/webhook-configuration.service';
import { OauthAppRegistryService } from './features/admin/oauth-app-registry.service';
import { DataSyncService } from './features/admin/data-sync.service';
import { ApiUsageAnalyticsService } from './features/admin/api-usage-analytics.service';

// Manager controllers
import { TeamIntegrationStatusController } from './features/manager/team-integration-status.controller';
import { DataExportTeamController } from './features/manager/data-export-team.controller';

// Manager services
import { TeamIntegrationStatusService } from './features/manager/team-integration-status.service';
import { DataExportTeamService } from './features/manager/data-export-team.service';

// Employee controllers
import { ConnectedAppsController } from './features/employee/connected-apps.controller';
import { MyDataExportController } from './features/employee/my-data-export.controller';

// Employee services
import { ConnectedAppsService } from './features/employee/connected-apps.service';
import { MyDataExportService } from './features/employee/my-data-export.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [
    // Admin
    IntegrationMarketplaceController,
    ApiKeyManagementController,
    WebhookConfigurationController,
    OauthAppRegistryController,
    DataSyncController,
    ApiUsageAnalyticsController,
    // Manager
    TeamIntegrationStatusController,
    DataExportTeamController,
    // Employee
    ConnectedAppsController,
    MyDataExportController,
  ],
  providers: [
    // Admin
    IntegrationMarketplaceService,
    ApiKeyManagementService,
    WebhookConfigurationService,
    OauthAppRegistryService,
    DataSyncService,
    ApiUsageAnalyticsService,
    // Manager
    TeamIntegrationStatusService,
    DataExportTeamService,
    // Employee
    ConnectedAppsService,
    MyDataExportService,
  ],
})
export class IntegrationsApiModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('integrations-api', INTEGRATIONS_API_SETUP_STEPS);
  }
}
