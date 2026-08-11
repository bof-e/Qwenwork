import { Body, Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LogicalFrameworksService } from './logical-frameworks.service';
import { CreateLogicalFrameworkNodeDto } from './dto/strategy.dto';
import { MinRole } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Strategy')
@Controller('logical-frameworks')
export class LogicalFrameworksController {
  constructor(private readonly service: LogicalFrameworksService) {}

  // x-required-role (OpenAPI): Viewer+
  @Get()
  async list(@Query('project_id') projectId: string) {
    return this.service.listByProject(projectId);
  }

  // x-required-role (OpenAPI): Manager+
  @MinRole('manager')
  @Post()
  async create(@Body() dto: CreateLogicalFrameworkNodeDto) {
    return this.service.create(dto);
  }

  // x-required-role (OpenAPI): Manager+ — US-01, < 5s pour l'ensemble de l'arborescence
  @MinRole('manager')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@Body('project_id') projectId: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.importFromExcel(projectId, file.buffer);
  }
}
