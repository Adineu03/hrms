import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { MultiTenancyModule } from './shared/multi-tenancy/multi-tenancy.module';
import { AuthModule } from './shared/auth/auth.module';
import { JwtAuthGuard } from './shared/auth/guards/jwt-auth.guard';
import { RolesGuard } from './shared/auth/guards/roles.guard';
import { ModuleRegistryModule } from './shared/module-registry/module-registry.module';
import { SetupEngineModule } from './shared/setup-engine/setup-engine.module';
import { ColdStartSetupModule } from './modules/cold-start-setup/cold-start-setup.module';
import { CoreHRModule } from './modules/core-hr/core-hr.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveManagementModule } from './modules/leave-management/leave-management.module';
import { DailyWorkLoggingModule } from './modules/daily-work-logging/daily-work-logging.module';
import { TalentAcquisitionModule } from './modules/talent-acquisition/talent-acquisition.module';
import { OnboardingOffboardingModule } from './modules/onboarding-offboarding/onboarding-offboarding.module';
import { PerformanceGrowthModule } from './modules/performance-growth/performance-growth.module';
import { TemplateModule } from './shared/templates/template.module';
import { DefaultsModule } from './shared/defaults/defaults.module';
import { DataImportModule } from './shared/data-import/data-import.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule,
    QueueModule,
    AuthModule,
    MultiTenancyModule,
    ModuleRegistryModule,
    SetupEngineModule,
    ColdStartSetupModule,
    CoreHRModule,
    AttendanceModule,
    LeaveManagementModule,
    DailyWorkLoggingModule,
    TalentAcquisitionModule,
    OnboardingOffboardingModule,
    PerformanceGrowthModule,
    TemplateModule,
    DefaultsModule,
    DataImportModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
