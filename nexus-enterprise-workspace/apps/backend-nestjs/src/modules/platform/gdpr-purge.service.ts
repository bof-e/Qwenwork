import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Purge RGPD effective à J+30 (Chapitre 12, V018). Tourne toutes les heures,
 * traite les DeletionRequests dont scheduled_for <= now() et status =
 * SCHEDULED. Marque COMPLETED avant la suppression réelle (et non après) :
 * user_id/organization_id ont onDelete: Cascade sur cette table — si la
 * ligne référencée est supprimée en premier, la ligne DeletionRequests
 * elle-même disparaîtrait par cascade, perdant la trace d'audit.
 *
 * npm install @nestjs/schedule — ScheduleModule.forRoot() doit être importé
 * une fois dans AppModule (fait ci-joint).
 *
 * ATTENTION : aucun endpoint d'annulation n'existe (gap déjà documenté,
 * OpenAPI muet dessus). Toute demande arrivée à échéance sera purgée sans
 * garde-fou applicatif supplémentaire au-delà du délai de grâce de 30 jours.
 */
@Injectable()
export class GdprPurgeService {
  private readonly logger = new Logger(GdprPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processDueRequests() {
    const due = await this.prisma.deletionRequests.findMany({
      where: { status: 'SCHEDULED', scheduled_for: { lte: new Date() } },
    });

    for (const request of due) {
      try {
        await this.prisma.deletionRequests.update({ where: { id: request.id }, data: { status: 'COMPLETED', completed_at: new Date() } });

        if (request.user_id) {
          await this.prisma.users.delete({ where: { id: request.user_id } });
        } else if (request.organization_id) {
          await this.prisma.organizations.delete({ where: { id: request.organization_id } });
        }

        this.logger.log(`Purge RGPD complétée : ${request.id}`);
      } catch (err) {
        this.logger.error(`Échec purge RGPD ${request.id} :`, err);
        await this.prisma.deletionRequests.update({ where: { id: request.id }, data: { status: 'FAILED' } }).catch(() => undefined);
      }
    }
  }
}
