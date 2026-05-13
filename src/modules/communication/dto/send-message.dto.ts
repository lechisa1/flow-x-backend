import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello everyone!', description: 'Message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Parent message ID - use this to reply to a specific message',
  })
  @IsOptional()
  @IsInt()
  parent_message_id?: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Attachment file IDs',
  })
  @IsOptional()
  @IsInt({ each: true })
  attachment_ids?: number[];
}
