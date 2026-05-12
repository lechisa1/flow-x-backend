import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsHexColor,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePriorityDto {
  @ApiPropertyOptional({
    example: 'urgent',
    description: 'Updated priority level name',
    enum: ['critical', 'high', 'medium', 'low', 'urgent'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['critical', 'high', 'medium', 'low', 'urgent'])
  priority_level?: string;

  @ApiPropertyOptional({
    example: '#FF0000',
    description: 'Updated hex color code',
  })
  @IsOptional()
  @IsHexColor()
  color_code?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Updated response time in hours',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  response_time_hrs?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Updated sort order',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
