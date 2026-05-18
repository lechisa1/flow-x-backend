import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserBriefDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;
}

class PositionBriefDto {
  @ApiProperty()
  position_id: string;

  @ApiProperty()
  position_name: string;
}

class UserAssignmentDto {
  @ApiProperty()
  assignment_id: string;

  @ApiProperty()
  is_primary: boolean;

  @ApiProperty()
  is_node_head: boolean;

  @ApiProperty()
  assigned_at: Date;

  @ApiProperty()
  user: UserBriefDto;

  @ApiProperty()
  position: PositionBriefDto;
}

@Exclude()
export class OrgNodeResponseDto {
  @Expose()
  @ApiProperty()
  org_node_id: string;

  @Expose()
  @ApiProperty()
  node_name: string;

  @Expose()
  @ApiProperty()
  node_type: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  parent_node_id?: string | null;

  @Expose()
  @ApiProperty()
  level: number;

  @Expose()
  @ApiProperty()
  is_active: boolean;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiPropertyOptional({ type: () => OrgNodeResponseDto })
  @Type(() => OrgNodeResponseDto)
  parent?: OrgNodeResponseDto;

  @Expose()
  @ApiProperty({ type: [OrgNodeResponseDto] })
  @Type(() => OrgNodeResponseDto)
  children?: OrgNodeResponseDto[];

  @Expose()
  @ApiProperty({ type: [UserAssignmentDto] })
  @Type(() => UserAssignmentDto)
  user_assignments?: UserAssignmentDto[];

  @Expose()
  @ApiPropertyOptional()
  get full_path(): string {
    return this.buildPath();
  }

  @Expose()
  @ApiPropertyOptional()
  get user_count(): number {
    return this.user_assignments?.length || 0;
  }

  @Expose()
  @ApiPropertyOptional()
  get head_user(): UserBriefDto | null {
    const head = this.user_assignments?.find((ua) => ua.is_node_head);
    return head?.user || null;
  }

  private buildPath(): string {
    if (!this.parent) {
      return this.node_name;
    }
    return `${this.parent.buildPath()} > ${this.node_name}`;
  }

  constructor(data: any) {
    const { parent, children, user_assignments, parent_node_id, ...rest } =
      data;
    Object.assign(this, rest);
    this.parent_node_id = parent_node_id ?? undefined;
    if (parent) {
      this.parent = new OrgNodeResponseDto(parent);
    }
    if (children) {
      this.children = children.map((c: any) => new OrgNodeResponseDto(c));
    }
    if (user_assignments) {
      this.user_assignments = user_assignments;
    }
  }
}
