import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayUnique,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'department_head', description: 'Unique role name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  role_name: string;

  @ApiPropertyOptional({
    example: 'Responsible for department-level decisions and approvals',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'Permission IDs to assign to this role',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permission_ids?: number[];
}
