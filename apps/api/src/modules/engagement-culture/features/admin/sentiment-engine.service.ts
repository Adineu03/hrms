import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { AiCoreService } from '../../../../shared/ai/ai-core.service';

type Sentiment = 'positive' | 'neutral' | 'negative';

const MAX_TEXTS = 60;

const AnalysisSchema = z.object({
  headline: z.string().describe('One-line overall read of how employees feel.'),
  results: z.array(
    z.object({
      index: z.number().describe('The index of the text being classified.'),
      sentiment: z.enum(['positive', 'neutral', 'negative']),
    }),
  ),
  themes: z.array(
    z.object({
      theme: z.string().describe('A short recurring theme (2–4 words).'),
      sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
    }),
  ),
});

export interface SentimentResult {
  ok: boolean;
  message?: string;
  headline?: string;
  summary?: { totalResponses: number; analyzed: number; positive: number; neutral: number; negative: number };
  themes?: { theme: string; sentiment: string }[];
  samples?: { sentiment: Sentiment; text: string }[];
}

/** Pull free-text strings out of a survey response's loosely-shaped `answers` jsonb. */
function extractTexts(answers: unknown): string[] {
  const out: string[] = [];
  const walk = (v: any) => {
    if (typeof v === 'string') {
      const s = v.trim();
      const isDate = /^\d{4}-\d{2}-\d{2}[T ]/.test(s);
      const isId = /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(s);
      if (s.length >= 12 && !isDate && !isId) out.push(s);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(answers);
  return out;
}

@Injectable()
export class SentimentEngineService {
  private readonly logger = new Logger(SentimentEngineService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly ai: AiCoreService,
  ) {}

  async analyze(orgId: string): Promise<SentimentResult> {
    const responses = await this.db
      .select({ id: schema.surveyResponses.id, answers: schema.surveyResponses.answers })
      .from(schema.surveyResponses)
      .where(and(eq(schema.surveyResponses.orgId, orgId), eq(schema.surveyResponses.isActive, true)))
      .orderBy(desc(schema.surveyResponses.submittedAt))
      .limit(500);

    // One text blob per response that actually has free-text.
    const blobs: string[] = [];
    for (const r of responses) {
      const texts = extractTexts(r.answers);
      if (texts.length) blobs.push(texts.join(' — '));
    }

    if (blobs.length === 0) {
      return {
        ok: true,
        summary: { totalResponses: responses.length, analyzed: 0, positive: 0, neutral: 0, negative: 0 },
        themes: [],
        samples: [],
        headline: 'No free-text survey feedback to analyze yet.',
      };
    }

    if (!this.ai.isReady()) {
      return { ok: false, message: 'Sentiment analysis is not configured on this server.' };
    }

    const subset = blobs.slice(0, MAX_TEXTS);
    try {
      const result = await this.ai.extractStructured<z.infer<typeof AnalysisSchema>>({
        name: 'SentimentEngine',
        schema: AnalysisSchema,
        instructions:
          'You analyze employee survey free-text. For EACH provided text (by index), classify its overall sentiment as positive, neutral, or negative. Then extract 3–6 recurring themes across all texts, each with its general sentiment. Write a one-line headline of the overall mood. Judge strictly from the texts — do not invent feedback. Provide a result for every index.',
        text: JSON.stringify(subset.map((t, i) => ({ index: i, text: t }))),
      });

      const byIndex = new Map(result.results.map((r) => [r.index, r.sentiment]));
      let positive = 0;
      let neutral = 0;
      let negative = 0;
      const samples: { sentiment: Sentiment; text: string }[] = [];
      const sampleSeen = new Set<Sentiment>();

      subset.forEach((text, i) => {
        const s = (byIndex.get(i) || 'neutral') as Sentiment;
        if (s === 'positive') positive++;
        else if (s === 'negative') negative++;
        else neutral++;
        if (!sampleSeen.has(s) || samples.filter((x) => x.sentiment === s).length < 2) {
          samples.push({ sentiment: s, text: text.length > 200 ? text.slice(0, 200) + '…' : text });
          sampleSeen.add(s);
        }
      });

      return {
        ok: true,
        headline: result.headline,
        summary: { totalResponses: responses.length, analyzed: subset.length, positive, neutral, negative },
        themes: result.themes || [],
        samples,
      };
    } catch (err: any) {
      this.logger.error('Sentiment analysis failed', err?.message || err);
      return { ok: false, message: 'Could not analyze sentiment. Please try again.' };
    }
  }
}
