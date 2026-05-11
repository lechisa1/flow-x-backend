import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ example: 'Division Director', description: 'Position name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  position_name: string;

  @ApiPropertyOptional({
    example: 'Responsible for division operations and strategy',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Hierarchy rank (lower = higher authority)',
  })
  @IsOptional()
  @IsInt()
  hierarchy_rank?: number;
}
