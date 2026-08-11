import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaController } from './mfa.controller';
import { MfaService } from './mfa.service';
import { SsoController } from './sso.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      privateKey: (() => {
        if (!process.env.JWT_PRIVATE_KEY) throw new Error('JWT_PRIVATE_KEY is missing');
        return process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
      })(),
      publicKey: (() => {
        if (!process.env.JWT_PUBLIC_KEY) throw new Error('JWT_PUBLIC_KEY is missing');
        return process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
      })(),
      signOptions: { algorithm: 'RS256', expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController, MfaController, SsoController],
  providers: [AuthService, MfaService, JwtStrategy, RolesGuard],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
