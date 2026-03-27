import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TokenRefreshResponse,
  User,
} from '../types/auth';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login/', { email, password } satisfies LoginRequest);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/register/', data);
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
