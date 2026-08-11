import { Body, Controller, Injectable, Param, Post } from '@nestjs/common';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { MinRole } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

class ResolveProposalDto {
  @IsIn(['ACCEPTED', 'MODIFIED', 'REJECTED'])
  status!: string;

  @IsOptional()
  @IsObject()
  proposal_data?: Record<string, unknown>;
}

@Injectable()
class AiProposalsService {
  constructor(private readonly db: TenantPrismaService) {}

  async resolve(id: string, status: string, proposalData?: Record<string, unknown>) {
    const proposal = await this.db.client.aiProposals.update({
      where: { id },
      data: { status, proposal_data: (proposalData ?? undefined) as any },
    });

    if (status === 'ACCEPTED' || status === 'MODIFIED') {
      // Instancie la proposition dans logical_frameworks — hypothèse de forme :
      // proposal.proposal_data = { nodes: [{ level, name, parent_ref, ... }] }.
      const data = (proposalData ?? (proposal.proposal_data as Record<string, unknown>)) as {
        nodes?: Array<{ level: string; name: string; description?: string }>;
      };
      const created: Record<string, string> = {};
      for (const node of data.nodes ?? []) {
        const row = await this.db.client.logicalFrameworks.create({
          data: { project_id: proposal.project_id, level: node.level, name: node.name, description: node.description },
        });
        created[node.name] = row.id;
      }
    }

    return proposal;
  }
}

@ApiTags('Nexus AI')
@Controller('ai/proposals')
export class AiProposalsController {
  constructor(private readonly service: AiProposalsService) {}

  // x-required-role (OpenAPI): Manager+
  @MinRole('manager')
  @Post(':id')
  async resolve(@Param('id') id: string, @Body() dto: ResolveProposalDto) {
    return this.service.resolve(id, dto.status, dto.proposal_data);
  }
}

export { AiProposalsService };
