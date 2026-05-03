import apiClient from './client';
import { API_PATHS } from '@/utils/constants';
import type { Notification, UnreadCountResponse, MarkAllReadResponse } from '@/types/notification';

export const getNotifications = async (params?: {
  is_read?: boolean;
  project?: number;
}): Promise<Notification[]> => {
  const res = await apiClient.get<Notification[]>(API_PATHS.NOTIFICATIONS, { params });
  return res.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const res = await apiClient.get<UnreadCountResponse>(API_PATHS.NOTIFICATIONS_UNREAD_COUNT);
  return res.data;
};

export const markAsRead = async (id: number): Promise<Notification> => {
  const res = await apiClient.post<Notification>(API_PATHS.NOTIFICATION_READ(id));
  return res.data;
};

export const markAllAsRead = async (): Promise<MarkAllReadResponse> => {
  const res = await apiClient.post<MarkAllReadResponse>(API_PATHS.NOTIFICATIONS_READ_ALL);
  return res.data;
};
