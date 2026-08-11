import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsDateString } from 'class-validator';
import { Request } from 'express';
import { DashboardsService } from './dashboards.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

class ExportDashboardDto {
  @IsIn(['PDF', 'EXCEL', 'CSV', 'PPTX', 'PNG'])
  format!: string;

  @IsOptional()
  @IsDateString()
  period_start?: string;

  @IsOptional()
  @IsDateString()
  period_end?: string;

  @IsOptional()
  @IsBoolean()
  include_branding?: boolean;
}

@ApiTags('Decision Portal')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly service: DashboardsService) {}

  // x-required-role (OpenAPI): Viewer+ (correctif audit du 4 juillet 2026, Specs §11.3)
  @Post(':id/export')
  async export(@Param('id') id: string, @Body() dto: ExportDashboardDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.export(id, req.user.userId, dto.format, dto as unknown as Record<string, unknown>);
  }
}
