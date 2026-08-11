import { Body, Controller, Post, Req } from '@nestjs/common';
import { IsDateString, IsString, IsUUID } from 'class-validator';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

class GenerateReportDto {
  @IsUUID()
  project_id!: string;

  @IsDateString()
  period_start!: string;

  @IsDateString()
  period_end!: string;

  @IsString()
  audience!: string;
}

@ApiTags('Nexus AI')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  // x-required-role (OpenAPI): Executive+
  @MinRole('executive')
  @Post('generate')
  async generate(@Body() dto: GenerateReportDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.generate(req.user.orgId!, req.user.userId, dto.project_id, dto.period_start, dto.period_end, dto.audience);
  }
}
