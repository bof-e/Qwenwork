import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { SyncPushDto, ResolveSyncConflictDto } from './dto/ingestion.dto';

@Injectable()
export class SyncService {
  constructor(private readonly db: TenantPrismaService) {}

  /**
   * Upsert idempotent par client_uuid (Chapitre 14.3). NOTE : le schéma actuel
   * n'a pas de table "forms" distincte — form_id est traité ici comme
   * référençant l'id d'une DataSources (1 formulaire Kobo = 1 source
   * configurée), hypothèse à valider en revue produit si un vrai référentiel
   * de formulaires est introduit plus tard.
   */
  async push(userId: string, dto: SyncPushDto) {
    const accepted: string[] = [];
    const conflicts: unknown[] = [];

    for (const batch of dto.batches) {
      const existing = await this.db.client.syncQueue.findUnique({ where: { client_uuid: batch.client_uuid } });
      if (existing) {
        conflicts.push({ client_uuid: batch.client_uuid, conflict_type: 'DUPLICATE_SUBMISSION', existing_status: existing.status });
        continue;
      }

      const dataSource = await this.db.client.dataSources.findUnique({ where: { id: batch.form_id } });
      if (!dataSource) {
        conflicts.push({ client_uuid: batch.client_uuid, conflict_type: 'UNKNOWN_FORM' });
        continue;
      }

      const dataBatch = await this.db.client.dataBatches.create({
        data: { project_id: dataSource.project_id, raw_payload: batch.payload, submitted_by_user_id: userId, submitted_at: new Date() },
      });

      await this.db.client.syncQueue.create({
        data: {
          client_uuid: batch.client_uuid,
          user_id: userId,
          project_id: dataSource.project_id,
          data_batch_id: dataBatch.id,
          status: 'RECEIVED',
          created_offline_at: new Date(batch.created_offline_at),
        },
      });
      accepted.push(batch.client_uuid);
    }

    return { accepted, conflicts };
  }

  async pull(since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    const forms = await this.db.client.dataSources.findMany({
      where: { updated_at: { gte: sinceDate }, source_type: 'KOBOTOOLBOX' },
    });
    const approvalUpdates = await this.db.client.dataBatches.findMany({
      where: { submitted_at: { gte: sinceDate } },
      select: { id: true, cleaning_status: true, approved_at: true, rejection_reason: true },
    });

    return { forms, approval_status_updates: approvalUpdates, server_time: new Date().toISOString() };
  }

  async resolveConflict(syncQueueId: string, dto: ResolveSyncConflictDto) {
    const conflict = await this.db.client.syncConflicts.findFirst({ where: { sync_queue_id: syncQueueId, resolution: null } });
    if (!conflict) throw new NotFoundException('Conflit introuvable ou déjà résolu.');

    // Chapitre 14.2.3 : les champs sensibles (montants, quantités) ne sont
    // jamais résolus automatiquement — la résolution est toujours un choix
    // humain explicite, journalisée via SYNC_CONFLICT_RESOLVED (audit
    // interceptor global, déjà branché sur ce POST).
    return this.db.client.syncConflicts.update({
      where: { id: conflict.id },
      data: {
        resolution: dto.resolution,
        resolved_payload: dto.merged_payload,
        resolved_at: new Date(),
      },
    });
  }
}
