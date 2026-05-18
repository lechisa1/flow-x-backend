import { IsUUID, IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendChatRequestDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to send request to',
  })
  @IsUUID()
  to_user_id: string;

  @ApiPropertyOptional({ example: 'I would like to discuss the AI project...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class RespondChatRequestDto {
  @ApiProperty({ enum: ['accepted', 'rejected', 'blocked'] })
  @IsString()
  @IsIn(['accepted', 'rejected', 'blocked'])
  status: string;
}

export class BlockUserDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to block',
  })
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({
    example: 'Spam messages',
    description: 'Reason for blocking',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
