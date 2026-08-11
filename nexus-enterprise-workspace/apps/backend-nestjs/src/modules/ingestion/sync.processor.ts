import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUE_DATA_INGESTION, SyncJobPayload } from '../../common/queue/queue.constants';

/**
 * Worker de synchronisation (Chapitre 3.3, Module M2). Consomme la file
 * "data-ingestion" — chaque échec relance automatiquement (3 tentatives,
 * backoff exponentiel, configuré à l'enfilage dans data-sources.service.ts).
 *
 * Seul KoboToolbox est réellement implémenté (API REST simple, cohérent
 * avec KOBOTOOLBOX_API_KEY déjà présent en .env). Les autres connecteurs
 * (SharePoint, Google Drive, S3, Stata/SPSS) restent des stubs explicites —
 * chacun nécessite une intégration spécifique (Graph API, OAuth Google,
 * SDK AWS, microservice Python pyreadstat pour Stata/SPSS).
 */
@Processor(QUEUE_DATA_INGESTION)
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<SyncJobPayload>): Promise<void> {
    const { syncJobId, dataSourceId } = job.data;
    await this.prisma.syncJobs.update({ where: { id: syncJobId }, data: { status: 'RUNNING', started_at: new Date() } });

    try {
      const source = await this.prisma.dataSources.findUniqueOrThrow({ where: { id: dataSourceId } });
      const rows = await this.fetchFromConnector(source.source_type, source.configuration as Record<string, unknown>);

      let batchCount = 0;
      for (const row of rows) {
        await this.prisma.dataBatches.create({
          data: { project_id: source.project_id, raw_payload: row as any, sync_job_id: syncJobId },
        });
        batchCount++;
      }

      await this.prisma.syncJobs.update({
        where: { id: syncJobId },
        data: { status: 'COMPLETED', completed_at: new Date(), rows_processed: batchCount },
      });
      await this.prisma.dataSources.update({ where: { id: dataSourceId }, data: { last_synced_at: new Date() } });
    } catch (err) {
      this.logger.error(`Échec sync ${syncJobId} (${dataSourceId}) :`, err);
      await this.prisma.syncJobs.update({
        where: { id: syncJobId },
        data: { status: 'FAILED', error_message: err instanceof Error ? err.message : String(err) },
      });
      throw err; // laisse BullMQ gérer la relance (attempts/backoff)
    }
  }

  private async fetchFromConnector(sourceType: string, configuration: Record<string, unknown>): Promise<unknown[]> {
    switch (sourceType) {
      case 'kobo':
        return this.fetchFromKobo(configuration);
      default:
        this.logger.warn(`Connecteur "${sourceType}" non implémenté — aucune donnée synchronisée.`);
        return [];
    }
  }

  private async fetchFromKobo(configuration: Record<string, unknown>): Promise<unknown[]> {
    // Cohérent avec kobo.controller.ts : clé par source si configurée, sinon
    // repli sur la variable d'environnement globale (mono-tenant).
    const apiKey = (configuration.api_key as string | undefined) ?? process.env.KOBOTOOLBOX_API_KEY;
    const assetUid = configuration.asset_uid as string;
    if (!apiKey || !assetUid) throw new Error('Clé API Kobo ou asset_uid manquant.');

    const res = await fetch(`https://kf.kobotoolbox.org/api/v2/assets/${assetUid}/data/`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Kobo API a répondu ${res.status}`);
    const body = await res.json();
    return body.results ?? [];
  }
}
