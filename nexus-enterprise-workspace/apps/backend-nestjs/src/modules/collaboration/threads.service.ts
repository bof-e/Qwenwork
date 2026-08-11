import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ThreadsService {
  constructor(
    private readonly db: TenantPrismaService,
    private readonly chatGateway: ChatGateway
  ) {}

  async listByEntity(entityType: string, entityId: string) {
    return this.db.client.chatThreads.findMany({
      where: { entity_type: entityType, entity_id: entityId },
      orderBy: { updated_at: 'desc' },
    });
  }

  async postMessage(threadId: string, userId: string, content: string, mentions?: string[], attachments?: string[]) {
    const message = await this.db.client.chatMessages.create({
      data: { thread_id: threadId, user_id: userId, content, mentions: mentions as any, attachments: attachments as any },
    });
    await this.db.client.chatThreads.update({ where: { id: threadId }, data: { updated_at: new Date() } });

    this.chatGateway.broadcastMessage(threadId, message);
    return message;
  }
}
