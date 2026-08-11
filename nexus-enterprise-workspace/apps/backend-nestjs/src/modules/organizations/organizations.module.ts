import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, InvitationsService],
})
export class OrganizationsModule {}
