import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { QUEUE_DATA_INGESTION, SyncJobPayload } from '../../common/queue/queue.constants';

@Injectable()
export class DataSourcesService {
  constructor(
    private readonly db: TenantPrismaService,
    @InjectQueue(QUEUE_DATA_INGESTION) private readonly ingestionQueue: Queue<SyncJobPayload>
  ) {}

  async create(orgId: string, userId: string, projectId: string, sourceType: string, configuration: Record<string, unknown>) {
    return this.db.client.dataSources.create({
      data: {
        organization_id: orgId,
        project_id: projectId,
        created_by_user_id: userId,
        source_type: sourceType,
        name: (configuration.name as string) ?? `${sourceType} — ${new Date().toISOString().slice(0, 10)}`,
        configuration: configuration as any,
      },
    });
  }

  /** Crée le SyncJob (Chapitre 3.3) ET l'enfile réellement sur BullMQ — le
   * worker (sync.processor.ts) le consomme de façon asynchrone. */
  async triggerSync(dataSourceId: string) {
    const source = await this.db.client.dataSources.findUnique({ where: { id: dataSourceId } });
    if (!source) throw new NotFoundException('Source de données introuvable.');

    const job = await this.db.client.syncJobs.create({
      data: { data_source_id: dataSourceId, status: 'PENDING' },
    });

    await this.ingestionQueue.add(
      'sync',
      { syncJobId: job.id, dataSourceId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    return { job_id: job.id, status: 'PENDING' as const };
  }
}
