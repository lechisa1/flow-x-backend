import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { CommunicationService } from '../communication.service';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, string[]> = new Map(); // userId -> socketIds[]
  private typingUsers: Map<
    number,
    { conversationId: number; timeout: NodeJS.Timeout }
  > = new Map();

  constructor(
    private authService: AuthService,
    private communicationService: CommunicationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);

      if (!user) {
        client.disconnect();
        return;
      }

      // Store socket connection
      const userSockets = this.userSockets.get(user.user_id) || [];
      userSockets.push(client.id);
      this.userSockets.set(user.user_id, userSockets);

      // Join user to their personal room
      client.join(`user:${user.user_id}`);

      // Join user to their node-based rooms
      const userNodes = await this.communicationService.getUserNodeIds(
        user.user_id,
      );
      userNodes.forEach((nodeId) => {
        client.join(`node:${nodeId}`);
      });

      // Join user to their group conversations
      const conversations =
        await this.communicationService.getUserConversationIds(user.user_id);
      conversations.forEach((convId) => {
        client.join(`conversation:${convId}`);
      });

      client.emit('connected', {
        message: 'Connected to chat server',
        user_id: user.user_id,
      });

      // Broadcast user online status
      this.server.emit('user_status', {
        user_id: user.user_id,
        status: 'online',
        timestamp: new Date(),
      });
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    let disconnectedUserId: number | null = null;

    // Remove socket from userSockets
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
          disconnectedUserId = userId;
        } else {
          this.userSockets.set(userId, sockets);
        }
        break;
      }
    }

    if (disconnectedUserId) {
      // Broadcast user offline status after delay (to handle reconnections)
      setTimeout(() => {
        const stillConnected = this.userSockets.has(disconnectedUserId);
        if (!stillConnected) {
          this.server.emit('user_status', {
            user_id: disconnectedUserId,
            status: 'offline',
            timestamp: new Date(),
          });
        }
      }, 60000); // 1 minute delay
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    const canAccess = await this.communicationService.canAccessConversation(
      data.conversation_id,
      user.user_id,
    );

    if (canAccess) {
      client.join(`conversation:${data.conversation_id}`);
      client.emit('joined_conversation', {
        conversation_id: data.conversation_id,
      });
    } else {
      throw new WsException('Access denied');
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversation_id: number;
      content: string;
      parent_message_id?: number;
      attachments?: number[];
    },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    const message = await this.communicationService.sendMessage(
      data.conversation_id,
      user.user_id,
      data.content,
      data.parent_message_id,
      data.attachments,
    );

    // Broadcast to all participants in the conversation
    this.server.to(`conversation:${data.conversation_id}`).emit('new_message', {
      conversation_id: data.conversation_id,
      message,
      user_id: user.user_id,
      user_name: user.full_name,
      timestamp: new Date(),
    });

    return message;
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number; is_typing: boolean },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    // Clear previous timeout
    const existing = this.typingUsers.get(user.user_id);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    if (data.is_typing) {
      // Set timeout to stop typing after 3 seconds of no activity
      const timeout = setTimeout(() => {
        this.server
          .to(`conversation:${data.conversation_id}`)
          .emit('user_typing', {
            conversation_id: data.conversation_id,
            user_id: user.user_id,
            user_name: user.full_name,
            is_typing: false,
          });
        this.typingUsers.delete(user.user_id);
      }, 3000);

      this.typingUsers.set(user.user_id, {
        conversationId: data.conversation_id,
        timeout,
      });

      this.server
        .to(`conversation:${data.conversation_id}`)
        .emit('user_typing', {
          conversation_id: data.conversation_id,
          user_id: user.user_id,
          user_name: user.full_name,
          is_typing: true,
        });
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number; message_id: number },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    await this.communicationService.markMessageAsRead(
      data.message_id,
      user.user_id,
    );

    // Notify others that user read the message
    this.server
      .to(`conversation:${data.conversation_id}`)
      .emit('message_read', {
        conversation_id: data.conversation_id,
        message_id: data.message_id,
        user_id: user.user_id,
        user_name: user.full_name,
        read_at: new Date(),
      });
  }

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message_id: number; reaction_type: string },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    const reaction = await this.communicationService.addReaction(
      data.message_id,
      user.user_id,
      data.reaction_type,
    );

    const message = await this.communicationService.getMessage(data.message_id);

    this.server
      .to(`conversation:${message.conversation_id}`)
      .emit('reaction_added', {
        message_id: data.message_id,
        reaction: reaction,
        user_id: user.user_id,
        user_name: user.full_name,
      });
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message_id: number; reaction_type: string },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    await this.communicationService.removeReaction(
      data.message_id,
      user.user_id,
      data.reaction_type,
    );

    const message = await this.communicationService.getMessage(data.message_id);

    this.server
      .to(`conversation:${message.conversation_id}`)
      .emit('reaction_removed', {
        message_id: data.message_id,
        reaction_type: data.reaction_type,
        user_id: user.user_id,
      });
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message_id: number },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    const message = await this.communicationService.getMessage(data.message_id);
    const canDelete = message.sender_user_id === user.user_id;

    if (canDelete) {
      await this.communicationService.deleteMessage(data.message_id);

      this.server
        .to(`conversation:${message.conversation_id}`)
        .emit('message_deleted', {
          message_id: data.message_id,
          deleted_by: user.user_id,
          deleted_at: new Date(),
        });
    }
  }
  @SubscribeMessage('reply_to_message')
  async handleReplyToMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversation_id: number;
      parent_message_id: number;
      content: string;
      attachments?: number[];
    },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    const message = await this.communicationService.replyToMessage(
      data.conversation_id,
      data.parent_message_id,
      user.user_id,
      data.content,
      data.attachments,
    );

    // Broadcast to all participants
    this.server.to(`conversation:${data.conversation_id}`).emit('new_reply', {
      conversation_id: data.conversation_id,
      parent_message_id: data.parent_message_id,
      message,
      user_id: user.user_id,
      user_name: user.full_name,
      timestamp: new Date(),
    });

    return message;
  }

  @SubscribeMessage('get_thread')
  async handleGetThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message_id: number },
  ) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);

    const thread = await this.communicationService.getMessageThread(
      data.message_id,
      user.user_id,
    );

    client.emit('thread_data', thread);
  }
}
