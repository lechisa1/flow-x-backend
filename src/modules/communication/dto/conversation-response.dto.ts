import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Participant, LastMessage } from '../interfaces/chat.interface';

@Exclude()
export class ParticipantDto implements Participant {
  @Expose()
  @ApiProperty()
  user_id: string;

  @Expose()
  @ApiProperty()
  full_name: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiPropertyOptional()
  profile_pic_url?: string;

  @Expose()
  @ApiPropertyOptional()
  last_read_at?: Date;

  @Expose()
  @ApiProperty()
  joined_at: Date;
}

@Exclude()
export class LastMessageDto implements LastMessage {
  @Expose()
  @ApiProperty()
  message_id: string;

  @Expose()
  @ApiProperty()
  content_text: string;

  @Expose()
  @ApiProperty()
  sent_at: Date;

  @Expose()
  @ApiProperty()
  sender_name: string;

  @Expose()
  @ApiProperty()
  sender_id: string;

  @Expose()
  @ApiProperty()
  is_read: boolean;
}

@Exclude()
export class ConversationResponseDto {
  @Expose()
  @ApiProperty()
  conversation_id: number;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  conversation_type: string;

  @Expose()
  @ApiPropertyOptional()
  org_node_id?: string;

  @Expose()
  @ApiPropertyOptional()
  org_node_name?: string;

  @Expose()
  @ApiProperty()
  is_active: boolean;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiPropertyOptional()
  updated_at?: Date;

  @Expose()
  @ApiPropertyOptional()
  unread_count?: number;

  @Expose()
  @ApiPropertyOptional({ type: LastMessageDto })
  @Type(() => LastMessageDto)
  last_message?: LastMessageDto;

  @Expose()
  @ApiProperty({ type: [ParticipantDto] })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];

  @Expose()
  @ApiProperty()
  participant_count?: number;

  @Expose()
  @ApiProperty()
  is_pinned?: boolean;

  @Expose()
  @ApiPropertyOptional()
  initiator_user_id?: string;

  @Expose()
  @ApiPropertyOptional()
  initiator_name?: string;

  constructor(partial: Partial<ConversationResponseDto>) {
    Object.assign(this, partial);
  }
}
