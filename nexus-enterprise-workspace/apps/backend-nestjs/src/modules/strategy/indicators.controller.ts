import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { CreateIndicatorDto } from './dto/strategy.dto';
import { MinRole } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Strategy')
@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly service: IndicatorsService) {}

  // x-required-role (OpenAPI): Manager+
  @MinRole('manager')
  @Post()
  async create(@Body() dto: CreateIndicatorDto) {
    return this.service.create(dto);
  }

  // x-required-role (OpenAPI): Viewer+ — lecture de indicator_history (append-only, BR-01)
  @Get(':id/history')
  async history(@Param('id') id: string, @Query('period_start') start?: string, @Query('period_end') end?: string) {
    return this.service.getHistory(id, start, end);
  }
}
