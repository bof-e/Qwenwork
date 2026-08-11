import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { SyncService } from './sync.service';
import { SyncPushDto, ResolveSyncConflictDto } from './dto/ingestion.dto';
import { RequireScope, MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Ingestion')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // x-required-role (OpenAPI): Viewer+ (scope: field_sync) — Specs §2.2.4
  @RequireScope('field_sync')
  @Post('push')
  async push(@Body() dto: SyncPushDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.syncService.push(req.user.userId, dto);
  }

  @RequireScope('field_sync')
  @Get('pull')
  async pull(@Query('since') since?: string) {
    return this.syncService.pull(since);
  }

  // x-required-role (OpenAPI): Analyst+
  @MinRole('analyst')
  @Post('conflicts/:id/resolve')
  async resolveConflict(@Param('id') id: string, @Body() dto: ResolveSyncConflictDto) {
    return this.syncService.resolveConflict(id, dto);
  }
}
