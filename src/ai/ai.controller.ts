import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(private readonly service: AIService) {}

  @Post('caption')
  caption(@Body() body: { description: string; tone?: string }) {
    return this.service.caption(body.description, body.tone).then((text) => ({ text }));
  }

  @Post('translate')
  translate(@Body() body: { text: string; targetLang: string }) {
    return this.service.translate(body.text, body.targetLang).then((text) => ({ text }));
  }

  @Post('chatbot')
  chatbot(
    @Body()
    body: {
      persona: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    },
  ) {
    return this.service.chatbotReply(body.persona, body.history).then((text) => ({ text }));
  }
}
