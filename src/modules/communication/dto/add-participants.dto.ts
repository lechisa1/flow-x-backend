import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddParticipantsDto {
  @ApiProperty({
    type: [Number],
    description: 'User IDs to add to conversation',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  user_ids: number[];
}

export class RemoveParticipantDto {
  @ApiProperty({ example: 10, description: 'User ID to remove' })
  @IsInt()
  user_id: number;
}
