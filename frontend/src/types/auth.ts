export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  company_name?: string;
  sso_id?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  company_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: User;
}

export interface TokenRefreshResponse {
  access: string;
}

export interface UserSearchResult {
  id: number;
  email: string;
  username: string;
  first_name: string;
  company_name: string;
}
