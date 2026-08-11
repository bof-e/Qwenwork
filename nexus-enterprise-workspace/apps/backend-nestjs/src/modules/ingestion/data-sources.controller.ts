import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { DataSourcesService } from './data-sources.service';
import { CreateDataSourceDto } from './dto/ingestion.dto';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Ingestion')
@Controller('data-sources')
export class DataSourcesController {
  constructor(private readonly dataSourcesService: DataSourcesService) {}

  // x-required-role (OpenAPI): Analyst+
  @MinRole('analyst')
  @Post()
  async create(@Body() dto: CreateDataSourceDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.dataSourcesService.create(req.user.orgId!, req.user.userId, dto.project_id, dto.source_type, dto.configuration);
  }

  // x-required-role (OpenAPI): Analyst+
  @MinRole('analyst')
  @Post(':id/sync')
  async sync(@Param('id') id: string) {
    return this.dataSourcesService.triggerSync(id);
  }
}
