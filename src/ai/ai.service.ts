import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIRequest {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey() {
    return this.config.get<string>('OPENAI_API_KEY');
  }

  private get model() {
    return this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async complete(req: AIRequest): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY not set, returning placeholder response');
      return `[AI placeholder] ${req.prompt.slice(0, 80)}`;
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 400,
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      this.logger.error(`OpenAI error: ${res.status} ${txt}`);
      throw new Error(`OpenAI error: ${res.status}`);
    }
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0]?.message?.content?.trim() ?? '';
  }

  async caption(description: string, tone = 'engaging'): Promise<string> {
    return this.complete({
      system: `You write ${tone} social media captions for creators. Keep them under 280 characters.`,
      prompt: `Write a caption for: ${description}`,
      maxTokens: 150,
    });
  }

  async translate(text: string, targetLang: string): Promise<string> {
    return this.complete({
      system: 'You are a precise translator. Output only the translation, no commentary.',
      prompt: `Translate to ${targetLang}: ${text}`,
      maxTokens: Math.min(2000, text.length * 2),
    });
  }

  async chatbotReply(creatorPersona: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    if (!this.apiKey) return `[AI bot] (configura OPENAI_API_KEY)`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 400,
        messages: [{ role: 'system', content: creatorPersona }, ...history],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0]?.message?.content?.trim() ?? '';
  }
}
