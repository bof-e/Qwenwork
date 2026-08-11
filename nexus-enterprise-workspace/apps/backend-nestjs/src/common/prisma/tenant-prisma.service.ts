import { Inject, Injectable, Scope, ForbiddenException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from './prisma.service';
import { AuthenticatedUser } from '../../modules/auth/jwt.strategy';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  public readonly client: any;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request & { user?: AuthenticatedUser }
  ) {
    const user = this.request.user;
    if (!user) {
      throw new ForbiddenException('Contexte tenant demandé sans utilisateur authentifié.');
    }

    const self = this;
    this.client = this.prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            return self.prisma.$transaction(async (tx) => {
              await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, user.userId);
              if (user.orgId) {
                await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, user.orgId);
              }
              return query(args);
            });
          },
        },
      },
    });
  }
}
