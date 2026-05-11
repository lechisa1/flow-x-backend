export interface OrgNodeWithChildren {
  org_node_id: number;
  node_name: string;
  node_type: string;
  level: number;
  children: OrgNodeWithChildren[];
}

export interface OrgTreeOptions {
  includeInactive?: boolean;
  maxDepth?: number;
  nodeTypes?: string[];
}

export interface UserAssignmentWithDetails {
  assignment_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  position_name: string;
  is_primary: boolean;
  is_node_head: boolean;
  assigned_at: Date;
}

