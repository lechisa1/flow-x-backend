import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    example: 'AI Research Team',
    description: 'Conversation title',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization node ID (for node-based conversations)',
  })
  @IsOptional()
  @IsUUID()
  org_node_id?: string;

  @ApiProperty({
    enum: ['direct', 'group', 'node', 'project'],
    description: 'Conversation type',
  })
  @IsString()
  @IsIn(['direct', 'group', 'node', 'project'])
  conversation_type: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Initial participants to add (excluding creator)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  participant_ids?: string[];
}
