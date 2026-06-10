import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { DashboardOverviewService } from './dashboard-overview.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, DashboardOverviewService],
})
export class StatsModule {}
