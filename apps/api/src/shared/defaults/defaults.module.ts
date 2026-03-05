import { Module } from '@nestjs/common';
import { DefaultsController } from './defaults.controller';
import { DefaultsService } from './defaults.service';

@Module({
  controllers: [DefaultsController],
  providers: [DefaultsService],
  exports: [DefaultsService],
})
export class DefaultsModule {}
