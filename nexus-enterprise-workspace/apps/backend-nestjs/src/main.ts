import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Backend NestJS autonome — ne sert plus le frontend (apps/web s'en charge
 * via son propre serveur Vite, avec un proxy vers ce port en développement).
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' });
  app.enableShutdownHooks(); // ferme proprement Postgres/Redis sur SIGTERM/SIGINT (arrêt Docker, redeploy)

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nexus Enterprise Workspace API')
      .setDescription("API du module M&E — reflète l'OpenAPI v1 de référence, complétée des endpoints ajoutés par nécessité (register, refresh, invitations/accept, etc., documentés dans instructions/)")
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`Backend NestJS démarré sur http://localhost:${port}`, 'Bootstrap');
  if (process.env.NODE_ENV !== 'production') {
    Logger.log(`Documentation Swagger : http://localhost:${port}/docs`, 'Bootstrap');
  }
}

bootstrap().catch((err) => {
  console.error('Échec du démarrage du backend :', err);
  process.exit(1);
});
