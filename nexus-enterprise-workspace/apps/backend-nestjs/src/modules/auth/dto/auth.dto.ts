import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

/**
 * POST /auth/register — pièce ABSENTE de l'OpenAPI v1.
 *
 * L'OpenAPI documente POST /organizations comme accessible à un
 * "utilisateur inscrit, pas encore membre d'une organisation" mais ne
 * documente nulle part comment cette inscription initiale (email + mot de
 * passe) a lieu pour un compte non-SSO. Sans cet endpoint, POST /auth/login
 * et POST /organizations sont inatteignables pour un premier utilisateur.
 * Ajouté ici par nécessité fonctionnelle — à faire valider/documenter
 * formellement dans l'OpenAPI (à signaler en revue produit).
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsBoolean()
  isFieldAccount?: boolean;
}
