import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { DataBatchesWorkflowService } from './data-batches-workflow.service';
import { ApproveDataBatchDto, RejectDataBatchDto } from './dto/strategy.dto';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Strategy')
@Controller('data-batches')
export class DataBatchesWorkflowController {
  constructor(private readonly service: DataBatchesWorkflowService) {}

  // x-required-role (OpenAPI): Analyst+
  @MinRole('analyst')
  @Post(':batchId/submit')
  async submit(@Param('batchId') batchId: string) {
    return this.service.submit(batchId);
  }

  // x-required-role (OpenAPI): Manager+
  @MinRole('manager')
  @Post(':batchId/approve')
  async approve(@Param('batchId') batchId: string, @Body() dto: ApproveDataBatchDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.approve(batchId, req.user.userId, req.user.orgId!, dto.comment);
  }

  // x-required-role (OpenAPI): Manager+
  @MinRole('manager')
  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectDataBatchDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.reject(id, req.user.userId, dto.rejection_reason);
  }
}
