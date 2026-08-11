import { ConflictException, Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { CascadeService } from './cascade.service';

@Injectable()
export class DataBatchesWorkflowService {
  constructor(
    private readonly db: TenantPrismaService,
    private readonly cascade: CascadeService
  ) {}

  /** US-02 : le lot doit être CLEANED avant soumission (nettoyage IA, M5). */
  async submit(batchId: string) {
    const batch = await this.db.client.dataBatches.findUnique({ where: { id: batchId } });
    if (batch?.cleaning_status !== 'CLEANED') {
      throw new ConflictException("Le lot n'est pas au statut CLEANED.");
    }
    return this.db.client.dataBatches.update({
      where: { id: batchId },
      data: { cleaning_status: 'SUBMITTED', submitted_at: new Date() },
    });
  }

  /** BR-04 : approuve puis déclenche CalculationEngine.recalculateCascade. */
  async approve(batchId: string, approvedByUserId: string, organizationId: string, comment?: string) {
    const batch = await this.db.client.dataBatches.update({
      where: { id: batchId },
      data: { cleaning_status: 'APPROVED', approved_by_user_id: approvedByUserId, approved_at: new Date() },
    });

    await this.db.client.approvalHistory.create({
      data: {
        data_batch_id: batchId,
        action: 'APPROVE',
        performed_by_user_id: approvedByUserId,
        comment,
        previous_status: 'SUBMITTED',
        new_status: 'APPROVED',
      },
    });

    // Résout le(s) indicateur(s) concerné(s) par ce lot via indicator_values
    // déjà rattachées à data_source_batch_id, puis déclenche la cascade pour
    // chacun (peut y en avoir plusieurs si le lot alimente >1 indicateur).
    const affected = await this.db.client.indicatorValues.findMany({
      where: { data_source_batch_id: batchId },
      select: { indicator_id: true },
      distinct: ['indicator_id'],
    });
    for (const { indicator_id } of affected) {
      await this.cascade.recalculateCascade(indicator_id, 'DATA_BATCH_APPROVED', organizationId, batchId);
    }

    return batch;
  }

  async reject(batchId: string, rejectedByUserId: string, rejectionReason: string) {
    const batch = await this.db.client.dataBatches.update({
      where: { id: batchId },
      data: { cleaning_status: 'REJECTED', rejection_reason: rejectionReason },
    });

    await this.db.client.approvalHistory.create({
      data: {
        data_batch_id: batchId,
        action: 'REJECT',
        performed_by_user_id: rejectedByUserId,
        comment: rejectionReason,
        previous_status: 'SUBMITTED',
        new_status: 'REJECTED',
      },
    });

    return batch;
  }
}
