import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agent, run, setDefaultOpenAIKey, setTracingDisabled } from '@openai/agents';
import type { z } from 'zod';

const DEFAULT_MODEL = 'gpt-5.5';

/**
 * Shared OpenAI plumbing for the standalone AI features (Receipt Scanner,
 * Column Mapper, JD Generator, anomaly explanations, …). Bootstraps the OpenAI
 * API key + disables tracing once for the whole app, and exposes two helpers:
 *   - extractStructured(): force a validated structured (zod) output, optionally
 *     from an image (vision).
 *   - generateText(): free-form text generation.
 *
 * Uses the OpenAI Agents SDK under the hood (same stack as the assistant), but
 * as a single-shot call (no tools, no loop). Auth = OpenAI API key only.
 */
@Injectable()
export class AiCoreService implements OnModuleInit {
  private readonly logger = new Logger(AiCoreService.name);
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (key) {
      setDefaultOpenAIKey(key);
      setTracingDisabled(true); // never export prompts/data to OpenAI tracing
      this.ready = true;
      this.logger.log(`AI core ready (model: ${DEFAULT_MODEL})`);
    } else {
      this.logger.warn('OPENAI_API_KEY not set — standalone AI features will be unavailable');
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Normalize a raw base64 string or a full data URL into a data URL. */
  static toDataUrl(input: string): string {
    return input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
  }

  private buildInput(text?: string, imageDataUrl?: string): string | any[] {
    if (imageDataUrl) {
      const content: any[] = [];
      if (text) content.push({ type: 'input_text', text });
      content.push({ type: 'input_image', image: imageDataUrl, providerData: { detail: 'auto' } });
      return [{ role: 'user', content }];
    }
    return text ?? '';
  }

  /** Run a single structured-output extraction. Returns the validated object. */
  async extractStructured<T>(opts: {
    schema: z.ZodType<T>;
    instructions: string;
    text?: string;
    imageDataUrl?: string;
    model?: string;
    name?: string;
  }): Promise<T> {
    if (!this.ready) throw new Error('AI is not configured');
    const agent = new Agent({
      name: opts.name || 'Extractor',
      instructions: opts.instructions,
      model: opts.model || DEFAULT_MODEL,
      outputType: opts.schema as any,
    });
    const result = await run(agent, this.buildInput(opts.text, opts.imageDataUrl) as any);
    return result.finalOutput as T;
  }

  /** Run a single free-form text generation. Returns the text. */
  async generateText(opts: {
    instructions: string;
    text?: string;
    imageDataUrl?: string;
    model?: string;
    name?: string;
  }): Promise<string> {
    if (!this.ready) throw new Error('AI is not configured');
    const agent = new Agent({
      name: opts.name || 'Generator',
      instructions: opts.instructions,
      model: opts.model || DEFAULT_MODEL,
    });
    const result = await run(agent, this.buildInput(opts.text, opts.imageDataUrl) as any);
    return (result.finalOutput as string) || '';
  }
}
