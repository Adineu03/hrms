import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AiService.name);
  private readonly model = 'gpt-4o-mini';

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY') ?? 'sk-placeholder',
    });
  }

  async chat(systemPrompt: string, userMessage: string, jsonMode = true): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        max_tokens: 1024,
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content ?? '{}';
    } catch (err) {
      this.logger.warn(`OpenAI call failed: ${err}`);
      return jsonMode ? '{"error":"AI service temporarily unavailable"}' : 'AI service temporarily unavailable';
    }
  }

  async analyze(context: string, task: string): Promise<Record<string, unknown>> {
    const raw = await this.chat(
      'You are an expert HR analytics AI. Respond only with valid JSON.',
      `Context:\n${context}\n\nTask:\n${task}`,
      true,
    );
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { error: 'Failed to parse AI response', raw };
    }
  }
}
