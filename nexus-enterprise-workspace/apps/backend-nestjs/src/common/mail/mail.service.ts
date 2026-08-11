import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envoi d'email réel — comble le TODO documenté depuis le module M1
 * (invitations.service.ts : "à brancher un vrai envoi d'email").
 *
 * Sans SMTP_HOST configuré (dev par défaut), bascule sur un transport
 * "console" qui journalise le contenu de l'email au lieu de l'envoyer —
 * permet de tester le flux d'invitation de bout en bout sans dépendance
 * externe, sans jamais faire échouer silencieusement un vrai envoi en prod
 * (si SMTP_HOST est présent mais mal configuré, l'erreur remonte normalement).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST) return null; // mode dev : pas de SMTP configuré
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
    }
    return this.transporter;
  }

  async sendInvitation(toEmail: string, organizationName: string, inviteUrl: string): Promise<void> {
    const subject = `Invitation à rejoindre ${organizationName} sur Nexus Enterprise Workspace`;
    const html = `
      <p>Vous avez été invité(e) à rejoindre <b>${organizationName}</b>.</p>
      <p><a href="${inviteUrl}">Accepter l'invitation</a> (valide 72 heures).</p>
      <p>Si vous n'attendiez pas cet email, vous pouvez l'ignorer sans risque.</p>
    `;

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`[MODE DEV — SMTP_HOST absent] Email non envoyé à ${toEmail}.\nSujet : ${subject}\nLien : ${inviteUrl}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@nexus-workspace.local',
      to: toEmail,
      subject,
      html,
    });
  }
}
