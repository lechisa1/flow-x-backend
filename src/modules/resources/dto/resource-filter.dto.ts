import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResourceFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  org_node_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  uploaded_by?: number;

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
