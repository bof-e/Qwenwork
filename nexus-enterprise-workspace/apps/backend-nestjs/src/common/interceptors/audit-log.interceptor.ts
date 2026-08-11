import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/jwt.strategy';

/**
 * Journalise automatiquement chaque POST/PATCH/PUT/DELETE réussi dans
 * audit_logs (M7-T04), sans dépendre de chaque contrôleur pour y penser.
 * Enregistré globalement dans app.module.ts.
 *
 * Volontairement silencieux en cas d'échec d'écriture du journal lui-même
 * (ne doit jamais faire échouer la requête métier à cause d'un problème de
 * journalisation) — l'erreur est seulement loguée en console.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const user: AuthenticatedUser | undefined = req.user;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) || !user?.orgId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLogs
          .create({
            data: {
              organization_id: user.orgId!,
              user_id: user.userId,
              action: `${method} ${req.route?.path ?? req.path}`,
              entity_type: req.baseUrl?.split('/')[1] ?? null,
              new_values: this.sanitizeBody(req.body) as any, // Prisma.InputJsonValue attend un type plus strict qu'un Record générique
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
            },
          })
          .catch((err) => console.error('[AuditLogInterceptor] Échec de journalisation :', err));
      })
    );
  }

  /** Ne journalise jamais les mots de passe / secrets même dans les corps de requête. */
  private sanitizeBody(body: unknown) {
    if (!body || typeof body !== 'object') return undefined;
    const clone = { ...(body as Record<string, unknown>) };
    for (const key of ['password', 'password_hash', 'token', 'refresh_token', 'mfa_secret']) {
      if (key in clone) clone[key] = '[REDACTED]';
    }
    return clone as any;
  }
}
