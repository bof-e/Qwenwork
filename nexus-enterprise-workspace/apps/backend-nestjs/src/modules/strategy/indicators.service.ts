import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { CreateIndicatorDto } from './dto/strategy.dto';

@Injectable()
export class IndicatorsService {
  constructor(private readonly db: TenantPrismaService) {}

  async create(dto: CreateIndicatorDto) {
    return this.db.client.indicators.create({ data: dto });
  }

  async getHistory(indicatorId: string, periodStart?: string, periodEnd?: string) {
    return this.db.client.indicatorHistory.findMany({
      where: {
        indicator_id: indicatorId,
        ...(periodStart ? { period_start: { gte: new Date(periodStart) } } : {}),
        ...(periodEnd ? { period_end: { lte: new Date(periodEnd) } } : {}),
      },
      orderBy: { calculated_at: 'desc' },
    });
  }
}
