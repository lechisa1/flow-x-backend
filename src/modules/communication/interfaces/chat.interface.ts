import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =====================================================
// MESSAGE INTERFACES
// =====================================================

export interface MessageWithDetails {
  message_id: number;
  content_text: string;
  sender_user_id: number;
  sender_name: string;
  sender_email: string;
  sender_profile_pic?: string;
  sent_at: Date;
  is_edited: boolean;
  parent_message_id?: number;
  reactions: {
    type: string;
    user_id: number;
    user_name: string;
  }[];
  read_by: {
    user_id: number;
    user_name: string;
    read_at: Date;
  }[];
  attachments: {
    file_id: number;
    file_name: string;
    file_url: string;
  }[];
}

// =====================================================
// MESSAGE REACTION INTERFACES
// =====================================================

export interface MessageReaction {
  reaction_id: number;
  message_id: number;
  user_id: number;
  reaction_type: string;
  reacted_at: Date;
  user?: {
    user_id: number;
    full_name: string;
  };
}

// =====================================================
// CONVERSATION PARTICIPANT INTERFACES
// =====================================================

export interface Participant {
  user_id: number;
  full_name: string;
  email: string;
  profile_pic_url?: string;
  last_read_at?: Date;
  joined_at: Date;
  is_admin?: boolean;
}

export interface ParticipantWithDetails extends Participant {
  position?: string;
  department?: string;
}

// =====================================================
// LAST MESSAGE INTERFACE
// =====================================================

export class LastMessage {
  @ApiProperty()
  message_id: number;

  @ApiProperty()
  content_text: string;

  @ApiProperty()
  sent_at: Date;

  @ApiProperty()
  sender_name: string;

  @ApiProperty()
  sender_id: number;

  @ApiProperty()
  is_read: boolean;
}

// =====================================================
// CONVERSATION RESPONSE DTO (MOVED FROM DTO TO INTERFACE)
// =====================================================

export class ConversationResponseDto {
  @ApiProperty()
  conversation_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  conversation_type: string;

  @ApiPropertyOptional()
  org_node_id?: number;

  @ApiPropertyOptional()
  org_node_name?: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  updated_at?: Date;

  @ApiPropertyOptional()
  unread_count?: number;

  @ApiPropertyOptional({ type: LastMessage })
  last_message?: LastMessage;

  @ApiProperty({ type: [Object] })
  participants?: Participant[];

  @ApiProperty()
  participant_count?: number;

  @ApiProperty()
  is_pinned?: boolean;

  @ApiPropertyOptional()
  initiator_user_id?: number;

  @ApiPropertyOptional()
  initiator_name?: string;
}

// =====================================================
// CHAT REQUEST INTERFACES
// =====================================================

export interface ChatRequestWithDetails {
  request_id: number;
  from_user: {
    user_id: number;
    full_name: string;
    email: string;
    profile_pic_url?: string;
  };
  to_user: {
    user_id: number;
    full_name: string;
    email: string;
    profile_pic_url?: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  requested_at: Date;
  responded_at?: Date;
  conversation_id?: number;
}

export interface ChatRequestResponse {
  request_id: number;
  from_user_id: number;
  from_user_name: string;
  from_user_email: string;
  from_user_profile_pic?: string;
  to_user_id: number;
  to_user_name: string;
  to_user_email: string;
  status: string;
  message?: string;
  requested_at: Date;
  responded_at?: Date;
}

// =====================================================
// BLOCKED USER INTERFACES
// =====================================================

export interface BlockedUser {
  block_id: number;
  blocker_id: number;
  blocked_id: number;
  blocked_user_name: string;
  blocked_user_email: string;
  reason?: string;
  created_at: Date;
}

export interface BlockedUserResponse {
  user_id: number;
  full_name: string;
  email: string;
  profile_pic_url?: string;
  blocked_at: Date;
  reason?: string;
}

// =====================================================
// WEB SOCKET MESSAGE INTERFACES
// =====================================================

export interface WebSocketMessage {
  type:
    | 'message'
    | 'reaction'
    | 'read_receipt'
    | 'typing'
    | 'participant_joined'
    | 'participant_left'
    | 'message_deleted';
  conversation_id: number;
  user_id: number;
  user_name: string;
  data: any;
  timestamp: Date;
}

export interface TypingIndicator {
  conversation_id: number;
  user_id: number;
  user_name: string;
  is_typing: boolean;
}

export interface ReadReceipt {
  conversation_id: number;
  message_id: number;
  user_id: number;
  user_name: string;
  read_at: Date;
}

// =====================================================
// CONVERSATION LIST INTERFACE
// =====================================================

export interface ConversationListResponse {
  data: ConversationResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// MESSAGE LIST INTERFACE
// =====================================================

export interface MessageListResponse {
  data: MessageWithDetails[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =====================================================
// CONVERSATION STATISTICS
// =====================================================

export interface ConversationStatistics {
  total_conversations: number;
  direct_chats: number;
  group_chats: number;
  node_conversations: number;
  project_conversations: number;
  total_messages: number;
  average_messages_per_conversation: number;
  unread_messages_total: number;
  pinned_conversations: number;
}

// =====================================================
// USER CHAT STATUS
// =====================================================

export interface UserChatStatus {
  user_id: number;
  full_name: string;
  is_online: boolean;
  last_seen?: Date;
  current_conversation_id?: number;
  typing_in_conversation?: number;
}

// =====================================================
// CONVERSATION SEARCH RESULTS
// =====================================================

export interface ConversationSearchResult {
  conversation_id: number;
  title: string;
  conversation_type: string;
  match_count: number;
  participants: Participant[];
  last_message?: LastMessage;
}

// =====================================================
// MESSAGE SEARCH RESULTS
// =====================================================

export interface MessageSearchResult {
  message_id: number;
  content_text: string;
  conversation_id: number;
  conversation_title: string;
  sender_name: string;
  sent_at: Date;
  highlight: string;
}

// =====================================================
// BULK OPERATION INTERFACES
// =====================================================

export interface BulkMessageAction {
  message_ids: number[];
  action: 'delete' | 'mark_read' | 'mark_unread';
}

export interface BulkMessageActionResult {
  success_count: number;
  failed_count: number;
  results: {
    message_id: number;
    status: 'success' | 'failed';
    error?: string;
  }[];
}

// =====================================================
// CONVERSATION SETTINGS
// =====================================================

export interface ConversationSettings {
  conversation_id: number;
  allow_typing_indicators: boolean;
  allow_read_receipts: boolean;
  allow_reactions: boolean;
  allow_replies: boolean;
  allow_mentions: boolean;
  mute_notifications: boolean;
  notification_sound: boolean;
  theme?: string;
}

// =====================================================
// DIRECT MESSAGE INITIATION
// =====================================================

export interface DirectMessageInitiation {
  user_id: number;
  existing_conversation_id?: number;
  new_conversation_id?: number;
  requires_approval: boolean;
  request_id?: number;
}
