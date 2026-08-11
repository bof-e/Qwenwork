import { Injectable } from '@nestjs/common';
// @google/genai est un module ESM-only ; NestJS compile par défaut en
// CommonJS (tsconfig "module": "commonjs") — un import statique échoue au
// build. require() dynamique + any en repli, trouvé et validé en conditions
// réelles (Windows/Docker local) avant d'être reporté ici.
let GoogleGenAI: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch {
  // Absent en environnement de build/test sans la dépendance installée —
  // l'erreur remonte plus tard, à l'utilisation réelle (getGemini()).
}
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * LlmGatewayClient (Specs §7.2.3, correctif audit du 4 juillet 2026).
 * Anonymisation SHA-256 (BR-03) avant tout appel externe + disjoncteur
 * Gemini <-> Claude (3 échecs consécutifs -> bascule 5 min).
 *
 * npm install @google/genai @anthropic-ai/sdk (à ajouter si absents)
 */
type Provider = 'gemini' | 'claude';

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000;

@Injectable()
export class LlmGatewayService {
  private tokenMap = new Map<string, string>();
  private breaker: Record<Provider, { failures: number; openUntil: number | null }> = {
    gemini: { failures: 0, openUntil: null },
    claude: { failures: 0, openUntil: null },
  };
  private geminiClient?: any;
  private claudeClient?: Anthropic;

  constructor(private readonly prisma: PrismaService) {}

  anonymize(text: string, sensitiveValues: string[]): string {
    let result = text;
    for (const value of sensitiveValues) {
      if (!value) continue;
      const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 10);
      const token = `[REF-${hash}]`;
      this.tokenMap.set(token, value);
      result = result.split(value).join(token);
    }
    return result;
  }

  deanonymize(text: string): string {
    let result = text;
    for (const [token, value] of this.tokenMap.entries()) result = result.split(token).join(value);
    return result;
  }

  async generateWithFallback(
    prompt: string,
    sensitiveValues: string[] = [],
    opts: { organizationId: string; userId?: string; endpoint: string; primary?: Provider } = {} as any
  ): Promise<{ text: string; providerUsed: Provider }> {
    const primary = opts.primary ?? 'gemini';
    const secondary: Provider = primary === 'gemini' ? 'claude' : 'gemini';
    const anonymized = this.anonymize(prompt, sensitiveValues);
    const order: Provider[] = this.isOpen(primary) ? [secondary, primary] : [primary, secondary];

    let lastError: unknown;
    for (const provider of order) {
      if (this.isOpen(provider)) continue;
      try {
        const raw = provider === 'gemini' ? await this.callGemini(anonymized) : await this.callClaude(anonymized);
        this.recordSuccess(provider);
        await this.logUsage(opts.organizationId, opts.userId, opts.endpoint, provider);
        return { text: this.deanonymize(raw), providerUsed: provider };
      } catch (err) {
        this.recordFailure(provider);
        lastError = err;
      }
    }
    throw new Error(`Fournisseurs LLM indisponibles : ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  private isOpen(p: Provider) {
    const s = this.breaker[p];
    if (s.openUntil && Date.now() < s.openUntil) return true;
    if (s.openUntil && Date.now() >= s.openUntil) { s.failures = 0; s.openUntil = null; }
    return false;
  }
  private recordFailure(p: Provider) {
    const s = this.breaker[p];
    s.failures += 1;
    if (s.failures >= FAILURE_THRESHOLD) s.openUntil = Date.now() + COOLDOWN_MS;
  }
  private recordSuccess(p: Provider) { this.breaker[p] = { failures: 0, openUntil: null }; }

  private getGemini(): any {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY manquant.');
      this.geminiClient = new GoogleGenAI({ apiKey });
    }
    return this.geminiClient;
  }
  private getClaude(): Anthropic {
    if (!this.claudeClient) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquant.');
      this.claudeClient = new Anthropic({ apiKey });
    }
    return this.claudeClient;
  }

  private async callGemini(prompt: string): Promise<string> {
    const res = await this.getGemini().models.generateContent({ model: 'gemini-3.5-flash', contents: prompt });
    if (!res.text) throw new Error('Réponse Gemini vide.');
    return res.text;
  }
  private async callClaude(prompt: string): Promise<string> {
    const res = await this.getClaude().messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = res.content[0];
    if (block.type !== 'text') throw new Error('Réponse Claude non textuelle.');
    return block.text;
  }

  /** Génère un embedding (pour RAG / pgvector) — Gemini uniquement, pas de fallback
   * Claude (espaces vectoriels non interchangeables, cf. Specs §7.2.3). */
  async generateEmbedding(text: string): Promise<number[]> {
    const res = await this.getGemini().models.embedContent({ model: 'text-embedding-004', contents: text });
    if (!res.embeddings?.[0]?.values) throw new Error("Échec de génération de l'embedding.");
    return res.embeddings[0].values;
  }

  private async logUsage(organizationId: string, userId: string | undefined, endpoint: string, model: Provider) {
    await this.prisma.aiUsageLogs.create({
      data: { organization_id: organizationId, user_id: userId, endpoint, model, anonymized: true },
    }).catch(() => undefined);
  }
}
