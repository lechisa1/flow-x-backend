import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NoticeTargetDto {
  @ApiProperty()
  @IsInt()
  notice_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  org_node_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  role_id?: number;

  @ApiProperty({ enum: ['org_node', 'role', 'all'] })
  @IsString()
  @IsIn(['org_node', 'role', 'all'])
  target_type: string;
}
