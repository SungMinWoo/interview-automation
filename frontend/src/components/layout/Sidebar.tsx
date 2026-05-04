import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Wrench, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

const baseNavItems = [
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/projects', label: '프로젝트', icon: FolderOpen },
  { to: '/tools', label: '도구', icon: Wrench },
];

const adminNavItems = [
  { to: '/admin/users', label: '사용자 관리', icon: Users },
];

export function Sidebar({ collapsed, onToggle, className = '' }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const isSiteAdmin = !!(user?.is_staff || user?.is_superuser);
  const navItems = isSiteAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;
  return (
    <aside
      className={`
        fixed left-0 top-0 z-30 flex h-screen flex-col
        border-r border-line bg-surface-secondary
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
        ${className}
      `}
    >
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-line px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-accent text-sm font-bold text-accent-text">
            IS
          </div>
          {!collapsed && (
            <span className="whitespace-nowrap text-lg font-semibold text-content-primary">
              Interview Site
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
              }
              ${collapsed ? 'justify-center' : ''}
              `
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-line p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center p-2 text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary"
          aria-label={collapsed ? '사이드바 열기' : '사이드바 접기'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
