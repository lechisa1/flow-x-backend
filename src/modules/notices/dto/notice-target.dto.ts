import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NoticeTargetDto {
  @ApiProperty()
  @IsString()
  notice_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  org_node_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role_id?: string;

  @ApiProperty({ enum: ['org_node', 'role', 'all'] })
  @IsString()
  @IsIn(['org_node', 'role', 'all'])
  target_type: string;
}
