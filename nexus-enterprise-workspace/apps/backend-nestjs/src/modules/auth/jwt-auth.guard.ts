import { CanActivate, ExecutionContext, Injectable, SetMetadata, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from './jwt.strategy';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler()) || 
                     this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getClass());
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

const ROLE_LEVEL: Record<string, number> = {
  owner: 4,
  executive: 3,
  manager: 2,
  analyst: 1,
  viewer: 0,
};

export const MIN_ROLE_KEY = 'minRole';
export const MinRole = (role: keyof typeof ROLE_LEVEL) => SetMetadata(MIN_ROLE_KEY, role);

export const SCOPE_KEY = 'requiredScope';
export const RequireScope = (scope: string) => SetMetadata(SCOPE_KEY, scope);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler()) || 
                     this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getClass());
    if (isPublic) return true;

    const minRole = this.reflector.get<string>(MIN_ROLE_KEY, context.getHandler());
    const requiredScope = this.reflector.get<string>(SCOPE_KEY, context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) throw new ForbiddenException('Utilisateur non authentifié.');

    if (requiredScope) {
      if (!user.scopes.includes(requiredScope)) {
        throw new ForbiddenException(`Scope requis manquant : ${requiredScope}.`);
      }
      return true;
    }

    if (minRole) {
      const userLevel = ROLE_LEVEL[user.role] ?? -1;
      const required = ROLE_LEVEL[minRole] ?? 99;
      if (userLevel < required) {
        throw new ForbiddenException(`Rôle insuffisant : ${minRole}+ requis, ${user.role} détecté.`);
      }
    }

    return true;
  }
}
