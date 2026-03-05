import { Module } from '@nestjs/common';
import { SetupEngineController } from './setup-engine.controller';
import { SetupEngineService } from './setup-engine.service';
import { SetupStepRegistry } from './setup-step.registry';

@Module({
  controllers: [SetupEngineController],
  providers: [SetupEngineService, SetupStepRegistry],
  exports: [SetupEngineService, SetupStepRegistry],
})
export class SetupEngineModule {}
