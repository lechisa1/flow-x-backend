import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayUnique,
  IsUUID,
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
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    description: 'Permission IDs to assign to this role',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permission_ids?: string[];
}
