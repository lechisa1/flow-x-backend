import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CommunicationService } from './communication.service';
import {
  CreateConversationDto,
  SendMessageDto,
  AddParticipantsDto,
  RemoveParticipantDto,
  SendChatRequestDto,
  RespondChatRequestDto,
  BlockUserDto,
  PaginationQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import * as fs from 'fs';
import * as path from 'path';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Communication')
@ApiBearerAuth()
@Controller('communication')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CommunicationController {
  private readonly logger = new Logger(CommunicationController.name);

  constructor(
    private communicationService: CommunicationService,
    private prismaService: PrismaService,
  ) {}

  // ==================== Conversations ====================

  @Post('conversations')
  // @Permissions('chat:create')
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(
    @Body() createDto: CreateConversationDto,
    @CurrentUser() user: any,
  ) {
    const conversation = await this.communicationService.createConversation(
      createDto,
      user.user_id,
    );
    return {
      message: 'Conversation created successfully',
      data: conversation,
    };
  }

  @Get('conversations')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get user conversations' })
  async getUserConversations(
    @CurrentUser() user: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    return this.communicationService.getUserConversations(
      user.user_id,
      +page,
      +limit,
    );
  }

  @Get('conversations/:id')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communicationService.getConversationDetails(id, user.user_id);
  }

  @Get('conversations/:id/messages')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get conversation messages' })
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query() pagination: PaginationQueryDto,
  ) {
    const { page = 1, limit = 50 } = pagination;
    return this.communicationService.getMessages(
      id,
      user.user_id,
      +page,
      +limit,
    );
  }

  @Post('conversations/:id/messages')
  // @Permissions('chat:send')
  @ApiOperation({ summary: 'Send message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Hello everyone!' },
        parent_message_id: { type: 'number', example: 10 },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async sendMessage(
    @Param('id') id: string,
    @Body() sendDto: SendMessageDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentUser() user: any,
  ) {
    // Process uploaded files to get file IDs
    const attachmentIds: string[] = [];

    if (files && files.length > 0) {
      try {
        for (const file of files) {
          // Log file metadata only (not buffer content)
          this.logger.log(
            `Processing file: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`,
          );

          // Create file record in database
          const dbFile = await this.prismaService.file.create({
            data: {
              file_name:
                file.filename ||
                `file-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
              original_name: file.originalname || file.filename || 'unknown',
              file_url: `/uploads/${file.filename || 'unknown'}`,
              mime_type: file.mimetype,
              file_extension: file.originalname
                ? path.extname(file.originalname)
                : '',
              file_size: file.size,
              uploaded_by_user_id: user.user_id,
              storage_provider: 'local',
              is_public: true,
            },
          });

          attachmentIds.push(dbFile.file_id);
        }
      } catch (error) {
        this.logger.error('Error processing uploaded files:', error);
        throw new InternalServerErrorException(
          'Failed to process uploaded files',
        );
      }
    }

    const message = await this.communicationService.sendMessage(
      id,
      user.user_id,
      {
        content: sendDto.content,
        parent_message_id: sendDto.parent_message_id,
        attachment_ids: attachmentIds,
      },
    );
    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Post('conversations/:id/participants')
  // @Permissions('chat:manage')
  @ApiOperation({ summary: 'Add participants to conversation' })
  async addParticipants(
    @Param('id') id: string,
    @Body() addDto: AddParticipantsDto,
    @CurrentUser() user: any,
  ) {
    return this.communicationService.addParticipants(id, user.user_id, addDto);
  }

  @Delete('conversations/:id/participants/:userId')
  // @Permissions('chat:manage')
  @ApiOperation({ summary: 'Remove participant from conversation' })
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: any,
  ) {
    return this.communicationService.removeParticipant(
      id,
      user.user_id,
      targetUserId,
    );
  }

  @Post('conversations/:id/pin')
  // @Permissions('chat:manage')
  @ApiOperation({ summary: 'Pin conversation' })
  async pinConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communicationService.pinConversation(id, user.user_id);
  }

  @Delete('conversations/:id/pin')
  // @Permissions('chat:manage')
  @ApiOperation({ summary: 'Unpin conversation' })
  async unpinConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communicationService.unpinConversation(id, user.user_id);
  }

  // ==================== Chat Requests ====================

  @Post('requests')
  // @Permissions('chat:request')
  @ApiOperation({ summary: 'Send chat request to user' })
  async sendChatRequest(
    @Body() sendDto: SendChatRequestDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.communicationService.sendChatRequest(
      user.user_id,
      sendDto.to_user_id,
      sendDto.message,
    );
    return {
      message: 'Chat request sent',
      data: request,
    };
  }

  @Get('requests/pending')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get pending chat requests' })
  async getPendingRequests(@CurrentUser() user: any) {
    return this.communicationService.getPendingRequests(user.user_id);
  }

  @Get('requests/sent')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get sent chat requests' })
  async getSentRequests(@CurrentUser() user: any) {
    return this.communicationService.getSentRequests(user.user_id);
  }

  @Put('requests/:id')
  // @Permissions('chat:respond')
  @ApiOperation({ summary: 'Respond to chat request' })
  async respondToRequest(
    @Param('id') id: string,
    @Body() respondDto: RespondChatRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.communicationService.respondToChatRequest(
      id,
      user.user_id,
      respondDto.status,
    );
  }

  // ==================== Block User ====================

  @Post('block')
  // @Permissions('chat:block')
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(@Body() blockDto: BlockUserDto, @CurrentUser() user: any) {
    return this.communicationService.blockUser(
      user.user_id,
      blockDto.user_id,
      blockDto.reason,
    );
  }

  @Delete('block/:userId')
  // @Permissions('chat:block')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.communicationService.unblockUser(user.user_id, userId);
  }

  @Get('blocked')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get blocked users' })
  async getBlockedUsers(@CurrentUser() user: any) {
    return this.communicationService.getBlockedUsers(user.user_id);
  }
  // ==================== Reply Endpoints ====================

  @Post('conversations/:id/messages/:messageId/reply')
  // @Permissions('chat:send')
  @ApiOperation({ summary: 'Reply to a specific message' })
  async replyToMessage(
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() sendDto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    const message = await this.communicationService.replyToMessage(
      conversationId,
      messageId,
      user.user_id,
      sendDto.content,
      sendDto.attachment_ids,
    );
    return {
      message: 'Reply sent successfully',
      data: message,
    };
  }

  @Get('messages/:messageId/thread')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get full message thread (message + all replies)' })
  async getMessageThread(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    return this.communicationService.getMessageThread(messageId, user.user_id);
  }

  @Get('conversations/:id/reply-stats')
  // @Permissions('chat:read')
  @ApiOperation({ summary: 'Get reply statistics for a conversation' })
  async getConversationReplyStats(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.communicationService.getConversationReplyStats(
      id,
      user.user_id,
    );
  }
}
