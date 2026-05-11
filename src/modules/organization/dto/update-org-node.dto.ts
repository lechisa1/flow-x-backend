import {
  IsString,
  IsOptional,
  MaxLength,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrgNodeDto {
  @ApiPropertyOptional({
    example: 'AI Research Division',
    description: 'Updated node name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  node_name?: string;

  @ApiPropertyOptional({
    example: 'department',
    description: 'Node type',
    enum: ['sector', 'division', 'department', 'team'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['sector', 'division', 'department', 'team'])
  node_type?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether node is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
