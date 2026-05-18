import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUUID,
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
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Existing file ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  file_id?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Organization node ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  org_node_id?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Category IDs (UUIDs)',
    example: [
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ],
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
  @IsUUID('all', { each: true })
  category_ids?: string[];

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
