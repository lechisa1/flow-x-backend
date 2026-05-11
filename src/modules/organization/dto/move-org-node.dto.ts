import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoveOrgNodeDto {
  @ApiProperty({
    example: 5,
    description: 'New parent node ID (null to make root)',
  })
  @IsOptional()
  @IsInt()
  new_parent_id?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'New position in the hierarchy',
  })
  @IsOptional()
  @IsInt()
  position?: number;
}
