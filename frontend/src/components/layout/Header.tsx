import { useLocation, Link } from 'react-router-dom';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import { Bell, ChevronRight, User, LogOut, Settings } from 'lucide-react';
import { Fragment } from 'react';
import { ThemeToggle } from './ThemeToggle';

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
        className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        홈
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || segment;

        return (
          <Fragment key={path}>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            {isLast ? (
              <span className="font-medium text-gray-900 dark:text-white">{label}</span>
            ) : (
              <Link
                to={path}
                className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
  return (
    <header
      className={`flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User Menu */}
        <Menu as="div" className="relative">
          <MenuButton className="flex items-center gap-2 rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
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
            <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-800">
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active
                        ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
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
                        ? 'bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    설정
                  </button>
                )}
              </MenuItem>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <MenuItem>
                {({ active }) => (
                  <button
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active
                        ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                        : 'text-red-600 dark:text-red-400'
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
