import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUE_EXPORTS, ExportJobPayload } from '../../common/queue/queue.constants';

const EXPORTS_DIR = path.join(process.cwd(), 'storage', 'exports'); // TODO : S3/GCS en prod, disque local en dev uniquement

/**
 * Worker d'export (Chapitre 11, Module M6). CSV/JSON/EXCEL/PDF réellement
 * générés. Le PDF est une mise en page textuelle structurée (via pdfkit,
 * pur JS, aucun navigateur requis) — PAS un rendu pixel-perfect du
 * dashboard React tel qu'affiché à l'écran ; pour ça il faudrait un moteur
 * de capture visuelle (ex. puppeteer), plus lourd et hors périmètre ici.
 * PPTX/PNG restent des stubs explicites pour la même raison.
 */
@Processor(QUEUE_EXPORTS)
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  async process(job: Job<ExportJobPayload>): Promise<void> {
    const { exportJobId, entityType, entityId, format } = job.data;

    try {
      const data =
        entityType === 'dashboard'
          ? await this.prisma.dashboards.findUniqueOrThrow({ where: { id: entityId } })
          : await this.prisma.reports.findUniqueOrThrow({ where: { id: entityId } });

      const fileUrl = await this.render(exportJobId, format, data);

      await this.prisma.exportJobs.update({
        where: { id: exportJobId },
        data: { status: 'COMPLETED', file_url: fileUrl, completed_at: new Date() },
      });
    } catch (err) {
      this.logger.error(`Échec export ${exportJobId} :`, err);
      await this.prisma.exportJobs.update({
        where: { id: exportJobId },
        data: { status: 'FAILED', error_message: err instanceof Error ? err.message : String(err) },
      });
      throw err;
    }
  }

  private async render(exportJobId: string, format: string, data: unknown): Promise<string> {
    const filename = `${exportJobId}.${format.toLowerCase()}`;
    const filePath = path.join(EXPORTS_DIR, filename);

    switch (format) {
      case 'JSON':
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return `/storage/exports/${filename}`;
      case 'CSV':
        fs.writeFileSync(filePath, this.toCsv(data));
        return `/storage/exports/${filename}`;
      case 'EXCEL':
        await this.toExcel(filePath, data);
        return `/storage/exports/${filename}`;
      case 'PDF':
        await this.toPdf(filePath, data);
        return `/storage/exports/${filename}`;
      case 'PPTX':
      case 'PNG':
        this.logger.warn(`Format ${format} non implémenté — nécessite un moteur de rendu visuel (ex. puppeteer).`);
        throw new Error(`Génération ${format} non implémentée.`);
      default:
        throw new Error(`Format d'export inconnu : ${format}`);
    }
  }

  private toCsv(data: unknown): string {
    const obj = data as Record<string, unknown>;
    const headers = Object.keys(obj);
    const values = headers.map((h) => JSON.stringify(obj[h] ?? ''));
    return `${headers.join(',')}\n${values.join(',')}`;
  }

  private async toExcel(filePath: string, data: unknown): Promise<void> {
    const obj = data as Record<string, unknown>;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Export');

    const headers = Object.keys(obj);
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.addRow(headers.map((h) => this.flattenForExcel(obj[h])));
    sheet.columns.forEach((col) => (col.width = 24));

    await workbook.xlsx.writeFile(filePath);
  }

  /** ExcelJS n'accepte pas les objets/tableaux imbriqués tels quels dans une cellule. */
  private flattenForExcel(value: unknown): string | number | boolean | Date {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) {
      return value;
    }
    return String(value);
  }

  /** Mise en page textuelle structurée — pas un rendu visuel du dashboard, cf. commentaire de classe. */
  private async toPdf(filePath: string, data: unknown): Promise<void> {
    const obj = data as Record<string, unknown>;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(18).text((obj.name as string) ?? 'Export Nexus Enterprise Workspace', { underline: true });
      doc.moveDown();

      for (const [key, value] of Object.entries(obj)) {
        if (key === 'name') continue;
        doc.fontSize(11).font('Helvetica-Bold').text(`${key} :`, { continued: false });
        doc.font('Helvetica').fontSize(10).text(this.stringifyForPdf(value));
        doc.moveDown(0.5);
      }

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });
  }

  private stringifyForPdf(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
}

