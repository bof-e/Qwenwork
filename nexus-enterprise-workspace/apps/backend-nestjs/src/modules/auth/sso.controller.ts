import { Controller, NotImplementedException, Param, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

/**
 * POST /auth/sso/{provider} (OpenAPI) — squelette de routage uniquement.
 *
 * Non implémenté : nécessite une librairie SAML 2.0/OIDC (ex. @node-saml/passport-saml
 * ou openid-client selon le fournisseur) et une configuration par organisation
 * (métadonnées IdP, domaines email autorisés — Chapitre 2.2.1) qui n'existe
 * pas encore dans le schéma actuel. Une vraie implémentation doit :
 *   1. Valider idp_token contre les métadonnées de l'IdP de l'organisation.
 *   2. Vérifier le domaine email autorisé (403 sinon, cf. OpenAPI).
 *   3. Provisionner l'utilisateur en JIT si inexistant (is_sso_user=true,
 *      sso_provider, sso_provider_id — déjà présents dans le schéma Users).
 *   4. Émettre un JWT interne identique à /auth/login.
 */
@ApiTags('Auth')
@Controller('auth/sso')
export class SsoController {
  @Public()
  @Post(':provider')
  async ssoLogin(@Param('provider') provider: string): Promise<never> {
    throw new NotImplementedException(
      `SSO (${provider}) non implémenté — nécessite une librairie SAML/OIDC et la configuration IdP par organisation.`
    );
  }
}
