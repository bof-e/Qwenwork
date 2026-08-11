import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    let connectionString = process.env.DATABASE_URL;
    console.log('PrismaService constructor: original DATABASE_URL =', connectionString);
    if (connectionString) {
      try {
        const url = new URL(connectionString);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          const runtimeUser = 'app_runtime';
          const runtimePassword = process.env.APP_RUNTIME_PASSWORD || 'CHANGE_ME_VIA_SECRETS_MANAGER';
          
          if (url.username !== runtimeUser) {
            url.username = runtimeUser;
            url.password = runtimePassword;
            connectionString = url.toString();
          }
        }
      } catch (err) {
        if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
          connectionString = connectionString.replace(
            /(postgres(?:ql)?:\/\/)[^:]+:[^@]+@/,
            `$1app_runtime:${process.env.APP_RUNTIME_PASSWORD || 'CHANGE_ME_VIA_SECRETS_MANAGER'}@`
          );
        }
      }
    }
    console.log('PrismaService constructor: final connectionString used for Pool =', connectionString);
    const adapter = new PrismaPg(connectionString);
    super({
      adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
