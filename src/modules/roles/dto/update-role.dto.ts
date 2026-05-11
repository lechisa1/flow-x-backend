import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ArrayUnique,
  IsInt,
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
    example: [1, 2, 3, 4],
    description: 'Replace existing permissions with these',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permission_ids?: number[];
}
