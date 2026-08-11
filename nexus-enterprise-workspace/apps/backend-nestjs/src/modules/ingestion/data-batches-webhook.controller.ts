import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';

interface DataBatchIngestPayload {
  data_source_id: string;
  project_id: string;
  client_uuid?: string;
  payload: Record<string, unknown>;
}

/**
 * POST /data-batches — webhook connecteur externe (OpenAPI, Ingestion).
 * Route publique (pas de JWT utilisateur : c'est Kobo/SharePoint qui appelle),
 * protégée par vérification de signature HMAC à la place.
 *
 * NOTE : le schéma de signature exact varie par connecteur (Kobo utilise un
 * header différent de SharePoint). Implémenté ici en HMAC-SHA256 générique
 * avec un secret partagé (WEBHOOK_SHARED_SECRET) — à adapter au schéma réel
 * de chaque connecteur avant la mise en prod (voir Chapitre 3.2.2 pour Kobo).
 */
@ApiTags('Ingestion')
@Controller('data-batches')
export class DataBatchesWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post()
  async receive(@Body() payload: DataBatchIngestPayload, @Headers('x-webhook-signature') signature?: string) {
    this.verifySignature(payload, signature);

    if (!payload.client_uuid) {
      throw new BadRequestException('client_uuid manquant — soumission rejetée avant toute écriture (M2-T03).');
    }

    return this.prisma.dataBatches.create({
      data: { project_id: payload.project_id, raw_payload: payload.payload as any },
    });
  }

  private verifySignature(payload: unknown, signature?: string) {
    const secret = process.env.WEBHOOK_SHARED_SECRET;
    if (!secret) {
      throw new UnauthorizedException('WEBHOOK_SHARED_SECRET non configuré côté serveur.');
    }
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    if (!signature || signature !== expected) {
      throw new UnauthorizedException('Signature webhook invalide.');
    }
  }
}
