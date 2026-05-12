export interface PriorityWithStats {
  priority_id: number;
  priority_level: string;
  color_code?: string;
  response_time_hrs?: number;
  sort_order?: number;
  task_count: number;
  avg_completion_time?: number;
  active_tasks_count: number;
  overdue_tasks_count: number;
}

export interface PriorityAnalytics {
  total_tasks_by_priority: {
    priority_level: string;
    count: number;
    percentage: number;
  }[];
  average_completion_time_by_priority: {
    priority_level: string;
    avg_hours: number;
  }[];
  overdue_tasks_by_priority: {
    priority_level: string;
    count: number;
  }[];
  sla_compliance_by_priority: {
    priority_level: string;
    compliance_rate: number; // percentage
  }[];
}

export interface BulkPriorityUpdateDto {
  updates: {
    priority_id: number;
    sort_order?: number;
    response_time_hrs?: number;
    is_active?: boolean;
  }[];
}
