export interface NoticeWithDetails {
  notice_id: string;
  title: string;
  content: string;
  published_by_user_id: string;
  category_id?: string;
  notice_type?: string;
  scheduled_publish_at?: Date;
  published_at?: Date;
  expires_at?: Date;
  status_id: string;
  created_at: Date;
  updated_at: Date;

  publisher_name: string;
  publisher_email: string;
  category_name?: string;

  targets: {
    target_type: string;
    org_node_id?: string;
    role_id?: string;
    org_node_name?: string;
    role_name?: string;
  }[];

  attachments: {
    file_id: string;
    file_name: string;
    file_url: string;
  }[];

  view_count: number;
}

export interface NoticeAnalytics {
  total_notices: number;
  published_notices: number;
  draft_notices: number;
  scheduled_notices: number;
  archived_notices: number;
  expired_notices: number;

  notices_by_type: {
    type: string;
    count: number;
    percentage: number;
  }[];

  notices_by_category: {
    category_id: string;
    category_name: string;
    count: number;
  }[];

  average_views_per_notice: number;
  engagement_rate: number;

  top_notices: {
    notice_id: string;
    title: string;
    view_count: number;
  }[];

  publishing_trends: {
    date: string;
    count: number;
  }[];
}

export interface NoticeBulkActionDto {
  notice_ids: string[];
  action: 'publish' | 'archive' | 'delete' | 'schedule';
  scheduled_time?: string;
}
