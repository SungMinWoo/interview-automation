import apiClient from './client';
import { API_PATHS } from '@/utils/constants';
import type {
  LoginRequest,
  LoginResponse,
  TokenRefreshResponse,
  User,
  UserSearchResult,
} from '../types/auth';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login/', { email, password } satisfies LoginRequest);
  return response.data;
};

export const logout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/auth/logout/', { refresh: refreshToken });
};

export const refreshToken = async (refresh: string): Promise<TokenRefreshResponse> => {
  const response = await apiClient.post<TokenRefreshResponse>('/auth/token/refresh/', { refresh });
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me/');
  return response.data;
};

export const ssoTokenExchange = async (code: string, codeVerifier: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/sso/token/', {
    code,
    code_verifier: codeVerifier,
  });
  return response.data;
};

export const searchUsers = async (q: string): Promise<UserSearchResult[]> => {
  const response = await apiClient.get<UserSearchResult[]>(API_PATHS.AUTH.USER_SEARCH, { params: { q } });
  return response.data;
};
