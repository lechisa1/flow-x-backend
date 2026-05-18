import {
  IsString,
  IsOptional,
  IsUUID,
  IsHexColor,
  MinLength,
  MaxLength,
  IsInt,
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
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Parent category ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

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
