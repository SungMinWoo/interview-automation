import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

const navItems = [
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/projects', label: '프로젝트', icon: FolderOpen },
];

export function Sidebar({ collapsed, onToggle, className = '' }: SidebarProps) {
  return (
    <aside
      className={`
        fixed left-0 top-0 z-30 flex h-screen flex-col
        border-r border-gray-200 bg-white
        transition-all duration-300 ease-in-out
        dark:border-gray-700 dark:bg-[#1a1a2e]
        ${collapsed ? 'w-16' : 'w-64'}
        ${className}
      `}
    >
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            IS
          </div>
          {!collapsed && (
            <span className="whitespace-nowrap text-lg font-semibold text-gray-900 dark:text-white">
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
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
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
      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
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
