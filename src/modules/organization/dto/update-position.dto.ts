import { IsString, IsOptional, MaxLength, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePositionDto {
  @ApiPropertyOptional({
    example: 'Senior Division Director',
    description: 'Updated position name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position_name?: string;

  @ApiPropertyOptional({
    example: 'Senior role with additional responsibilities',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5, description: 'Updated hierarchy rank' })
  @IsOptional()
  @IsInt()
  hierarchy_rank?: number;
}
