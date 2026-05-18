import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NoticeTargetItemDto } from './create-notice.dto';

export class UpdateNoticeDto {
  @ApiPropertyOptional({ example: 'Updated System Update Notice' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated content for the notice...' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({
    enum: ['general', 'announcement', 'alert', 'warning', 'event'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['general', 'announcement', 'alert', 'warning', 'event'])
  notice_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduled_publish_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({ type: [NoticeTargetItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoticeTargetItemDto)
  targets?: NoticeTargetItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachment_ids?: string[];
}
