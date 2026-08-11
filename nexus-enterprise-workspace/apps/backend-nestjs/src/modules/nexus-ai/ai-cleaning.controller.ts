import { Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AiCleaningService } from './ai-cleaning.service';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Nexus AI')
@Controller('data-batches')
export class AiCleaningController {
  constructor(private readonly service: AiCleaningService) {}

  // x-required-role (OpenAPI): Analyst+
  @MinRole('analyst')
  @Post(':id/clean')
  async clean(@Param('id') id: string, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.clean(id, req.user.orgId!, req.user.userId);
  }
}
