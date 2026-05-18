import {
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResourceFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Organization node ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  org_node_id?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174002',
    description: 'Uploader user ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  uploaded_by?: string;

  @ApiPropertyOptional({
    enum: ['newest', 'oldest', 'popular', 'most_viewed', 'top_rated'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['newest', 'oldest', 'popular', 'most_viewed', 'top_rated'])
  sort_by?: string = 'newest';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;
}
