import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoveOrgNodeDto {
  @ApiProperty({
    example: 'uuid',
    description: 'New parent node ID (null to make root)',
  })
  @IsOptional()
  @IsString()
  new_parent_id?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'New position in the hierarchy',
  })
  @IsOptional()
  @IsInt()
  position?: number;
}
