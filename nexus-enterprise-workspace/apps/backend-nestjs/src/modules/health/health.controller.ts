import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';

/**
 * GET /health — pensé pour un readiness/liveness probe (Docker
 * healthcheck, orchestrateur). Vérifie réellement la connexion Postgres
 * (via une requête triviale) et Redis (PING), pas un simple "200 OK"
 * statique qui ne dirait rien d'un vrai problème d'infrastructure.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: 'up' as const } };
      },
      async () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        try {
          await redis.connect();
          await redis.ping();
          return { redis: { status: 'up' as const } };
        } finally {
          redis.disconnect();
        }
      },
    ]);
  }
}
