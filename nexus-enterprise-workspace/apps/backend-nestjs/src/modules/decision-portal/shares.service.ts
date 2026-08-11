import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService, // GET /shared/{shareId} : accès public, hors contexte tenant (Chapitre 11.3)
    private readonly tenantDb: TenantPrismaService
  ) {}

  /** POST /reports/{id}/share — US-07. */
  async createShareLink(reportId: string, userId: string, expiresAt?: string, password?: string, allowedEmails?: string[]) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const token_hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const password_hash = password ? await bcrypt.hash(password, 12) : undefined;

    const link = await this.tenantDb.client.sharedLinks.create({
      data: {
        entity_type: 'report',
        entity_id: reportId,
        created_by_user_id: userId,
        token_hash,
        password_hash,
        expires_at: expiresAt ? new Date(expiresAt) : undefined,
        // allowed_emails non présent dans le schéma actuel — TODO : migration
        // dédiée si le contrôle par liste d'emails doit être appliqué côté DB
        // plutôt qu'au niveau applicatif uniquement.
      },
    });

    return { share_link: `/shared/${link.id}?token=${rawToken}`, share_id: link.id };
  }

  /** GET /shared/{shareId} — accès public par token, hors RLS/app_runtime standard
   * (Chapitre 11.3 : contournement documenté, pas une faille). */
  async getSharedContent(shareId: string, rawToken: string, ipAddress?: string, userAgent?: string) {
    const link = await this.prisma.sharedLinks.findUnique({ where: { id: shareId } });
    if (!link) throw new NotFoundException('Lien introuvable.');

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    if (tokenHash !== link.token_hash) throw new UnauthorizedException('Jeton invalide.');
    if (link.expires_at && link.expires_at < new Date()) throw new UnauthorizedException('Lien expiré.');
    if (link.max_access_count && link.access_count >= link.max_access_count) {
      throw new UnauthorizedException("Nombre maximal d'accès atteint.");
    }

    await this.prisma.sharedLinks.update({ where: { id: shareId }, data: { access_count: { increment: 1 } } });
    await this.prisma.sharedLinkAccessLogs.create({
      data: { shared_link_id: shareId, ip_address: ipAddress, user_agent: userAgent },
    });

    if (link.entity_type === 'report') {
      return this.prisma.reports.findUnique({ where: { id: link.entity_id } });
    }
    return this.prisma.dashboards.findUnique({ where: { id: link.entity_id } });
  }
}
