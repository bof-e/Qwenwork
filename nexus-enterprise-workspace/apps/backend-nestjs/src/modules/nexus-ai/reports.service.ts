import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { LlmGatewayService } from './llm-gateway.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly db: TenantPrismaService,
    private readonly llm: LlmGatewayService
  ) {}

  /**
   * POST /reports/generate — Chapitre 8.2.1. Agrège indicator_history
   * (versions déjà approuvées, cf. workflow M3) sur la période et fait
   * rédiger une synthèse narrative par Claude (fallback Gemini, §7.2.3).
   * Génération > 20 pages : à traiter en tâche de fond (BullMQ) — non
   * implémenté ici, le prompt actuel reste synchrone.
   */
  async generate(organizationId: string, userId: string, projectId: string, periodStart: string, periodEnd: string, audience: string) {
    const history = await this.db.client.indicatorHistory.findMany({
      where: {
        organization_id: organizationId,
        period_start: { gte: new Date(periodStart) },
        period_end: { lte: new Date(periodEnd) },
      },
      include: { indicator: { select: { name: true, unit: true } } },
      orderBy: { calculated_at: 'desc' },
    });

    const dataSummary = history.map((h) => ({
      indicateur: h.indicator.name,
      valeur: h.value,
      cible: h.target_value,
      unite: h.indicator.unit,
    }));

    const prompt = `Rédige une note de synthèse narrative institutionnelle pour un public "${audience}", à partir de ces indicateurs de suivi-évaluation (période ${periodStart} à ${periodEnd}) :\n${JSON.stringify(dataSummary)}\n\nStructure attendue : synthèse exécutive, progrès par résultat, points d'attention, recommandations.`;

    const { text } = await this.llm.generateWithFallback(prompt, [], {
      organizationId,
      userId,
      endpoint: 'reports/generate',
      primary: 'claude',
    });

    return this.db.client.reports.create({
      data: {
        project_id: projectId,
        organization_id: organizationId,
        name: `Rapport ${audience} — ${periodStart} à ${periodEnd}`,
        report_type: 'NARRATIVE',
        period_start: new Date(periodStart),
        period_end: new Date(periodEnd),
        status: 'GENERATED',
        content: { narrative: text } as any,
        generated_by_user_id: userId,
        generated_at: new Date(),
      },
    });
  }
}
