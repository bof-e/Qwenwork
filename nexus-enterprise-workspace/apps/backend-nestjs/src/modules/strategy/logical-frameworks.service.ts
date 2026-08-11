import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { CreateLogicalFrameworkNodeDto } from './dto/strategy.dto';

@Injectable()
export class LogicalFrameworksService {
  constructor(private readonly db: TenantPrismaService) {}

  async create(dto: CreateLogicalFrameworkNodeDto) {
    return this.db.client.logicalFrameworks.create({ data: dto });
  }

  async listByProject(projectId: string) {
    return this.db.client.logicalFrameworks.findMany({
      where: { project_id: projectId },
      orderBy: [{ level: 'asc' }, { order_index: 'asc' }],
    });
  }

  /**
   * Import massif (US-01). Chaque ligne : level, code, name, description,
   * parent (référence l'id de ligne d'un parent, pas un UUID réel — celui-ci
   * n'existe qu'après insertion). Reconstruction BFS : on insère d'abord les
   * lignes sans "parent", puis on descend niveau par niveau en résolvant
   * "parent" (id de ligne) -> UUID réellement créé.
   */
  async importFromExcel(projectId: string, fileBuffer: Buffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<{
      row_id: string;
      parent?: string;
      level: string;
      code?: string;
      name: string;
      description?: string;
    }>(sheet);

    const created: Record<string, string> = {}; // row_id (fichier) -> id réel (DB)
    const pending = [...rows];
    const results: unknown[] = [];
    let guard = 0;

    while (pending.length > 0 && guard < rows.length + 1) {
      guard++;
      for (let i = pending.length - 1; i >= 0; i--) {
        const row = pending[i];
        const parentRealId = row.parent ? created[row.parent] : undefined;
        if (row.parent && !parentRealId) continue; // parent pas encore créé, on repasse plus tard

        const node = await this.db.client.logicalFrameworks.create({
          data: {
            project_id: projectId,
            level: row.level,
            code: row.code,
            name: row.name,
            description: row.description,
            parent_id: parentRealId,
          },
        });
        created[row.row_id] = node.id;
        results.push(node);
        pending.splice(i, 1);
      }
    }

    return results;
  }
}
