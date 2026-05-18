import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddParticipantsDto {
  @ApiProperty({
    type: [String],
    description: 'User IDs to add to conversation (UUIDs)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  user_ids: string[];
}

export class RemoveParticipantDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID to remove' })
  @IsUUID()
  user_id: string;
}
