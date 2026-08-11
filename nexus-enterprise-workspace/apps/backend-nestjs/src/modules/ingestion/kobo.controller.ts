import { Controller, Get, InternalServerErrorException, NotFoundException, Query } from '@nestjs/common';
import { MinRole } from '../auth/jwt-auth.guard';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { ApiTags } from '@nestjs/swagger';

/**
 * GET /kobo/assets — TODO multi-tenant (instructions/01) complété ici :
 * si data_source_id est fourni, le jeton Kobo est lu depuis
 * data_sources.configuration (par organisation) plutôt que la variable
 * d'environnement globale KOBOTOOLBOX_API_KEY.
 *
 * Rétrocompatible à dessein : sans data_source_id, le comportement d'origine
 * (jeton global) est conservé pour ne pas casser ConnecteursView.tsx tel
 * qu'il appelle déjà cette route aujourd'hui.
 */
@ApiTags('Ingestion')
@Controller('kobo')
export class KoboController {
  constructor(private readonly db: TenantPrismaService) {}

  @MinRole('analyst')
  @Get('assets')
  async getAssets(@Query('data_source_id') dataSourceId?: string) {
    const apiKey = await this.resolveApiKey(dataSourceId);

    const response = await fetch('https://kf.kobotoolbox.org/api/v2/assets/', {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Kobo API a répondu ${response.status}`);
    }

    return response.json();
  }

  private async resolveApiKey(dataSourceId?: string): Promise<string> {
    if (dataSourceId) {
      const source = await this.db.client.dataSources.findUnique({ where: { id: dataSourceId } });
      if (!source) throw new NotFoundException('Source de données introuvable.');
      const configured = (source.configuration as Record<string, unknown> | null)?.api_key as string | undefined;
      if (!configured) {
        throw new InternalServerErrorException(`Aucune clé API Kobo configurée pour la source ${dataSourceId}.`);
      }
      return configured;
    }

    // Repli mono-tenant (comportement d'origine, conservé pour rétrocompatibilité).
    const globalKey = process.env.KOBOTOOLBOX_API_KEY;
    if (!globalKey) {
      throw new InternalServerErrorException('KOBOTOOLBOX_API_KEY non configuré côté serveur.');
    }
    return globalKey;
  }
}
