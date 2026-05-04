import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!user?.is_staff && !user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
