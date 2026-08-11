import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
// @ts-ignore — pdf-parse n'a pas de types officiels à jour
import pdfParse from 'pdf-parse';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { LlmGatewayService } from './llm-gateway.service';

const CHUNK_SIZE_CHARS = 1500; // approximation simple ; à affiner (découpage par phrase/paragraphe)

@Injectable()
export class AiDocumentsService {
  constructor(
    private readonly db: TenantPrismaService,
    private readonly llm: LlmGatewayService
  ) {}

  /**
   * POST /ai/documents — Chapitre 7.2.1. Extraction -> chunking -> embedding
   * (pgvector). L'analyse "proposition de cadre logique" (AiProposals) est
   * laissée en TODO — nécessite un prompt structuré dédié en plus de
   * l'indexation RAG couverte ici.
   */
  async upload(organizationId: string, userId: string, projectId: string, file: Express.Multer.File) {
    const document = await this.db.client.aiDocuments.create({
      data: {
        organization_id: organizationId,
        project_id: projectId,
        name: file.originalname,
        file_url: `local://pending/${file.originalname}`, // TODO : upload S3/GCS réel
        file_type: file.mimetype,
        file_size: BigInt(file.size),
        uploaded_by_user_id: userId,
        processing_status: 'PROCESSING',
      },
    });

    try {
      const text = await this.extractText(file);
      const chunks = this.chunkText(text);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.llm.generateEmbedding(chunks[i]);
        const chunk = await this.db.client.documentChunks.create({
          data: { document_id: document.id, chunk_index: i, content: chunks[i] },
        });
        // embedding_vector est Unsupported("vector") côté Prisma -> écriture en SQL brut.
        await this.db.client.$executeRawUnsafe(
          `UPDATE document_chunks SET embedding_vector = $1::vector WHERE id = $2`,
          `[${embedding.join(',')}]`,
          chunk.id
        );
      }

      return this.db.client.aiDocuments.update({
        where: { id: document.id },
        data: { processing_status: 'READY', chunk_count: chunks.length },
      });
    } catch (err) {
      await this.db.client.aiDocuments.update({ where: { id: document.id }, data: { processing_status: 'FAILED' } });
      throw err;
    }
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    if (file.mimetype.includes('pdf')) {
      const parsed = await pdfParse(file.buffer);
      return parsed.text;
    }
    if (file.mimetype.includes('word') || file.originalname.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value;
    }
    return file.buffer.toString('utf-8');
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE_CHARS) {
      chunks.push(text.slice(i, i + CHUNK_SIZE_CHARS));
    }
    return chunks;
  }
}
