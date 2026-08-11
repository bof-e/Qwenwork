import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { MailService } from '../../common/mail/mail.service';

const INVITATION_TTL_HOURS = 72; // Chapitre 1.3

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantPrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService
  ) {}

  async invite(orgId: string, email: string, role: string) {
    const alreadyMember = await this.tenantDb.client.organizationUsers.findFirst({
      where: { organization_id: orgId, user: { email } },
    });
    if (alreadyMember) {
      throw new ConflictException('Cet email est déjà membre de cette organisation.');
    }

    const expires_at = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
    // token_hash : on ne stocke jamais le token en clair, même l'invitation elle-même
    // n'a pas besoin de le relire — seul AuthService.acceptInvitation() le vérifie.
    const invitation = await this.tenantDb.client.invitations.create({
      data: { organization_id: orgId, email, role, token_hash: 'PENDING', expires_at },
    });

    const token = this.jwt.sign({ invitation_id: invitation.id }, { algorithm: 'RS256', expiresIn: `${INVITATION_TTL_HOURS}h` });
    const token_hash = this.hashToken(token);
    await this.prisma.invitations.update({ where: { id: invitation.id }, data: { token_hash } });

    const org = await this.prisma.organizations.findUnique({ where: { id: orgId } });
    const inviteUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/accept-invitation?token=${token}`;
    await this.mail.sendInvitation(email, org?.name ?? 'votre organisation', inviteUrl);

    return {
      sent: true,
      // devOnlyToken : uniquement hors production, utile pour tester sans
      // boîte mail réelle — le vrai envoi (ou le log console en dev sans
      // SMTP_HOST) reste la voie normale.
      devOnlyToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    };
  }

  private hashToken(raw: string): string {
    // Réutilise la même primitive que AuthService — un hash simple suffit ici
    // (le token est déjà un JWT signé RS256, ce hash ne sert qu'à le retrouver
    // en base sans avoir à le stocker en clair).
    return require('crypto').createHash('sha256').update(raw).digest('hex');
  }
}
