import { Global, Module } from '@nestjs/common';
import { AiCoreService } from './ai-core.service';

/**
 * Global module exposing AiCoreService to any feature module that hosts a
 * standalone AI feature, without each one re-importing it.
 */
@Global()
@Module({
  providers: [AiCoreService],
  exports: [AiCoreService],
})
export class AiCoreModule {}
