import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FileInfoDto {
  @ApiProperty()
  file_id: number;

  @ApiProperty()
  file_name: string;

  @ApiProperty()
  file_url: string;

  @ApiPropertyOptional()
  original_name?: string | null;

  @ApiPropertyOptional()
  mime_type?: string | null;

  @ApiPropertyOptional()
  file_size?: bigint | null;
}

class CategoryDto {
  @ApiProperty()
  category_id: number;

  @ApiProperty()
  category_name: string;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiPropertyOptional()
  color?: string | null;
}

class TagDto {
  @ApiProperty()
  tag_id: number;

  @ApiProperty()
  tag_name: string;
}

class UploaderDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  profile_pic_url?: string | null;
}

class CommentDto {
  @ApiProperty()
  comment_id: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  user: UploaderDto;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  is_edited: boolean;

  @ApiPropertyOptional({ type: [CommentDto] })
  replies?: CommentDto[];
}

@Exclude()
export class ResourceResponseDto {
  @Expose()
  @ApiProperty()
  resource_id: number;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiPropertyOptional()
  description?: string | null;

  @Expose()
  @ApiProperty({ type: FileInfoDto })
  @Type(() => FileInfoDto)
  file: FileInfoDto;

  @Expose()
  @ApiProperty({ type: UploaderDto })
  @Type(() => UploaderDto)
  uploaded_by: UploaderDto;

  @Expose()
  @ApiPropertyOptional()
  org_node_id?: number | null;

  @Expose()
  @ApiPropertyOptional()
  org_node_name?: string | null;

  @Expose()
  @ApiProperty()
  download_count: number;

  @Expose()
  @ApiProperty()
  view_count: number;

  @Expose()
  @ApiProperty()
  rating_avg: number;

  @Expose()
  @ApiProperty()
  rating_count: number;

  @Expose()
  @ApiProperty()
  is_active: boolean;

  @Expose()
  @ApiProperty()
  is_featured: boolean;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty()
  updated_at: Date;

  @Expose()
  @ApiProperty({ type: [CategoryDto] })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];

  @Expose()
  @ApiProperty({ type: [TagDto] })
  @Type(() => TagDto)
  tags?: TagDto[];

  @Expose()
  @ApiPropertyOptional()
  is_favorite?: boolean;

  @Expose()
  @ApiPropertyOptional()
  user_rating?: number;

  @Expose()
  @ApiPropertyOptional({ type: [CommentDto] })
  @Type(() => CommentDto)
  recent_comments?: CommentDto[];

  @Expose()
  @ApiPropertyOptional()
  version_number?: number;

  constructor(partial: Partial<ResourceResponseDto>) {
    Object.assign(this, partial);
  }
}
