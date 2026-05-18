import { IsBoolean, IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserDto {
  @ApiProperty({ example: 'uuid', description: 'User ID to assign' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'uuid', description: 'Organization node ID' })
  @IsUUID()
  org_node_id: string;

  @ApiProperty({ example: 'uuid', description: 'Position ID' })
  @IsUUID()
  position_id: string;

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
