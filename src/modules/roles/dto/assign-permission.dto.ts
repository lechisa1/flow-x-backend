import { IsArray, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    description: 'Permission IDs to assign to role',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  permission_ids: string[];
}
