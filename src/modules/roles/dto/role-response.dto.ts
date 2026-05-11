import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PermissionDto {
  @ApiProperty()
  permission_id: number;

  @ApiProperty()
  permission_name: string;

  @ApiPropertyOptional()
  resource?: string;

  @ApiPropertyOptional()
  action?: string;

  @ApiPropertyOptional()
  description?: string;
}

class RolePermissionDto {
  @ApiProperty()
  permission: PermissionDto;
}

@Exclude()
export class RoleResponseDto {
  @Expose()
  @ApiProperty()
  role_id: number;

  @Expose()
  @ApiProperty()
  role_name: string;

  @Expose()
  @ApiPropertyOptional()
  description?: string;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty({ type: [RolePermissionDto] })
  @Type(() => RolePermissionDto)
  permissions?: RolePermissionDto[];

  @Expose()
  @ApiProperty({ type: [String] })
  get permission_names(): string[] {
    return this.permissions?.map((rp) => rp.permission.permission_name) || [];
  }

  @Expose()
  @ApiPropertyOptional()
  user_count?: number;

  constructor(partial: Partial<RoleResponseDto>) {
    Object.assign(this, partial);
  }
}
