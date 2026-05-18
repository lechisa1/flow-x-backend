import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NoticeTargetItemDto {
  @ApiPropertyOptional({ description: 'Organization node ID (UUID)' })
  @IsOptional()
  @IsUUID()
  org_node_id?: string;

  @ApiPropertyOptional({ description: 'Role ID (UUID)' })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({ enum: ['org_node', 'role', 'all'] })
  @IsString()
  @IsIn(['org_node', 'role', 'all'])
  target_type: string;
}

export class CreateNoticeDto {
  @ApiProperty({
    example: 'Important System Update',
    description: 'Notice title',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'The system will be down for maintenance...',
    description: 'Notice content',
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({ example: 'uuid', description: 'Notice category ID' })
  @IsUUID()
  category_id!: string;

  @ApiPropertyOptional({
    example: 'general',
    description: 'Notice type',
    enum: ['general', 'announcement', 'alert', 'warning', 'event'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['general', 'announcement', 'alert', 'warning', 'event'])
  notice_type?: string;

  @ApiPropertyOptional({
    example: '2024-12-25T09:00:00Z',
    description: 'Schedule for future publishing',
  })
  @IsOptional()
  @IsDateString()
  scheduled_publish_at?: string;

  @ApiPropertyOptional({
    example: '2025-01-25T23:59:59Z',
    description: 'Notice expiry date',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({
    type: [NoticeTargetItemDto],
    description: 'Target audiences for the notice',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoticeTargetItemDto)
  targets?: NoticeTargetItemDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Attachment file IDs (UUIDs)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachment_ids?: string[];
}
