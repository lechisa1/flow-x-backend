import { IsInt, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendChatRequestDto {
  @ApiProperty({ example: 15, description: 'User ID to send request to' })
  @IsInt()
  to_user_id: number;

  @ApiPropertyOptional({ example: 'I would like to discuss the AI project...' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondChatRequestDto {
  @ApiProperty({ enum: ['accepted', 'rejected', 'blocked'] })
  @IsString()
  @IsIn(['accepted', 'rejected', 'blocked'])
  status: string;
}

export class BlockUserDto {
  @ApiProperty({ example: 20, description: 'User ID to block' })
  @IsInt()
  user_id: number;

  @ApiPropertyOptional({
    example: 'Spam messages',
    description: 'Reason for blocking',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
