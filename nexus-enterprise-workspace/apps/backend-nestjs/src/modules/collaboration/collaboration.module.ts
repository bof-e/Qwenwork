import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [ThreadsController],
  providers: [ThreadsService, ChatGateway],
})
export class CollaborationModule {}
