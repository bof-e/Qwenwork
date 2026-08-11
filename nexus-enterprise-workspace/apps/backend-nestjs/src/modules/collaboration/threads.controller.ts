import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { Request } from 'express';
import { ThreadsService } from './threads.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

class PostMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

@ApiTags('Collaboration')
@Controller()
export class ThreadsController {
  constructor(private readonly service: ThreadsService) {}

  // x-required-role (OpenAPI): Viewer+
  @Get('threads')
  async list(@Query('entity_type') entityType: string, @Query('entity_id') entityId: string) {
    return this.service.listByEntity(entityType, entityId);
  }

  // x-required-role (OpenAPI): Authentifié
  @Post('threads/:id/messages')
  async postMessage(@Param('id') id: string, @Body() dto: PostMessageDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.service.postMessage(id, req.user.userId, dto.content, dto.mentions, dto.attachments);
  }
}
