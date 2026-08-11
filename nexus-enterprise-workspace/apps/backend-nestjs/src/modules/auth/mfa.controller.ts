import { Body, Controller, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { Request } from 'express';
import { MfaService } from './mfa.service';
import { AuthenticatedUser } from './jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

class ConfirmMfaDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

@ApiTags('Auth')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  /** Non documenté dans l'OpenAPI (qui ne couvre que la vérification) mais
   * indispensable : sans endpoint d'enrôlement, mfa_secret ne peut jamais
   * être renseigné, donc /auth/mfa/verify ne serait jamais utilisable. */
  @Post('enroll')
  async enroll(@Req() req: Request & { user: AuthenticatedUser }) {
    // L'email n'est pas dans le JWT (Specs : sub/org_id/role/scopes) —
    // à récupérer via un lookup si nécessaire ; simplifié ici.
    return this.mfaService.generateSecret(req.user.userId, req.user.userId);
  }

  @Post('enroll/confirm')
  async confirmEnroll(@Body() dto: ConfirmMfaDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.mfaService.confirmEnrollment(req.user.userId, dto.code);
  }

  // OpenAPI : POST /auth/mfa/verify, header X-MFA-Token (6 chiffres)
  @Post('verify')
  async verify(@Headers('x-mfa-token') mfaToken: string, @Req() req: Request & { user: AuthenticatedUser }) {
    if (!mfaToken || !/^[0-9]{6}$/.test(mfaToken)) {
      throw new UnauthorizedException('Header X-MFA-Token manquant ou invalide.');
    }
    await this.mfaService.verify(req.user.userId, mfaToken);
    return { verified: true };
  }
}
