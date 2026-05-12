import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Exclude()
export class PriorityResponseDto {
  @Expose()
  @ApiProperty()
  priority_id: number;

  @Expose()
  @ApiProperty()
  priority_level: string;

  @Expose()
  @ApiPropertyOptional()
  color_code?: string | null;

  @Expose()
  @ApiPropertyOptional()
  response_time_hrs?: number | null;

  @Expose()
  @ApiPropertyOptional()
  sort_order?: number | null;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Number of tasks with this priority' })
  task_count?: number;

  @Expose()
  @ApiPropertyOptional({
    description: 'Average completion time in hours for this priority',
  })
  avg_completion_time?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'CSS class for styling' })
  get css_class(): string {
    const classes = {
      critical: 'priority-critical',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return classes[this.priority_level] || 'priority-default';
  }

  @Expose()
  @ApiPropertyOptional({ description: 'Priority level label' })
  get label(): string {
    const labels = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return labels[this.priority_level] || this.priority_level;
  }

  constructor(partial: Partial<PriorityResponseDto>) {
    Object.assign(this, partial);
  }
}
