import {
  IsString,
  IsOptional,
  IsInt,
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
    example: 5,
    description: 'Organization node ID (for node-based conversations)',
  })
  @IsOptional()
  @IsInt()
  org_node_id?: number;

  @ApiProperty({
    enum: ['direct', 'group', 'node', 'project'],
    description: 'Conversation type',
  })
  @IsString()
  @IsIn(['direct', 'group', 'node', 'project'])
  conversation_type: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Initial participants to add (excluding creator)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  participant_ids?: number[];
}
