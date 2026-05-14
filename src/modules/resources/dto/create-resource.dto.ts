import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({
    example: 'Employee Handbook 2024',
    description: 'Resource title',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'Complete guide for employees...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Existing file ID (optional if uploading new file)',
  })
  @IsOptional()
  @IsInt()
  file_id?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Organization node ID',
  })
  @IsOptional()
  @IsInt()
  org_node_id?: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Category IDs',
    example: [1, 2, 3],
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v));
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.map((v) => Number(v));
        }
      } catch {
        return value.split(',').map((v) => Number(v.trim()));
      }
    }

    return value;
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  category_ids?: number[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Tags',
    example: ['nestjs', 'prisma', 'chat'],
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v));
        }
      } catch {
        return value.split(',').map((v) => v.trim());
      }
    }

    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: false,
    description: 'Feature this resource',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;
}
