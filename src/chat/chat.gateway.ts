import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

type AuthedSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers.authorization as string | undefined)?.replace('Bearer ', '');
      if (!token) return client.disconnect();

      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me-access-secret',
      });

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.debug(`User ${payload.sub} connected via ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.data.userId) {
      this.logger.debug(`User ${client.data.userId} disconnected (${client.id})`);
    }
  }

  // Client joins a conversation room to receive realtime updates
  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const conv = await this.prisma.conversation.findUnique({
      where: { id: body.conversationId },
      include: { creator: true },
    });
    if (!conv) return;
    if (conv.fanId !== userId && conv.creator.userId !== userId) return;

    client.join(`conv:${body.conversationId}`);
    return { joined: true };
  }

  @SubscribeMessage('conversation:leave')
  leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    client.leave(`conv:${body.conversationId}`);
    return { left: true };
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(`conv:${body.conversationId}`).emit('typing', {
      conversationId: body.conversationId,
      userId,
      isTyping: body.isTyping,
    });
  }

  // Server-side fanout helpers
  emitMessage(conversationId: string, recipients: string[], message: unknown) {
    this.server.to(`conv:${conversationId}`).emit('message:new', message);
    for (const userId of recipients) {
      this.server.to(`user:${userId}`).emit('inbox:update', { conversationId, message });
    }
  }

  emitNotification(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitMessageRead(conversationId: string, readerId: string) {
    this.server.to(`conv:${conversationId}`).emit('message:read', { conversationId, readerId });
  }
}
