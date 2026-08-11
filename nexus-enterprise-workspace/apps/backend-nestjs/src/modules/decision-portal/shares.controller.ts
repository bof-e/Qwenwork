import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { IsArray, IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { SharesService } from './shares.service';
import { Public } from '../../common/decorators/public.decorator';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

class ShareReportDto {
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  allowed_emails?: string[];
}

@ApiTags('Decision Portal')
@Controller()
export class SharesController {
  constructor(private readonly service: SharesService) {}

  // x-required-role (OpenAPI): Manager+ (correctif audit du 4 juillet 2026, Specs §11.3)
  @MinRole('manager')
  @Post('reports/:id/share')
  async share(@Param('id') id: string, @Body() dto: ShareReportDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.createShareLink(id, req.user.userId, dto.expires_at, dto.password, dto.allowed_emails);
  }

  // x-required-role (OpenAPI): Public (jeton requis, header X-Share-Token)
  @Public()
  @Get('shared/:shareId')
  async getShared(@Param('shareId') shareId: string, @Headers('x-share-token') token: string, @Req() req: Request) {
    return this.service.getSharedContent(shareId, token, req.ip, req.headers['user-agent']);
  }
}
