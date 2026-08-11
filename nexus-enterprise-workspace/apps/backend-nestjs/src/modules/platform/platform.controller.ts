import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

type Req = Request & { user: AuthenticatedUser };

// ---------------------------------------------------------------------------
// Audit — lecture seule (l'écriture se fait via AuditLogInterceptor, global)
// ---------------------------------------------------------------------------
@ApiTags('Platform')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly db: TenantPrismaService) {}

  // x-required-role : Executive+ (journal sensible, accès restreint)
  @MinRole('executive')
  @Get()
  async list(@Query('limit') limit?: string) {
    return this.db.client.auditLogs.findMany({
      orderBy: { created_at: 'desc' },
      take: limit ? Math.min(Number(limit), 200) : 50,
    });
  }
}

// ---------------------------------------------------------------------------
// Facturation — lecture des quotas/abonnement/factures (pas d'intégration
// Stripe réelle ici, juste la consultation des données déjà en base).
// ---------------------------------------------------------------------------
@ApiTags('Platform')
@Controller('billing')
export class BillingController {
  constructor(private readonly db: TenantPrismaService) {}

  @MinRole('owner')
  @Get('subscription')
  async getSubscription(@Req() req: Req) {
    return this.db.client.subscriptions.findUnique({ where: { organization_id: req.user.orgId! } });
  }

  @MinRole('owner')
  @Get('usage')
  async getUsage() {
    const today = new Date();
    // RLS filtre déjà par organisation courante — pas besoin de where organization_id ici.
    return this.db.client.usageQuotas.findMany({
      where: { period_start: { lte: today }, period_end: { gte: today } },
    });
  }

  @MinRole('owner')
  @Get('invoices')
  async getInvoices() {
    return this.db.client.invoices.findMany({ orderBy: { issued_at: 'desc' } });
  }
}

// ---------------------------------------------------------------------------
// RGPD — droit à l'oubli (Chapitre 12, deletion_requests déjà en base V018)
// ---------------------------------------------------------------------------
class CreateDeletionRequestDto {
  @IsIn(['USER_REQUEST', 'ORGANIZATION_OFFBOARDING', 'LEGAL_ORDER'])
  reason!: string;

  @IsOptional()
  @IsString()
  targetUserId?: string; // si absent : purge de l'organisation entière (Owner uniquement)
}

@ApiTags('Platform')
@Controller('gdpr')
export class GdprController {
  constructor(private readonly db: TenantPrismaService) {}

  // x-required-role : Owner (purge organisation) ou l'utilisateur concerné lui-même
  @Post('deletion-requests')
  async requestDeletion(@Body() dto: CreateDeletionRequestDto, @Req() req: Req) {
    const scheduled_for = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // J+30, Chapitre 12
    return this.db.client.deletionRequests.create({
      data: {
        reason: dto.reason,
        user_id: dto.targetUserId,
        requested_by_user_id: req.user.userId,
        scheduled_for,
        status: 'SCHEDULED',
      },
    });
  }

  @MinRole('owner')
  @Get('deletion-requests')
  async listDeletionRequests() {
    return this.db.client.deletionRequests.findMany({ orderBy: { created_at: 'desc' } });
  }

  /**
   * Absent de l'OpenAPI (gap déjà documenté dans instructions/03 et
   * gdpr-purge.service.ts) — sans cet endpoint, le délai de grâce de 30
   * jours n'offre aucun recours réel : une demande programmée serait purgée
   * sans qu'on puisse jamais l'annuler. Uniquement tant que status =
   * SCHEDULED — une fois COMPLETED/FAILED, la purge a déjà eu lieu.
   */
  @Post('deletion-requests/:id/cancel')
  async cancelDeletionRequest(@Param('id') id: string, @Req() req: Req) {
    const request = await this.db.client.deletionRequests.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable.');
    if (request.status !== 'SCHEDULED') {
      throw new ConflictException(`Impossible d'annuler une demande au statut ${request.status}.`);
    }
    const isRequester = request.requested_by_user_id === req.user.userId;
    const isOwner = req.user.role === 'owner';
    if (!isRequester && !isOwner) {
      throw new ForbiddenException("Seul l'auteur de la demande ou un Owner peut l'annuler.");
    }

    return this.db.client.deletionRequests.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}

/**
 * À FAIRE : worker de purge effective à J+30 (lecture de deletion_requests
 * où status = SCHEDULED et scheduled_for <= now(), cascade de suppression
 * réelle des données) — nécessite un job planifié (BullMQ repeatable job),
 * hors périmètre HTTP de ce fichier.
 */
