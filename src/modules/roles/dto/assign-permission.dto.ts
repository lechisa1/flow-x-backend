import { IsArray, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Permission IDs to assign to role',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  permission_ids: number[];
}
