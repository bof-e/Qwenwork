import { Module } from '@nestjs/common';
import { LogicalFrameworksController } from './logical-frameworks.controller';
import { LogicalFrameworksService } from './logical-frameworks.service';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import { DataBatchesWorkflowController } from './data-batches-workflow.controller';
import { DataBatchesWorkflowService } from './data-batches-workflow.service';
import { CascadeService } from './cascade.service';

@Module({
  controllers: [LogicalFrameworksController, IndicatorsController, DataBatchesWorkflowController],
  providers: [LogicalFrameworksService, IndicatorsService, DataBatchesWorkflowService, CascadeService],
  exports: [CascadeService],
})
export class StrategyModule {}
