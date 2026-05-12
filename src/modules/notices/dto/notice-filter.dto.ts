import {
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NoticeFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional({
    enum: ['general', 'announcement', 'alert', 'warning', 'event'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['general', 'announcement', 'alert', 'warning', 'event'])
  notice_type?: string;

  @ApiPropertyOptional({
    enum: ['draft', 'published', 'archived', 'scheduled', 'expired'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'published', 'archived', 'scheduled', 'expired'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  limit?: number;
}
