import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TargetDto {
  @ApiProperty()
  target_id: number;

  @ApiPropertyOptional()
  org_node_id?: number | null;

  @ApiPropertyOptional()
  role_id?: number | null;

  @ApiProperty()
  target_type: string;

  @ApiPropertyOptional()
  org_node_name?: string;

  @ApiPropertyOptional()
  role_name?: string;
}

class PublisherDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  profile_pic_url?: string | null;
}

class CategoryDto {
  @ApiProperty()
  category_id: number;

  @ApiProperty()
  category_name: string;
}

class AttachmentDto {
  @ApiProperty()
  file_id: number;

  @ApiProperty()
  file_name: string;

  @ApiProperty()
  file_url: string;

  @ApiProperty()
  mime_type?: string;
}

@Exclude()
export class NoticeResponseDto {
  @Expose()
  @ApiProperty()
  notice_id: number;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  content: string;

  @Expose()
  @ApiPropertyOptional()
  category_id?: number;

  @Expose()
  @ApiPropertyOptional()
  notice_type?: string | null;

  @Expose()
  @ApiPropertyOptional()
  scheduled_publish_at?: Date | null;

  @Expose()
  @ApiPropertyOptional()
  published_at?: Date | null;

  @Expose()
  @ApiPropertyOptional()
  expires_at?: Date | null;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty()
  updated_at: Date;

  @Expose()
  @ApiPropertyOptional()
  status?: string;

  @Expose()
  @ApiPropertyOptional()
  is_active?: boolean;

  @Expose()
  @ApiPropertyOptional()
  view_count?: number;

  @Expose()
  @ApiPropertyOptional()
  target_count?: number;

  @Expose()
  @ApiPropertyOptional()
  attachment_count?: number;

  @Expose()
  @ApiPropertyOptional({ type: PublisherDto })
  @Type(() => PublisherDto)
  published_by?: PublisherDto;

  @Expose()
  @ApiPropertyOptional({ type: CategoryDto })
  @Type(() => CategoryDto)
  category?: CategoryDto;

  @Expose()
  @ApiPropertyOptional({ type: [TargetDto] })
  @Type(() => TargetDto)
  targets?: TargetDto[];

  @Expose()
  @ApiPropertyOptional({ type: [AttachmentDto] })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @Expose()
  @ApiPropertyOptional()
  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date(this.expires_at) < new Date();
  }

  @Expose()
  @ApiPropertyOptional()
  get is_published(): boolean {
    return (
      this.published_at !== null &&
      this.published_at !== undefined &&
      new Date(this.published_at) <= new Date()
    );
  }

  @Expose()
  @ApiPropertyOptional()
  get is_scheduled(): boolean {
    return (
      this.scheduled_publish_at !== null &&
      this.scheduled_publish_at !== undefined &&
      new Date(this.scheduled_publish_at) > new Date() &&
      !this.published_at
    );
  }

  @Expose()
  @ApiPropertyOptional()
  get days_until_expiry(): number | null {
    if (!this.expires_at) return null;
    const days = Math.ceil(
      (new Date(this.expires_at).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return days > 0 ? days : 0;
  }

  constructor(partial: Partial<NoticeResponseDto>) {
    Object.assign(this, partial);
  }
}
