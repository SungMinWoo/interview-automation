import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import type { Notification, UnreadCountResponse, MarkAllReadResponse } from '@/types/notification';

const NOTIFICATIONS_KEY = ['notifications'];
const UNREAD_COUNT_KEY = ['notifications-unread-count'];

export function useNotifications(params?: { is_read?: boolean; project?: number }) {
  return useQuery<Notification[]>({
    queryKey: [...NOTIFICATIONS_KEY, params],
    queryFn: async () => {
      const res = await apiClient.get<Notification[]>(API_PATHS.NOTIFICATIONS, { params });
      return res.data;
    },
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: async () => {
      const res = await apiClient.get<UnreadCountResponse>(API_PATHS.NOTIFICATIONS_UNREAD_COUNT);
      return res.data;
    },
    refetchInterval: 30000, // 30초마다 폴링
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post<Notification>(API_PATHS.NOTIFICATION_READ(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<MarkAllReadResponse>(API_PATHS.NOTIFICATIONS_READ_ALL);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
