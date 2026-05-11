import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'bontu.yoseph@aic.et' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd123' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  device_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  device_token?: string;
}
