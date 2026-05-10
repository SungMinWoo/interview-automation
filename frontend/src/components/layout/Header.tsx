import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import { ChevronRight, LogOut, Shield } from 'lucide-react';
import { Fragment } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProjects';

interface HeaderProps {
  className?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: '대시보드',
  projects: '프로젝트',
  tools: '도구',
  users: '사용자 관리',
  settings: '설정',
  new: '새 프로젝트',
  analysis: 'AI 분석',
  questionnaire: '질문지',
  distribution: '배포',
  responses: '응답',
  manual: '수동 입력',
  aggregation: 'AI 취합',
  'design-brief': '디자인 브리프',
};

/** 프로젝트 ID 세그먼트(숫자)일 때 프로젝트 제목으로 치환 */
function ProjectTitleSegment({ projectId, isLast, path }: { projectId: number; isLast: boolean; path: string }) {
  const { data: project } = useProject(projectId);
  const label = project?.title || `#${projectId}`;
  return isLast ? (
    <span className="truncate font-medium text-content-primary">{label}</span>
  ) : (
    <Link
      to={path}
      className="truncate text-content-tertiary transition-colors hover:text-content-secondary"
    >
      {label}
    </Link>
  );
}

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // /projects/:id/... 패턴에서 :id 위치 추출
  const projectIdIndex = segments[0] === 'projects' && segments[1] && /^\d+$/.test(segments[1]) ? 1 : -1;

  return (
    <nav className="flex items-center gap-1 text-sm overflow-hidden">
      <Link
        to="/"
        className="flex-shrink-0 text-content-tertiary transition-colors hover:text-content-secondary"
      >
        홈
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;

        // 프로젝트 ID는 제목으로 치환
        if (index === projectIdIndex) {
          return (
            <Fragment key={path}>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-content-tertiary" />
              <ProjectTitleSegment projectId={Number(segment)} isLast={isLast} path={path} />
            </Fragment>
          );
        }

        // 매핑되지 않은 숫자 세그먼트는 # 표기
        const label = routeLabels[segment] || (/^\d+$/.test(segment) ? `#${segment}` : segment);

        return (
          <Fragment key={path}>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-content-tertiary" />
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.first_name || user?.username || user?.email || '사용자';
  const avatarChar = (displayName.charAt(0) || 'U').toUpperCase();
  const isSiteAdmin = !!(user?.is_staff || user?.is_superuser);

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
        <NotificationBell />

        {/* User Menu */}
        <Menu as="div" className="relative">
          <MenuButton
            className="flex items-center gap-2 p-1.5 text-content-secondary transition-colors hover:bg-surface-hover"
            title={displayName}
          >
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
                {avatarChar}
              </div>
              {isSiteAdmin && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-warning-bg"
                  title="사이트 관리자"
                >
                  <Shield className="h-2.5 w-2.5" />
                </div>
              )}
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
            <MenuItems className="absolute right-0 mt-2 w-64 origin-top-right border border-line bg-surface-secondary py-1 shadow-lg focus:outline-none">
              {/* 사용자 정보 헤더 */}
              <div className="border-b border-line px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {avatarChar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-content-primary">{displayName}</p>
                    {user?.email && (
                      <p className="truncate text-xs text-content-tertiary">{user.email}</p>
                    )}
                  </div>
                </div>
                {isSiteAdmin && (
                  <span className="mt-2 inline-flex items-center gap-1 bg-warning-bg px-2 py-0.5 text-[10px] font-medium text-warning">
                    <Shield className="h-3 w-3" />
                    사이트 관리자
                  </span>
                )}
              </div>

              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                      active ? 'bg-danger-bg text-danger' : 'text-danger'
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
