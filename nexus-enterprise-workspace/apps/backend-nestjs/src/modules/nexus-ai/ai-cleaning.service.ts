import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { LlmGatewayService } from './llm-gateway.service';

@Injectable()
export class AiCleaningService {
  constructor(
    private readonly db: TenantPrismaService,
    private readonly llm: LlmGatewayService
  ) {}

  /** POST /data-batches/{id}/clean — détection d'anomalies + proposition de correction. */
  async clean(batchId: string, organizationId: string, userId: string) {
    const batch = await this.db.client.dataBatches.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Lot introuvable.');

    const prompt = `Analyse ce jeu de données terrain et détecte les valeurs aberrantes (erreurs de saisie, unités incohérentes, doublons). Pour chaque anomalie, propose une valeur corrigée et une justification courte. Réponds en JSON strict : { "anomalies": [{ "field": string, "raw_value": any, "proposed_value": any, "confidence": number, "explanation": string }] }.\n\nDonnées : ${JSON.stringify(batch.raw_payload)}`;

    // Le payload terrain peut contenir des noms de site/personne : anonymisés
    // avant l'appel externe (BR-03). Liste simplifiée — à étendre avec une
    // vraie détection d'entités nommées avant mise en production.
    const sensitiveValues = this.extractSensitiveStrings(batch.raw_payload);

    const { text, providerUsed } = await this.llm.generateWithFallback(prompt, sensitiveValues, {
      organizationId,
      userId,
      endpoint: 'data-batches/clean',
    });

    let suggestions: unknown;
    try {
      suggestions = JSON.parse(text);
    } catch {
      suggestions = { raw_response: text };
    }

    await this.db.client.aiCleaningJobs.create({
      data: {
        data_batch_id: batchId,
        model_used: providerUsed,
        input_data: batch.raw_payload as any,
        output_data: suggestions as any,
        suggestions: suggestions as any,
        status: 'COMPLETED',
        completed_at: new Date(),
      },
    });

    return this.db.client.dataBatches.update({
      where: { id: batchId },
      data: { cleaning_status: 'CLEANED', cleaning_suggestions: suggestions as any },
    });
  }

  private extractSensitiveStrings(payload: unknown): string[] {
    if (typeof payload !== 'object' || !payload) return [];
    return Object.entries(payload as Record<string, unknown>)
      .filter(([key]) => /site|nom|name|organization/i.test(key))
      .map(([, value]) => String(value));
  }
}
