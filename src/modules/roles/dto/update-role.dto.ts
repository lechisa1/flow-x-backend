import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayUnique,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'senior_department_head',
    description: 'Updated role name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  role_name?: string;

  @ApiPropertyOptional({ example: 'Senior role with enhanced permissions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    description: 'Replace existing permissions with these',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permission_ids?: string[];
}
