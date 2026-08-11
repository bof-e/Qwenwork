import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { InvitationsService } from './invitations.service';
import { CreateOrganizationDto, InviteUserDto } from './dto/organizations.dto';
import { MinRole } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly invitationsService: InvitationsService
  ) {}

  // x-required-role (OpenAPI): Public (utilisateur inscrit, pas encore membre)
  // -> en pratique "Authentifié" : JwtAuthGuard (global) suffit, pas de @MinRole.
  @Post()
  async create(@Body() dto: CreateOrganizationDto, @Req() req: Request & { user: AuthenticatedUser }) {
    return this.organizationsService.create(req.user.userId, dto.name, dto.industry);
  }

  // x-required-role (OpenAPI): Authentifié
  @Get()
  async list() {
    return this.organizationsService.listForUser();
  }

  // x-required-role (OpenAPI): Viewer+ — RLS (current_user_id) fait déjà le filtrage
  // d'appartenance ; @MinRole n'a de sens ici que si l'on voulait un seuil au-delà
  // de "membre", ce qui n'est pas le cas (Viewer = niveau 0 = tout membre).
  @Get(':orgId')
  async getOne(@Param('orgId') orgId: string) {
    return this.organizationsService.getById(orgId);
  }

  // x-required-role (OpenAPI): Owner ou Executive
  @MinRole('executive')
  @Post(':orgId/users/invite')
  async invite(@Param('orgId') orgId: string, @Body() dto: InviteUserDto) {
    return this.invitationsService.invite(orgId, dto.email, dto.role);
  }
}
