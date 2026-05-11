import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RoleDto {
  @ApiProperty()
  role_id: number;

  @ApiProperty()
  role_name: string;

  @ApiPropertyOptional()
  description?: string;
}

class UserRoleDto {
  @ApiProperty()
  role: RoleDto;
}

class OrganizationNodeDto {
  @ApiProperty()
  org_node_id: number;

  @ApiProperty()
  node_name: string;

  @ApiProperty()
  node_type: string;
}

class PositionDto {
  @ApiProperty()
  position_id: number;

  @ApiProperty()
  position_name: string;
}

class UserAssignmentDto {
  @ApiProperty()
  is_primary: boolean;

  @ApiProperty()
  is_node_head: boolean;

  @ApiProperty()
  org_node: OrganizationNodeDto;

  @ApiProperty()
  position: PositionDto;
}

class UserPresenceDto {
  @ApiPropertyOptional()
  presence_status?: string;

  @ApiPropertyOptional()
  last_seen?: Date;
}

class UserEducationDto {
  @ApiProperty()
  education_id: number;

  @ApiPropertyOptional()
  degree_level?: string;

  @ApiPropertyOptional()
  field_of_study?: string;

  @ApiPropertyOptional()
  institution_name?: string;

  @ApiPropertyOptional()
  graduation_year?: number;

  @ApiPropertyOptional()
  is_current: boolean;
}

class UserExperienceDto {
  @ApiProperty()
  experience_id: number;

  @ApiPropertyOptional()
  organization_name?: string;

  @ApiPropertyOptional()
  position_title?: string;

  @ApiPropertyOptional()
  start_date?: Date;

  @ApiPropertyOptional()
  end_date?: Date;

  @ApiProperty()
  is_current: boolean;
}

class UserSkillDto {
  @ApiProperty()
  skill_id: number;

  @ApiProperty()
  skill_name: string;

  @ApiPropertyOptional()
  proficiency_level?: string;

  @ApiPropertyOptional()
  years_of_experience?: number;
}

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  user_id: number;

  @Expose()
  @ApiProperty()
  full_name: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiPropertyOptional()
  phone?: string;

  @Expose()
  @ApiPropertyOptional()
  profile_pic_url?: string;

  @Expose()
  @ApiProperty()
  is_active: boolean;

  @Expose()
  @ApiPropertyOptional()
  last_login?: Date;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiPropertyOptional()
  updated_at?: Date;

  @Expose()
  @ApiProperty({ type: [UserRoleDto] })
  @Type(() => UserRoleDto)
  assigned_roles?: UserRoleDto[];

  @Expose()
  @ApiProperty({ type: [UserAssignmentDto] })
  @Type(() => UserAssignmentDto)
  assigned_positions?: UserAssignmentDto[];

  @Expose()
  @ApiPropertyOptional({ type: UserPresenceDto })
  @Type(() => UserPresenceDto)
  presence?: UserPresenceDto;

  @Expose()
  @ApiProperty({ type: [UserEducationDto] })
  @Type(() => UserEducationDto)
  education?: UserEducationDto[];

  @Expose()
  @ApiProperty({ type: [UserExperienceDto] })
  @Type(() => UserExperienceDto)
  experience?: UserExperienceDto[];

  @Expose()
  @ApiProperty({ type: [UserSkillDto] })
  @Type(() => UserSkillDto)
  skills?: UserSkillDto[];

  @Expose()
  @ApiProperty({ type: [String] })
  get roles(): string[] {
    return this.assigned_roles?.map((ur) => ur.role.role_name) || [];
  }

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
