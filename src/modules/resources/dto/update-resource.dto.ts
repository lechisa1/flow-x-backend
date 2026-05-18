import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateResourceDto {
  @ApiPropertyOptional({ example: 'Updated Employee Handbook 2025' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated version with new policies' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'New file ID for new version (UUID)',
  })
  @IsOptional()
  @IsUUID()
  file_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  category_ids?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({ example: 'Updated content and formatting' })
  @IsOptional()
  @IsString()
  change_notes?: string;
}
