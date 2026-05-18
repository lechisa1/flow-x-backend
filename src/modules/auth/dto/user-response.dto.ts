import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty()
  profile_pic_url?: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  last_login?: Date;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ type: [String] })
  roles?: string[];

  @ApiProperty({ type: [String] })
  permissions?: string[];

  @Exclude()
  password: string;

  @Exclude()
  deleted_at?: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
