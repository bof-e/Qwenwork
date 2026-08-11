import { Module } from '@nestjs/common';
import { QueueModule } from '../../common/queue/queue.module';
import { DataSourcesController } from './data-sources.controller';
import { DataSourcesService } from './data-sources.service';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { DataBatchesWebhookController } from './data-batches-webhook.controller';
import { KoboController } from './kobo.controller';

@Module({
  imports: [QueueModule],
  controllers: [DataSourcesController, SyncController, DataBatchesWebhookController, KoboController],
  providers: [DataSourcesService, SyncService, SyncProcessor],
})
export class IngestionModule {}
