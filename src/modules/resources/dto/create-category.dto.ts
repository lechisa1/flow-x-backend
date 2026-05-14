import {
  IsString,
  IsOptional,
  IsInt,
  IsHexColor,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Policies' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category_name: string;

  @ApiPropertyOptional({ example: 'Company policies and procedures' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Parent category ID' })
  @IsOptional()
  @IsInt()
  parent_id?: number;

  @ApiPropertyOptional({ example: '📄', description: 'Icon emoji or URL' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#3498db' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
