import { Module } from '@nestjs/common';
import { QueueModule } from '../../common/queue/queue.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [QueueModule],
  controllers: [DashboardsController, SharesController],
  providers: [DashboardsService, SharesService, ExportProcessor],
})
export class DecisionPortalModule {}
