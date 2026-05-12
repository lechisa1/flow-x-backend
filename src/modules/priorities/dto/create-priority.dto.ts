import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsHexColor,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePriorityDto {
  @ApiProperty({
    example: 'critical',
    description: 'Priority level name',
    enum: ['critical', 'high', 'medium', 'low'],
  })
  @IsString()
  @IsIn(['critical', 'high', 'medium', 'low'])
  priority_level: string;

  @ApiPropertyOptional({
    example: '#E53E3E',
    description: 'Hex color code for visual representation',
  })
  @IsOptional()
  @IsHexColor()
  color_code?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Response time in hours',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168) // Max 7 days
  response_time_hrs?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Sort order (lower = higher priority)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
