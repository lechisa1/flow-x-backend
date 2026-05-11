// interfaces/jwt-payload.interface.ts
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    full_name: string;
    profile_image: string | null;
    roles: Array<{ id: number; name: string }>;
    permissions: string[];
  };
}

export interface JwtPayload {
  sub: number;
  email: string;
}

export interface UserSession {
  user_id: number;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
}
