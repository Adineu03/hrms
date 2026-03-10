import { Module, type OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { COLD_START_SETUP_STEPS } from './setup/steps.config';
import { ColdStartController } from './cold-start.controller';
import { ColdStartService } from './cold-start.service';
import { LocationsController } from './features/locations/locations.controller';
import { LocationsService } from './features/locations/locations.service';
import { GradesController } from './features/grades/grades.controller';
import { GradesService } from './features/grades/grades.service';
import { SettingsController } from './features/settings/settings.controller';
import { SettingsService } from './features/settings/settings.service';
import { InvitationsController } from './features/invitations/invitations.controller';
import { InvitationsService } from './features/invitations/invitations.service';
import { EmployeesController } from './features/employees/employees.controller';
import { EmployeesService } from './features/employees/employees.service';
import { EmployeeSelfController } from './features/employee-self/employee-self.controller';
import { EmployeeSelfService } from './features/employee-self/employee-self.service';
import { ManagerController } from './features/manager/manager.controller';
import { ManagerService } from './features/manager/manager.service';
import { ColdStartAiInsightsController } from './features/ai/ai-insights.controller';
import { ColdStartAiInsightsService } from './features/ai/ai-insights.service';

@Module({
  imports: [SetupEngineModule, JwtModule.register({})],
  controllers: [
    ColdStartController,
    LocationsController,
    GradesController,
    SettingsController,
    InvitationsController,
    EmployeesController,
    EmployeeSelfController,
    ManagerController,
    ColdStartAiInsightsController,
  ],
  providers: [
    ColdStartService,
    LocationsService,
    GradesService,
    SettingsService,
    InvitationsService,
    EmployeesService,
    EmployeeSelfService,
    ManagerService,
    ColdStartAiInsightsService,
  ],
  exports: [ColdStartService, InvitationsService, EmployeesService],
})
export class ColdStartSetupModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('cold-start-setup', COLD_START_SETUP_STEPS);
  }
}
