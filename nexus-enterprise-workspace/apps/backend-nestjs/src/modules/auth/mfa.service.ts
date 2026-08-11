import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * npm install otplib
 *
 * MFA_TOKEN (header X-MFA-Token, OpenAPI /auth/mfa/verify) : code TOTP à 6
 * chiffres, vérifié contre le secret stocké en base (users.mfa_secret).
 */
@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Étape 1 — génère un secret et l'URL otpauth:// à encoder en QR code côté frontend. */
  async generateSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.users.update({ where: { id: userId }, data: { mfa_secret: secret } });
    const otpauthUrl = authenticator.keyuri(email, 'Nexus Enterprise Workspace', secret);
    return { secret, otpauthUrl };
  }

  /** Étape 2 — confirme l'activation après que l'utilisateur ait scanné et saisi un premier code valide. */
  async confirmEnrollment(userId: string, code: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user?.mfa_secret || !authenticator.check(code, user.mfa_secret)) {
      throw new UnauthorizedException('Code TOTP invalide.');
    }
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    await this.prisma.users.update({
      where: { id: userId },
      data: { mfa_enabled: true, backup_codes: backupCodes },
    });
    return { backupCodes }; // à afficher UNE SEULE FOIS côté frontend, jamais réaffiché ensuite
  }

  /** POST /auth/mfa/verify — vérifie X-MFA-Token pour un utilisateur déjà authentifié. */
  async verify(userId: string, code: string): Promise<void> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user?.mfa_enabled || !user.mfa_secret) {
      throw new UnauthorizedException('MFA non activé pour ce compte.');
    }

    if (authenticator.check(code, user.mfa_secret)) return;

    // Repli sur les codes de secours (usage unique chacun).
    const backupCodes = (user.backup_codes as string[] | null) ?? [];
    if (backupCodes.includes(code)) {
      await this.prisma.users.update({
        where: { id: userId },
        data: { backup_codes: backupCodes.filter((c) => c !== code) },
      });
      return;
    }

    throw new UnauthorizedException('Code TOTP invalide ou expiré.');
  }
}
