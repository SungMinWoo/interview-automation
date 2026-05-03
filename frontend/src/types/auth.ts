export interface User {
  id: number;
  email: string;
  username: string;
  company_name?: string;
  sso_id?: string;
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
