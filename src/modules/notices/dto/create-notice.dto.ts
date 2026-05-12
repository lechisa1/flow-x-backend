import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NoticeTargetItemDto {
  @ApiPropertyOptional({ description: 'Organization node ID' })
  @IsOptional()
  @IsInt()
  org_node_id?: number;

  @ApiPropertyOptional({ description: 'Role ID' })
  @IsOptional()
  @IsInt()
  role_id?: number;

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

  @ApiPropertyOptional({ example: 1, description: 'Notice category ID' })
  @IsOptional()
  @IsInt()
  category_id?: number;

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

  @ApiPropertyOptional({ type: [Number], description: 'Attachment file IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  attachment_ids?: number[];
}
