import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_DATA_INGESTION, QUEUE_EXPORTS } from './queue.constants';

/**
 * Infrastructure BullMQ partagée — connexion Redis unique (docker-compose.yml,
 * service "redis"), deux files enregistrées ici pour que n'importe quel
 * module puisse @InjectQueue(...) sans reconfigurer la connexion.
 *
 * npm install bullmq @nestjs/bullmq ioredis
 */
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      },
    }),
    BullModule.registerQueue({ name: QUEUE_DATA_INGESTION }, { name: QUEUE_EXPORTS }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
