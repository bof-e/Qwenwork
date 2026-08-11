import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { QUEUE_EXPORTS, ExportJobPayload } from '../../common/queue/queue.constants';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly db: TenantPrismaService,
    @InjectQueue(QUEUE_EXPORTS) private readonly exportsQueue: Queue<ExportJobPayload>
  ) {}

  /** POST /dashboards/{id}/export — crée le job puis l'enfile réellement (export.processor.ts). */
  async export(dashboardId: string, userId: string, format: string, config?: Record<string, unknown>) {
    const job = await this.db.client.exportJobs.create({
      data: { entity_type: 'dashboard', entity_id: dashboardId, requested_by_user_id: userId, format, config: config as any },
    });

    await this.exportsQueue.add('export', {
      exportJobId: job.id,
      entityType: 'dashboard',
      entityId: dashboardId,
      format,
    });

    return { export_id: job.id, status: 'PROCESSING' as const };
  }
}
