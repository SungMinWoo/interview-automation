import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import * as authApi from '@/api/auth';

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout: storeLogout, refreshToken } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: () => {
      storeLogout();
      queryClient.clear();
    },
  });

  return {
    user,
    isAuthenticated,
    logout: logoutMutation.mutate,
    isLoading: logoutMutation.isPending,
  };
}
