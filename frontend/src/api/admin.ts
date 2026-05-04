import apiClient from './client';
import { API_PATHS } from '@/utils/constants';
import type { AdminUser } from '../types/auth';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const listAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  const response = await apiClient.get<AdminUser[] | PaginatedResponse<AdminUser>>(
    API_PATHS.ADMIN_USERS,
    { params: search ? { search } : undefined },
  );
  const data = response.data;
  return Array.isArray(data) ? data : data.results;
};

export const updateAdminUser = async (
  id: number,
  patch: Partial<Pick<AdminUser, 'is_active' | 'is_staff' | 'is_superuser'>>,
): Promise<AdminUser> => {
  const response = await apiClient.patch<AdminUser>(API_PATHS.ADMIN_USER(id), patch);
  return response.data;
};
