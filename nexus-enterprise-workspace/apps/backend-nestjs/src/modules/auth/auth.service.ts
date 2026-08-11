import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

const LOGIN_ATTEMPT_WINDOW_MIN = 15;
const LOGIN_ATTEMPT_MAX = 5; // Chapitre 2.4
const REFRESH_TOKEN_TTL_DAYS = 30;
const INVITATION_TTL_HOURS = 72; // Chapitre 1.3

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  // ---------------------------------------------------------------------
  // POST /auth/register — cf. dto/auth.dto.ts pour la note sur cet ajout
  // ---------------------------------------------------------------------
  async register(email: string, password: string, firstName: string, lastName: string, isFieldAccount = false) {
    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.users.create({
      data: { email, password_hash, first_name: firstName, last_name: lastName, is_field_account: isFieldAccount },
    });

    // Pas encore d'organisation à ce stade -> pas de org_id/role dans le JWT.
    // L'appelant doit ensuite POST /organizations pour en créer une (Owner
    // automatique) ou accepter une invitation reçue.
    const access_token = this.signAccessToken({
      sub: user.id,
      org_id: undefined,
      role: 'viewer',
      scopes: isFieldAccount ? ['field_sync'] : [],
    });
    const refresh_token = await this.issueRefreshToken(user.id);

    return { access_token, refresh_token, user: this.toPublicUser(user) };
  }

  // ---------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------
  async login(email: string, password: string, ipAddress?: string) {
    await this.assertNotRateLimited(email);

    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { organization_users: { orderBy: { joined_at: 'asc' } } },
    });

    const valid = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    await this.recordLoginAttempt(email, valid, ipAddress);

    if (!user || !valid) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    // Rôle privilégié = Executive+ (Specs §2.2.3, M1-T03).
    const primaryMembership = user.organization_users[0];
    const isPrivilegedRole = ['owner', 'executive'].includes(primaryMembership?.role?.toLowerCase() ?? '');
    if (isPrivilegedRole && !user.mfa_enabled) {
      throw new ForbiddenException({ code: 'MFA_REQUIRED', message: 'MFA obligatoire pour ce rôle.' });
    }

    const access_token = this.signAccessToken({
      sub: user.id,
      org_id: primaryMembership?.organization_id,
      role: primaryMembership?.role?.toLowerCase() ?? 'viewer',
      scopes: user.is_field_account ? ['field_sync'] : [], // V024
    });
    const refresh_token = await this.issueRefreshToken(user.id);

    await this.prisma.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    return { access_token, refresh_token, user: this.toPublicUser(user) };
  }

  // ---------------------------------------------------------------------
  // POST /auth/refresh — absent de l'OpenAPI, nécessaire en pratique : le
  // JWT expire en 15 min (convention OpenAPI), sans renouvellement l'usager
  // devrait ré-authentifier au mot de passe toutes les 15 minutes.
  // ---------------------------------------------------------------------
  async refresh(rawToken: string) {
    const tokenHash = this.hashOpaqueToken(rawToken);
    const stored = await this.prisma.refreshTokens.findUnique({ where: { token_hash: tokenHash } });

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token invalide, expiré ou révoqué.');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: stored.user_id },
      include: { organization_users: { orderBy: { joined_at: 'asc' } } },
    });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');

    // Rotation : l'ancien refresh token est révoqué, un nouveau est émis
    // (limite la fenêtre d'exploitation en cas de vol du token).
    await this.prisma.refreshTokens.update({ where: { id: stored.id }, data: { revoked_at: new Date() } });
    const primaryMembership = user.organization_users[0];

    const access_token = this.signAccessToken({
      sub: user.id,
      org_id: primaryMembership?.organization_id,
      role: primaryMembership?.role?.toLowerCase() ?? 'viewer',
      scopes: user.is_field_account ? ['field_sync'] : [],
    });
    const refresh_token = await this.issueRefreshToken(user.id);

    return { access_token, refresh_token };
  }

  // ---------------------------------------------------------------------
  // Acceptation d'invitation — absent de l'OpenAPI (seul l'envoi, POST
  // /organizations/{orgId}/users/invite, y est documenté). Sans endpoint
  // d'acceptation, une invitation envoyée ne peut jamais être concrétisée.
  // ---------------------------------------------------------------------
  async acceptInvitation(rawToken: string, password?: string, firstName?: string, lastName?: string) {
    let payload: { invitation_id: string };
    try {
      payload = this.jwt.verify(rawToken) as { invitation_id: string };
    } catch {
      throw new UnauthorizedException("Jeton d'invitation invalide ou expiré.");
    }

    const invitation = await this.prisma.invitations.findUnique({ where: { id: payload.invitation_id } });
    if (!invitation || invitation.expires_at < new Date()) {
      throw new UnauthorizedException('Invitation introuvable ou expirée.');
    }

    let user = await this.prisma.users.findUnique({ where: { email: invitation.email } });

    if (!user) {
      if (!password || !firstName || !lastName) {
        throw new HttpException(
          { code: 'ACCOUNT_DETAILS_REQUIRED', message: 'Nouveau compte : mot de passe, prénom et nom requis.' },
          HttpStatus.BAD_REQUEST
        );
      }
      const password_hash = await bcrypt.hash(password, 12);
      user = await this.prisma.users.create({
        data: { email: invitation.email, password_hash, first_name: firstName, last_name: lastName },
      });
    }

    const existingMembership = await this.prisma.organizationUsers.findUnique({
      where: { user_id_organization_id: { user_id: user.id, organization_id: invitation.organization_id } },
    });
    if (!existingMembership) {
      await this.prisma.organizationUsers.create({
        data: { user_id: user.id, organization_id: invitation.organization_id, role: invitation.role },
      });
    }
    await this.prisma.invitations.delete({ where: { id: invitation.id } }); // usage unique

    const access_token = this.signAccessToken({
      sub: user.id,
      org_id: invitation.organization_id,
      role: invitation.role.toLowerCase(),
      scopes: user.is_field_account ? ['field_sync'] : [],
    });
    const refresh_token = await this.issueRefreshToken(user.id);

    return { access_token, refresh_token, user: this.toPublicUser(user) };
  }

  // ---------------------------------------------------------------------
  // Aides privées
  // ---------------------------------------------------------------------

  private signAccessToken(payload: { sub: string; org_id?: string; role: string; scopes: string[] }) {
    return this.jwt.sign(payload, { algorithm: 'RS256', expiresIn: '15m' });
  }

  private hashOpaqueToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshTokens.create({
      data: { user_id: userId, token_hash: this.hashOpaqueToken(raw), expires_at },
    });
    return raw;
  }

  private async assertNotRateLimited(email: string) {
    const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MIN * 60 * 1000);
    const recentFailures = await this.prisma.loginAttempts.count({
      where: { email, success: false, attempted_at: { gte: since } },
    });
    if (recentFailures >= LOGIN_ATTEMPT_MAX) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: `Trop de tentatives échouées. Réessayez dans ${LOGIN_ATTEMPT_WINDOW_MIN} minutes.` },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private async recordLoginAttempt(email: string, success: boolean, ipAddress?: string) {
    await this.prisma.loginAttempts.create({
      data: { email, success, ip_address: ipAddress },
    });
  }

  private toPublicUser(user: { id: string; email: string; first_name: string | null; last_name: string | null }) {
    return {
      id: user.id,
      email: user.email,
      name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    };
  }
}

/**
 * À FAIRE avant mise en production :
 * - Envoi d'email réel pour les invitations (actuellement le token brut est
 *   retourné dans la réponse HTTP par OrganizationsController en mode dev
 *   uniquement — voir organizations.service.ts).
 * - Purge périodique des refresh tokens expirés/révoqués (job planifié).
 * - Limiter aussi le rate limit par IP en plus de l'email (un attaquant
 *   distribué sur plusieurs IP mais visant un seul email est déjà couvert ;
 *   l'inverse — une IP visant beaucoup d'emails — ne l'est pas encore).
 */
