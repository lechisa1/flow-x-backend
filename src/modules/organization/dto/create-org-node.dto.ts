import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrgNodeDto {
  @ApiProperty({
    example: 'Research and Development Directorate',
    description: 'Node name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  node_name: string;

  @ApiProperty({
    example: 'division',
    description: 'Node type: sector, division, department, team',
    enum: ['sector', 'division', 'department', 'team'],
  })
  @IsString()
  @IsIn(['sector', 'division', 'department', 'team'])
  node_type: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Parent node ID (null for root)',
  })
  @IsOptional()
  @IsInt()
  parent_node_id?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Hierarchy level (auto-calculated if not provided)',
  })
  @IsOptional()
  @IsInt()
  level?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether node is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
