import { Module, type OnModuleInit } from '@nestjs/common';
import { SetupEngineModule } from '../../shared/setup-engine/setup-engine.module';
import { SetupStepRegistry } from '../../shared/setup-engine/setup-step.registry';
import { COLD_START_SETUP_STEPS } from './setup/steps.config';
import { ColdStartController } from './cold-start.controller';
import { ColdStartService } from './cold-start.service';

@Module({
  imports: [SetupEngineModule],
  controllers: [ColdStartController],
  providers: [ColdStartService],
  exports: [ColdStartService],
})
export class ColdStartSetupModule implements OnModuleInit {
  constructor(private readonly stepRegistry: SetupStepRegistry) {}

  onModuleInit() {
    this.stepRegistry.register('cold-start-setup', COLD_START_SETUP_STEPS);
  }
}
