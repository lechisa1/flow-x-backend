import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'Bontu Yoseph',
    description: 'Full name of the user',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  full_name: string;

  @ApiProperty({ example: 'bontu.yoseph@aic.et', description: 'Email address' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: '+251911234567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'StrongP@ssw0rd123', description: 'Password' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password too weak. Must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiPropertyOptional({ example: true, description: 'Whether user is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Role IDs to assign (UUIDs)',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  role_ids?: string[];

  @ApiPropertyOptional({ description: 'Set by controller from current user' })
  @IsOptional()
  @IsString()
  assigned_by?: string;
}
