import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService, // création : pas encore de contexte tenant utile (voir V023)
    private readonly tenantDb: TenantPrismaService // lecture : filtrée par appartenance (current_user_id)
  ) {}

  /**
   * Crée l'organisation et la ligne organization_users (Owner) dans la même
   * transaction — nécessaire pour que V023 (INSERT ouvert + SELECT restreint
   * par appartenance) ne laisse jamais une organisation "orpheline" visible
   * par personne, même en cas d'erreur partielle.
   */
  async create(userId: string, name: string, industry: string) {
    const existing = await this.prisma.organizations.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('Une organisation avec ce nom existe déjà.');
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organizations.create({ data: { name, industry } });
      await tx.organizationUsers.create({
        data: { user_id: userId, organization_id: org.id, role: 'owner' },
      });
      // TODO : émettre OrganizationCreatedEvent (provisioning — Architecture M1)
      // une fois la couche événementielle (BullMQ / event_store) branchée.
      return org;
    });
  }

  /** GET /organizations — la policy RLS (current_user_id) fait déjà tout le filtrage. */
  async listForUser() {
    return this.tenantDb.client.organizations.findMany({ orderBy: { created_at: 'asc' } });
  }

  /** GET /organizations/{orgId} — RLS renvoie "non trouvé" si l'utilisateur n'est pas membre. */
  async getById(orgId: string) {
    const org = await this.tenantDb.client.organizations.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation introuvable.');
    return org;
  }
}
