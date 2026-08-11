import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AiDocumentsService } from './ai-documents.service';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Nexus AI')
@Controller('ai/documents')
export class AiDocumentsController {
  constructor(private readonly service: AiDocumentsService) {}

  // x-required-role (OpenAPI): Analyst+
  @MinRole('analyst')
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body('project_id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: AuthenticatedUser }
  ) {
    return this.service.upload(req.user.orgId!, req.user.userId, projectId, file);
  }
}
