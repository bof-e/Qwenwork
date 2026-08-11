import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Sans ce filtre, chaque contrôleur/service renvoie un format d'erreur
 * légèrement différent selon qu'il lève une HttpException NestJS, une
 * erreur Prisma brute, ou une Error générique — inconsistant pour un
 * client qui doit parser ces réponses. Uniformise en :
 *   { statusCode, message, error, path, timestamp }
 *
 * Monté globalement dans main.ts (app.useGlobalFilters(new GlobalExceptionFilter())).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse, exception);

    // Erreurs 5xx : journalisées avec la stack complète côté serveur, jamais
    // renvoyées au client (fuite d'information interne en production).
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} — ${message}`, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({
      statusCode: status,
      message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur.' : message,
      error: isHttpException ? exception.constructor.name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private extractMessage(exceptionResponse: unknown, exception: unknown): string {
    if (typeof exceptionResponse === 'string') return exceptionResponse;
    if (exceptionResponse && typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const m = (exceptionResponse as { message: unknown }).message;
      return Array.isArray(m) ? m.join(', ') : String(m); // class-validator renvoie un tableau de messages
    }
    if (exception instanceof Error) return exception.message;
    return 'Erreur inconnue.';
  }
}
