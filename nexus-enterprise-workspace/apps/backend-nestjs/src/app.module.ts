import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { MailModule } from './common/mail/mail.module';
import { envValidationSchema } from './common/config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './modules/auth/jwt-auth.guard';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PlatformModule } from './modules/platform/platform.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { NexusAiModule } from './modules/nexus-ai/nexus-ai.module';
import { DecisionPortalModule } from './modules/decision-portal/decision-portal.module';
import { HealthModule } from './modules/health/health.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    // isGlobal + validationSchema : l'app refuse de démarrer si une variable
    // requise manque (DATABASE_URL, JWT_*), avec un message clair au lieu
    // d'un échec confus à la première requête qui en a besoin.
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    // Rate limiting global (10 req/s par IP par défaut) — vient compléter,
    // pas remplacer, le verrou anti-bruteforce déjà en place sur /auth/login
    // (basé sur LoginAttempts, plus fin car par email).
    ThrottlerModule.forRoot([{ ttl: 1000, limit: 10 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    OrganizationsModule,
    PlatformModule,
    IngestionModule,
    StrategyModule,
    CollaborationModule,
    NexusAiModule,
    DecisionPortalModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
