import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello everyone!', description: 'Message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Parent message ID - use this to reply to a specific message',
  })
  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => (value === '' ? undefined : value), { toClassOnly: true })
  parent_message_id?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Attachment file IDs',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  attachment_ids?: string[];
}
