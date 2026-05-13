import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateConversationDto,
  SendMessageDto,
  AddParticipantsDto,
} from './dto';
import {
  ConversationResponseDto,
  MessageWithDetails,
  ChatRequestWithDetails,
} from './interfaces/chat.interface';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== Conversation Management ====================

  async createConversation(
    createDto: CreateConversationDto,
    userId: number,
  ): Promise<ConversationResponseDto> {
    // Get conversation type
    const conversationType = await this.prisma.conversationType.findUnique({
      where: { type_name: createDto.conversation_type },
    });

    if (!conversationType) {
      throw new BadRequestException(
        `Invalid conversation type: ${createDto.conversation_type}`,
      );
    }

    // For direct chat, check if conversation already exists
    if (
      createDto.conversation_type === 'direct' &&
      createDto.participant_ids?.length === 1
    ) {
      const existingConversation = await this.findDirectConversation(
        userId,
        createDto.participant_ids[0],
      );
      if (existingConversation) {
        return this.getConversationDetails(
          existingConversation.conversation_id,
          userId,
        );
      }
    }

    // For node-based conversation, user must belong to that node
    if (createDto.conversation_type === 'node' && createDto.org_node_id) {
      const userAssignment = await this.prisma.userAssignment.findFirst({
        where: {
          user_id: userId,
          org_node_id: createDto.org_node_id,
        },
      });

      if (!userAssignment) {
        throw new ForbiddenException(
          'You must be a member of this node to create a node conversation',
        );
      }
    }

    // Create conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        title: createDto.title,
        initiator_user_id: userId,
        org_node_id: createDto.org_node_id,
        conversation_type_id: conversationType.conversation_type_id,
      },
    });

    // Add creator as participant
    await this.prisma.conversationParticipant.create({
      data: {
        conversation_id: conversation.conversation_id,
        user_id: userId,
      },
    });

    // Add other participants
    if (createDto.participant_ids && createDto.participant_ids.length > 0) {
      const uniqueParticipants = [...new Set([...createDto.participant_ids])];

      for (const participantId of uniqueParticipants) {
        // For direct/group chat, check if user is allowed to add this person
        if (
          createDto.conversation_type === 'direct' ||
          createDto.conversation_type === 'group'
        ) {
          // Check if not blocked
          const isBlocked = await this.isUserBlocked(participantId, userId);
          if (isBlocked) {
            continue; // Skip blocked users
          }
        }

        await this.prisma.conversationParticipant.create({
          data: {
            conversation_id: conversation.conversation_id,
            user_id: participantId,
          },
        });
      }
    }

    // For node conversation, add all node members
    if (createDto.conversation_type === 'node' && createDto.org_node_id) {
      await this.addNodeMembersToConversation(
        conversation.conversation_id,
        createDto.org_node_id,
      );
    }

    this.logger.log(
      `Conversation created: ${conversation.title} by user ${userId}`,
    );

    return this.getConversationDetails(conversation.conversation_id, userId);
  }

  async getUserConversations(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const participantEntries =
      await this.prisma.conversationParticipant.findMany({
        where: { user_id: userId },
        include: {
          conversation: {
            include: {
              conversation_type: true,
              org_node: true,
              participants: {
                include: {
                  user: {
                    select: {
                      user_id: true,
                      full_name: true,
                      email: true,
                      profile_pic_url: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { sent_at: 'desc' },
                take: 1,
                include: {
                  sender: {
                    select: {
                      user_id: true,
                      full_name: true,
                    },
                  },
                },
              },
              pinned_by_users: {
                where: { pinned_by_user_id: userId },
              },
            },
          },
        },
        orderBy: { conversation: { updated_at: 'desc' } },
        skip,
        take: limit,
      });

    const conversations = await Promise.all(
      participantEntries.map(async (entry) => {
        const conversation = entry.conversation;
        const unreadCount = await this.getUnreadCount(
          conversation.conversation_id,
          userId,
        );

        return {
          conversation_id: conversation.conversation_id,
          title: conversation.title,
          conversation_type: conversation.conversation_type.type_name,
          org_node_id: conversation.org_node_id,
          org_node_name: conversation.org_node?.node_name,
          is_active: conversation.is_active,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          unread_count: unreadCount,
          last_message: conversation.messages[0]
            ? {
                message_id: conversation.messages[0].message_id,
                content_text: conversation.messages[0].content_text,
                sent_at: conversation.messages[0].sent_at,
                sender_name: conversation.messages[0].sender.full_name,
              }
            : null,
          participants: conversation.participants.map((p) => ({
            user_id: p.user.user_id,
            full_name: p.user.full_name,
            email: p.user.email,
            profile_pic_url: p.user.profile_pic_url,
            joined_at: p.joined_at,
          })),
          participant_count: conversation.participants.length,
          is_pinned: conversation.pinned_by_users.length > 0,
        };
      }),
    );

    return {
      data: conversations,
      meta: {
        page,
        limit,
        total: participantEntries.length,
        totalPages: Math.ceil(participantEntries.length / limit),
      },
    };
  }

  async getConversationDetails(
    conversationId: number,
    userId: number,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversation_id: conversationId, is_active: true },
      include: {
        conversation_type: true,
        org_node: true,
        participants: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
                profile_pic_url: true,
              },
            },
          },
        },
        pinned_by_users: {
          where: { pinned_by_user_id: userId },
        },
        messages: {
          orderBy: { sent_at: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.user.user_id === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const unreadCount = await this.getUnreadCount(conversationId, userId);

    return {
      conversation_id: conversation.conversation_id,
      title: conversation.title,
      conversation_type: conversation.conversation_type.type_name,
      org_node_id: conversation.org_node_id ?? undefined,
      org_node_name: conversation.org_node?.node_name,
      is_active: conversation.is_active,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      unread_count: unreadCount,
      last_message: conversation.messages[0]
        ? {
            message_id: conversation.messages[0].message_id,
            content_text: conversation.messages[0].content_text,
            sent_at: conversation.messages[0].sent_at,
            sender_name: conversation.messages[0].sender.full_name,
            sender_id: conversation.messages[0].sender.user_id,
            is_read: false,
          }
        : undefined,
      participants: conversation.participants.map((p) => ({
        user_id: p.user.user_id,
        full_name: p.user.full_name,
        email: p.user.email,
        profile_pic_url: p.user.profile_pic_url ?? undefined,
        last_read_at: p.last_read_at ?? undefined,
        joined_at: p.joined_at,
        is_admin: undefined,
      })),
      participant_count: conversation.participants.length,
      is_pinned: conversation.pinned_by_users.length > 0,
    };
  }

  async getMessages(
    conversationId: number,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    // Verify access
    await this.getConversationDetails(conversationId, userId);

    const skip = (page - 1) * limit;

    const messages = await this.prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        deleted_at: null,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        read_by: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
      orderBy: { sent_at: 'desc' },
      skip,
      take: limit,
    });

    return {
      data: messages.reverse(), // Return in ascending order
      meta: {
        page,
        limit,
        total: messages.length,
      },
    };
  }

  async sendMessage(
    conversationId: number,
    userId: number,
    content: string,
    parentMessageId?: number,
    attachmentIds?: number[],
  ): Promise<MessageWithDetails> {
    // Verify user is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Check if conversation is active
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversation_id: conversationId },
    });

    if (!conversation?.is_active) {
      throw new BadRequestException('Conversation is not active');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_user_id: userId,
        parent_message_id: parentMessageId,
        content_text: content,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
      },
    });

    // Update conversation updated_at
    await this.prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: { updated_at: new Date() },
    });

    // Add attachments and fetch their details
    let attachments: {
      file_id: number;
      file_name: string;
      file_url: string;
    }[] = [];
    if (attachmentIds && attachmentIds.length > 0) {
      for (const fileId of attachmentIds) {
        await this.prisma.messageAttachment.create({
          data: {
            message_id: message.message_id,
            file_id: fileId,
          },
        });
      }

      // Fetch attachments with file details
      const attachmentRecords = await this.prisma.messageAttachment.findMany({
        where: { message_id: message.message_id },
        include: { file: true },
      });

      attachments = attachmentRecords.map((a) => ({
        file_id: a.file.file_id,
        file_name: a.file.file_name,
        file_url: a.file.file_url,
      }));
    }

    this.logger.log(
      `Message sent in conversation ${conversationId} by user ${userId}`,
    );

    return {
      message_id: message.message_id,
      content_text: message.content_text,
      sender_user_id: message.sender.user_id,
      sender_name: message.sender.full_name,
      sender_email: message.sender.email,
      sender_profile_pic: message.sender.profile_pic_url ?? undefined,
      sent_at: message.sent_at,
      is_edited: message.is_edited,
      parent_message_id: message.parent_message_id ?? undefined,
      reactions: [],
      read_by: [],
      attachments,
    };
  }

  async markMessageAsRead(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({
      where: { message_id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.prisma.messageRead.upsert({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId,
        },
      },
      update: {
        read_at: new Date(),
      },
      create: {
        message_id: messageId,
        user_id: userId,
      },
    });

    // Update participant's last_read_at
    await this.prisma.conversationParticipant.update({
      where: {
        conversation_id_user_id: {
          conversation_id: message.conversation_id,
          user_id: userId,
        },
      },
      data: {
        last_read_at: new Date(),
      },
    });
  }

  async addReaction(messageId: number, userId: number, reactionType: string) {
    return this.prisma.messageReaction.upsert({
      where: {
        message_id_user_id_reaction_type: {
          message_id: messageId,
          user_id: userId,
          reaction_type: reactionType,
        },
      },
      update: {},
      create: {
        message_id: messageId,
        user_id: userId,
        reaction_type: reactionType,
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
          },
        },
      },
    });
  }

  async removeReaction(
    messageId: number,
    userId: number,
    reactionType: string,
  ) {
    await this.prisma.messageReaction.delete({
      where: {
        message_id_user_id_reaction_type: {
          message_id: messageId,
          user_id: userId,
          reaction_type: reactionType,
        },
      },
    });
  }

  async deleteMessage(messageId: number) {
    await this.prisma.message.update({
      where: { message_id: messageId },
      data: { deleted_at: new Date() },
    });
  }

  async addParticipants(
    conversationId: number,
    userId: number,
    addDto: AddParticipantsDto,
  ): Promise<{ user_id: number; status: string }[]> {
    // Verify user is creator or admin
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversation_id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isCreator = conversation.initiator_user_id === userId;
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });
    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        'Only conversation creator can add participants',
      );
    }

    const results: { user_id: number; status: string }[] = [];
    for (const participantId of addDto.user_ids) {
      try {
        await this.prisma.conversationParticipant.create({
          data: {
            conversation_id: conversationId,
            user_id: participantId,
          },
        });
        results.push({ user_id: participantId, status: 'added' });
      } catch (error) {
        results.push({ user_id: participantId, status: 'already_exists' });
      }
    }

    return results;
  }

  async removeParticipant(
    conversationId: number,
    userId: number,
    targetUserId: number,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { conversation_id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isCreator = conversation.initiator_user_id === userId;
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });
    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (!isCreator && !isAdmin && userId !== targetUserId) {
      throw new ForbiddenException('Cannot remove this user');
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: targetUserId,
        },
      },
    });

    return { message: 'Participant removed successfully' };
  }

  async pinConversation(conversationId: number, userId: number) {
    await this.prisma.pinnedConversation.create({
      data: {
        conversation_id: conversationId,
        pinned_by_user_id: userId,
      },
    });
    return { message: 'Conversation pinned' };
  }

  async unpinConversation(conversationId: number, userId: number) {
    await this.prisma.pinnedConversation.delete({
      where: {
        conversation_id_pinned_by_user_id: {
          conversation_id: conversationId,
          pinned_by_user_id: userId,
        },
      },
    });
    return { message: 'Conversation unpinned' };
  }

  // ==================== Chat Requests (Cross-Node Communication) ====================

  async sendChatRequest(
    fromUserId: number,
    toUserId: number,
    message?: string,
  ) {
    // Check if already blocked
    const isBlocked = await this.isUserBlocked(toUserId, fromUserId);
    if (isBlocked) {
      throw new ForbiddenException('You cannot send request to this user');
    }

    // Check if already have an active conversation
    const existingConversation = await this.findDirectConversation(
      fromUserId,
      toUserId,
    );
    if (existingConversation) {
      throw new BadRequestException(
        'You already have a conversation with this user',
      );
    }

    // Check for existing pending request
    const existingRequest = await this.prisma.chatRequest.findFirst({
      where: {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending request to this user',
      );
    }

    const request = await this.prisma.chatRequest.create({
      data: {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message: message,
        status: 'pending',
      },
      include: {
        from_user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        to_user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
      },
    });

    this.logger.log(`Chat request sent from ${fromUserId} to ${toUserId}`);

    return request;
  }

  async respondToChatRequest(
    requestId: number,
    userId: number,
    status: string,
  ) {
    const request = await this.prisma.chatRequest.findUnique({
      where: { request_id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Chat request not found');
    }

    if (request.to_user_id !== userId) {
      throw new ForbiddenException('You are not the recipient of this request');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request has already been processed');
    }

    if (status === 'accepted') {
      // Create direct conversation

      const conversationType = await this.prisma.conversationType.findUnique({
        where: { type_name: 'direct' },
      });

      if (!conversationType) {
        throw new NotFoundException('Direct conversation type not found');
      }
      const conversation = await this.prisma.conversation.create({
        data: {
          title: `Chat between ${request.from_user_id} and ${request.to_user_id}`,
          initiator_user_id: request.from_user_id,
          conversation_type_id: conversationType.conversation_type_id,
        },
      });

      // Add both participants
      await this.prisma.conversationParticipant.createMany({
        data: [
          {
            conversation_id: conversation.conversation_id,
            user_id: request.from_user_id,
          },
          {
            conversation_id: conversation.conversation_id,
            user_id: request.to_user_id,
          },
        ],
      });

      // Update request
      await this.prisma.chatRequest.update({
        where: { request_id: requestId },
        data: {
          status: 'accepted',
          conversation_id: conversation.conversation_id,
          responded_at: new Date(),
        },
      });

      this.logger.log(
        `Chat request ${requestId} accepted, conversation ${conversation.conversation_id} created`,
      );

      return {
        message: 'Request accepted',
        conversation_id: conversation.conversation_id,
      };
    } else {
      await this.prisma.chatRequest.update({
        where: { request_id: requestId },
        data: {
          status: status,
          responded_at: new Date(),
        },
      });

      if (status === 'blocked') {
        await this.blockUser(
          userId,
          request.from_user_id,
          'Blocked from chat request',
        );
      }

      return { message: `Request ${status}` };
    }
  }

  async getPendingRequests(userId: number) {
    const requests = await this.prisma.chatRequest.findMany({
      where: {
        to_user_id: userId,
        status: 'pending',
      },
      include: {
        from_user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
      },
      orderBy: { requested_at: 'desc' },
    });

    return requests;
  }

  async getSentRequests(userId: number) {
    const requests = await this.prisma.chatRequest.findMany({
      where: {
        from_user_id: userId,
      },
      include: {
        to_user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
      },
      orderBy: { requested_at: 'desc' },
    });

    return requests;
  }

  // ==================== Block User ====================

  async blockUser(blockerId: number, blockedId: number, reason?: string) {
    const existing = await this.prisma.blockedUser.findUnique({
      where: {
        blocker_id_blocked_id: {
          blocker_id: blockerId,
          blocked_id: blockedId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already blocked');
    }

    const block = await this.prisma.blockedUser.create({
      data: {
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason: reason,
      },
    });

    // Delete any existing conversation between these users
    const conversation = await this.findDirectConversation(
      blockerId,
      blockedId,
    );
    if (conversation) {
      await this.prisma.conversation.update({
        where: { conversation_id: conversation.conversation_id },
        data: { is_active: false },
      });
    }

    // Delete any pending chat requests
    await this.prisma.chatRequest.updateMany({
      where: {
        OR: [
          { from_user_id: blockerId, to_user_id: blockedId, status: 'pending' },
          { from_user_id: blockedId, to_user_id: blockerId, status: 'pending' },
        ],
      },
      data: { status: 'blocked' },
    });

    this.logger.log(`User ${blockerId} blocked user ${blockedId}`);

    return block;
  }

  async unblockUser(blockerId: number, blockedId: number) {
    await this.prisma.blockedUser.delete({
      where: {
        blocker_id_blocked_id: {
          blocker_id: blockerId,
          blocked_id: blockedId,
        },
      },
    });

    return { message: 'User unblocked' };
  }

  async getBlockedUsers(userId: number) {
    const blocked = await this.prisma.blockedUser.findMany({
      where: { blocker_id: userId },
      include: {
        blockedUser: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
      },
    });

    return blocked;
  }

  // ==================== Helper Methods ====================

  async canAccessConversation(
    conversationId: number,
    userId: number,
  ): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: userId,
        },
      },
    });
    return !!participant;
  }

  async getUserNodeIds(userId: number): Promise<number[]> {
    const assignments = await this.prisma.userAssignment.findMany({
      where: { user_id: userId },
      select: { org_node_id: true },
    });
    return assignments.map((a) => a.org_node_id);
  }

  async getUserConversationIds(userId: number): Promise<number[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });
    return participants.map((p) => p.conversation_id);
  }

  async getMessage(messageId: number) {
    const message = await this.prisma.message.findUnique({
      where: { message_id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  private async getUnreadCount(
    conversationId: number,
    userId: number,
  ): Promise<number> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: userId,
        },
      },
      select: { last_read_at: true },
    });

    const lastReadAt = participant?.last_read_at || new Date(0);

    const unreadCount = await this.prisma.message.count({
      where: {
        conversation_id: conversationId,
        sent_at: { gt: lastReadAt },
        deleted_at: null,
        NOT: {
          read_by: {
            some: { user_id: userId },
          },
        },
      },
    });

    return unreadCount;
  }

  private async findDirectConversation(userId1: number, userId2: number) {
    const conversations1 = await this.prisma.conversationParticipant.findMany({
      where: { user_id: userId1 },
      select: { conversation_id: true },
    });

    const conversationIds1 = conversations1.map((c) => c.conversation_id);

    const conversation = await this.prisma.conversationParticipant.findFirst({
      where: {
        user_id: userId2,
        conversation_id: { in: conversationIds1 },
        conversation: {
          conversation_type: {
            type_name: 'direct',
          },
        },
      },
      include: {
        conversation: true,
      },
    });

    return conversation?.conversation || null;
  }

  private async addNodeMembersToConversation(
    conversationId: number,
    nodeId: number,
  ) {
    const members = await this.prisma.userAssignment.findMany({
      where: { org_node_id: nodeId },
      select: { user_id: true },
    });

    for (const member of members) {
      await this.prisma.conversationParticipant.upsert({
        where: {
          conversation_id_user_id: {
            conversation_id: conversationId,
            user_id: member.user_id,
          },
        },
        update: {},
        create: {
          conversation_id: conversationId,
          user_id: member.user_id,
        },
      });
    }
  }

  private async isUserBlocked(
    blockerId: number,
    blockedId: number,
  ): Promise<boolean> {
    const block = await this.prisma.blockedUser.findUnique({
      where: {
        blocker_id_blocked_id: {
          blocker_id: blockerId,
          blocked_id: blockedId,
        },
      },
    });
    return !!block;
  }
  // ==================== Reply Functionality ====================

  /**
   * Reply to a specific message (create threaded reply)
   */
  async replyToMessage(
    conversationId: number,
    parentMessageId: number,
    userId: number,
    content: string,
    attachmentIds?: number[],
  ): Promise<MessageWithDetails> {
    // Verify user is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Verify parent message exists and is in same conversation
    const parentMessage = await this.prisma.message.findFirst({
      where: {
        message_id: parentMessageId,
        conversation_id: conversationId,
        deleted_at: null,
      },
    });

    if (!parentMessage) {
      throw new NotFoundException(
        'Parent message not found in this conversation',
      );
    }

    // Create reply message
    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_user_id: userId,
        parent_message_id: parentMessageId,
        content_text: content,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
    });

    // Update conversation updated_at
    await this.prisma.conversation.update({
      where: { conversation_id: conversationId },
      data: { updated_at: new Date() },
    });

    // Add attachments
    if (attachmentIds && attachmentIds.length > 0) {
      for (const fileId of attachmentIds) {
        await this.prisma.messageAttachment.create({
          data: {
            message_id: message.message_id,
            file_id: fileId,
          },
        });
      }
    }

    this.logger.log(
      `Reply added to message ${parentMessageId} in conversation ${conversationId}`,
    );

     return {
       message_id: message.message_id,
       content_text: message.content_text,
       sender_user_id: message.sender.user_id,
       sender_name: message.sender.full_name,
       sender_email: message.sender.email,
       sender_profile_pic: message.sender.profile_pic_url ?? undefined,
       sent_at: message.sent_at,
       is_edited: message.is_edited,
       parent_message_id: message.parent_message_id ?? undefined,
       reactions: [],
       read_by: [],
       attachments: message.attachments.map((a) => ({
         file_id: a.file.file_id,
         file_name: a.file.file_name,
         file_url: a.file.file_url,
       })),
     };
  }

  /**
   * Get message thread (all replies to a message)
   */
   async getMessageThread(messageId: number, userId: number): Promise<any> {
     // Verify message exists and user has access
     const message = await this.prisma.message.findFirst({
       where: {
         message_id: messageId,
         deleted_at: null,
       },
       include: {
         conversation: {
           include: {
             participants: {
               where: { user_id: userId },
             },
           },
         },
         sender: {
           select: {
             user_id: true,
             full_name: true,
             email: true,
             profile_pic_url: true,
           },
         },
         reactions: {
           include: {
             user: {
               select: {
                 user_id: true,
                 full_name: true,
               },
             },
           },
         },
       },
     });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.conversation.participants.length === 0) {
      throw new ForbiddenException('You do not have access to this message');
    }

    // Get all replies to this message
    const replies = await this.prisma.message.findMany({
      where: {
        parent_message_id: messageId,
        deleted_at: null,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
      orderBy: { sent_at: 'asc' },
    });

    return {
      parent_message: {
        message_id: message.message_id,
        content_text: message.content_text,
        sender: message.sender,
        sent_at: message.sent_at,
        reaction_count: message.reactions?.length || 0,
        reply_count: replies.length,
      },
      replies: replies.map((reply) => ({
        message_id: reply.message_id,
        content_text: reply.content_text,
        sender: reply.sender,
        sent_at: reply.sent_at,
        is_edited: reply.is_edited,
        reactions: reply.reactions.map((r) => ({
          type: r.reaction_type,
          user_id: r.user.user_id,
          user_name: r.user.full_name,
        })),
        attachments: reply.attachments.map((a) => ({
          file_id: a.file.file_id,
          file_name: a.file.file_name,
          file_url: a.file.file_url,
        })),
      })),
      total_replies: replies.length,
    };
  }

  /**
   * Get conversation reply statistics
   */
  async getConversationReplyStats(
    conversationId: number,
    userId: number,
  ): Promise<any> {
    // Verify access
    await this.getConversationDetails(conversationId, userId);

     const stats = await this.prisma.$queryRaw<
       {
         total_messages: number;
         root_messages: number;
         reply_messages: number;
         conversations_with_replies: number;
         reply_percentage: number;
       }
     >`
     SELECT 
       COUNT(*) as total_messages,
       SUM(CASE WHEN parent_message_id IS NULL THEN 1 ELSE 0 END) as root_messages,
       SUM(CASE WHEN parent_message_id IS NOT NULL THEN 1 ELSE 0 END) as reply_messages,
       COUNT(DISTINCT parent_message_id) as conversations_with_replies,
       AVG(CASE WHEN parent_message_id IS NOT NULL THEN 1 ELSE 0 END) * 100 as reply_percentage
     FROM messages
     WHERE conversation_id = ${conversationId}
       AND deleted_at IS NULL
   `;

    // Get most replied-to messages
    const mostReplied = await this.prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        deleted_at: null,
      },
      include: {
        _count: {
          select: { replies: true },
        },
        sender: {
          select: {
            user_id: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        replies: { _count: 'desc' },
      },
      take: 5,
    });

    return {
      ...stats[0],
      most_replied_messages: mostReplied.map((m) => ({
        message_id: m.message_id,
        content_preview: m.content_text.substring(0, 100),
        sender_name: m.sender.full_name,
        reply_count: m._count.replies,
      })),
    };
  }
  private async logAuditTrail(
    userId: number,
    action: string,
    tableAffected: string,
    recordId: number,
    oldValues: any,
    newValues: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        table_affected: tableAffected,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
      },
    });
  }
}
