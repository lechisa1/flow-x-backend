import { IsInt, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserDto {
  @ApiProperty({ example: 10, description: 'User ID to assign' })
  @IsInt()
  user_id: number;

  @ApiProperty({ example: 3, description: 'Organization node ID' })
  @IsInt()
  org_node_id: number;

  @ApiProperty({ example: 5, description: 'Position ID' })
  @IsInt()
  position_id: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this is the primary assignment',
  })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether user is head of this node',
  })
  @IsOptional()
  @IsBoolean()
  is_node_head?: boolean;
}
