import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import { Bell, ChevronRight, User, LogOut, Settings } from 'lucide-react';
import { Fragment } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  className?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: '대시보드',
  projects: '프로젝트',
  settings: '설정',
};

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        to="/"
        className="text-content-tertiary transition-colors hover:text-content-secondary"
      >
        홈
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || segment;

        return (
          <Fragment key={path}>
            <ChevronRight className="h-4 w-4 text-content-tertiary" />
            {isLast ? (
              <span className="font-medium text-content-primary">{label}</span>
            ) : (
              <Link
                to={path}
                className="text-content-tertiary transition-colors hover:text-content-secondary"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function Header({ className = '' }: HeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={`flex h-16 items-center justify-between border-b border-line bg-surface-secondary px-6 ${className}`}
    >
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative p-2 text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User Menu */}
        <Menu as="div" className="relative">
          <MenuButton className="flex items-center gap-2 p-2 text-content-secondary transition-colors hover:bg-surface-hover">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
              U
            </div>
          </MenuButton>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right border border-line bg-surface-secondary py-1 focus:outline-none">
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active
                        ? 'bg-surface-hover text-content-primary'
                        : 'text-content-secondary'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    프로필
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active
                        ? 'bg-surface-hover text-content-primary'
                        : 'text-content-secondary'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    설정
                  </button>
                )}
              </MenuItem>
              <div className="my-1 border-t border-line" />
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active
                        ? 'bg-red-50 text-danger'
                        : 'text-danger'
                    }`}
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
