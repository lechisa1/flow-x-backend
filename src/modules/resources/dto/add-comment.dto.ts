import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({ example: 'This document is very helpful!' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsInt()
  parent_id?: number;
}

export class AddReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  rating: number;

  @ApiPropertyOptional({ example: 'Excellent resource!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  review_text?: string;
}
