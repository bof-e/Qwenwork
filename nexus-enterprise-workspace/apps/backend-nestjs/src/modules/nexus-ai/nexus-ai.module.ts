import { Module } from '@nestjs/common';
import { LlmGatewayService } from './llm-gateway.service';
import { AiCleaningController } from './ai-cleaning.controller';
import { AiCleaningService } from './ai-cleaning.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AiDocumentsController } from './ai-documents.controller';
import { AiDocumentsService } from './ai-documents.service';
import { AiProposalsController, AiProposalsService } from './ai-proposals.controller';

@Module({
  controllers: [AiCleaningController, ReportsController, AiDocumentsController, AiProposalsController],
  providers: [LlmGatewayService, AiCleaningService, ReportsService, AiDocumentsService, AiProposalsService],
  exports: [LlmGatewayService],
})
export class NexusAiModule {}
