export interface RoleWithPermissions {
  role_id: number;
  role_name: string;
  description?: string;
  permissions: {
    permission_id: number;
    permission_name: string;
    resource: string;
    action: string;
  }[];
}

export interface RoleAssignment {
  user_id: number;
  role_id: number;
  assigned_by: number;
  assigned_at: Date;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export interface Permission {
  permission_id: number;
  permission_name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UserRole {
  user_id: number;
  role_id: number;
}

export interface UserPermission {
  user_id: number;
  permission_id: number;
}

export interface UserWithRolesAndPermissions {
  user_id: number;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}
