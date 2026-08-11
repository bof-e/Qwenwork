import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';

const MAX_CASCADE_DEPTH = 10; // Chapitre 4.4, M3-T02

/**
 * CalculationEngine.recalculateCascade — BR-04.
 *
 * Recalcule un indicateur puis remonte récursivement vers les indicateurs
 * des nœuds parents du cadre logique (Impact <- Outcome <- Output <-
 * Activity <- Input), avec protection anti-cycle par profondeur maximale.
 *
 * SIMPLIFICATION ASSUMÉE : le catalogue exact des formules (Specs Chapitre
 * 4.4) n'était pas disponible lors de cette implémentation. computeValue()
 * couvre SUM/AVERAGE/COUNT/LATEST/MANUAL de façon générique à partir de
 * indicator_values — à raffiner contre le catalogue réel avant mise en
 * production (agrégation pondérée, formules composées, etc.).
 */
@Injectable()
export class CascadeService {
  constructor(private readonly db: TenantPrismaService) {}

  async recalculateCascade(
    indicatorId: string,
    triggeredBy: 'MANUAL' | 'CASCADE' | 'DATA_BATCH_APPROVED',
    organizationId: string,
    dataBatchId?: string,
    depth = 0,
    cascadeSourceIndicatorId?: string
  ): Promise<void> {
    if (depth > MAX_CASCADE_DEPTH) {
      throw new UnprocessableEntityException({
        code: 'CascadeDepthExceededError',
        message: `Profondeur de cascade maximale (${MAX_CASCADE_DEPTH}) dépassée — cycle probable dans le cadre logique.`,
      });
    }

    const indicator = await this.db.client.indicators.findUnique({ where: { id: indicatorId } });
    if (!indicator) return;

    const value = await this.computeValue(indicator.id, indicator.formula_type);
    const lastVersion = await this.db.client.indicatorHistory.findFirst({
      where: { indicator_id: indicator.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    await this.db.client.indicatorHistory.create({
      data: {
        indicator_id: indicator.id,
        version: (lastVersion?.version ?? 0) + 1,
        period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        period_end: new Date(),
        value,
        target_value: indicator.target_value ?? undefined,
        baseline_value: indicator.baseline_value ?? undefined,
        formula_type_snapshot: indicator.formula_type,
        data_source_batch_id: dataBatchId,
        triggered_by: triggeredBy,
        cascade_source_indicator_id: cascadeSourceIndicatorId,
        organization_id: organizationId,
      },
    });

    // Remontée vers le parent du nœud de cadre logique portant cet indicateur.
    const framework = await this.db.client.logicalFrameworks.findUnique({ where: { id: indicator.framework_id } });
    if (!framework?.parent_id) return; // racine Impact atteinte, cascade terminée

    const parentIndicators = await this.db.client.indicators.findMany({ where: { framework_id: framework.parent_id } });
    for (const parentIndicator of parentIndicators) {
      await this.recalculateCascade(parentIndicator.id, 'CASCADE', organizationId, dataBatchId, depth + 1, indicator.id);
    }
  }

  private async computeValue(indicatorId: string, formulaType: string): Promise<number> {
    const values = await this.db.client.indicatorValues.findMany({
      where: { indicator_id: indicatorId },
      orderBy: { period_end: 'desc' },
      take: formulaType === 'LATEST' ? 1 : 100,
    });

    if (values.length === 0) return 0;
    const nums = values.map((v) => Number(v.value));

    switch (formulaType) {
      case 'SUM':
        return nums.reduce((a, b) => a + b, 0);
      case 'AVERAGE':
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case 'COUNT':
        return nums.length;
      case 'LATEST':
      case 'MANUAL':
      default:
        return nums[0];
    }
  }
}
