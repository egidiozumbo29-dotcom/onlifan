import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { MassDmDto } from './dto/mass-dm.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @Post('conversations')
  start(@CurrentUser() user: { id: string }, @Body() dto: StartConversationDto) {
    return this.chat.startConversation(user.id, dto);
  }

  @Get('conversations')
  list(
    @CurrentUser() user: { id: string },
    @Query('role') role: 'fan' | 'creator' = 'fan',
  ) {
    return this.chat.listMyConversations(user.id, role);
  }

  @Get('conversations/:id/messages')
  messages(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(user.id, id, cursor, limit ? parseInt(limit, 10) : 50);
  }

  @Post('messages')
  async send(@CurrentUser() user: { id: string }, @Body() dto: SendMessageDto) {
    const message = await this.chat.sendMessage(user.id, dto);
    // Fanout via WS
    const conv = await this.chat.listMessages(user.id, dto.conversationId, undefined, 1);
    this.gateway.emitMessage(dto.conversationId, [], message);
    return message;
  }

  @Post('conversations/:id/read')
  read(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const result = this.chat.markRead(user.id, id);
    this.gateway.emitMessageRead(id, user.id);
    return result;
  }

  @Post('messages/:id/unlock')
  unlock(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.chat.unlockPpv(user.id, id);
  }

  @Post('messages/:id/react')
  react(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { emoji: string },
  ) {
    return this.chat.react(user.id, id, body.emoji);
  }

  @Delete('messages/:id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.chat.deleteMessage(user.id, id);
  }

  @Post('mass-dm')
  massDm(@CurrentUser() user: { id: string }, @Body() dto: MassDmDto) {
    return this.chat.sendMassDm(user.id, dto);
  }
}
