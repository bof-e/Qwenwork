import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AuthenticatedUser {
  userId: string;
  orgId: string | null;
  role: string;
  scopes: string[];
}

interface NexusJwtPayload {
  sub: string;
  org_id?: string;
  role?: string;
  scopes?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const publicKey = process.env.JWT_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY manquant — impossible de démarrer le module Auth.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey.replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: NexusJwtPayload): Promise<AuthenticatedUser> {
    return {
      userId: payload.sub,
      orgId: payload.org_id ?? null,
      role: payload.role ?? 'viewer',
      scopes: payload.scopes ?? [],
    };
  }
}
