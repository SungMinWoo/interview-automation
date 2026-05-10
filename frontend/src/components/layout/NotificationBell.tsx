import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications';
import type { Notification } from '@/types/notification';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function NotificationBell() {
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;

  const handleNotificationClick = (n: Notification, close: () => void) => {
    if (!n.is_read) {
      markAsRead.mutate(n.id);
    }
    if (n.project) {
      close();
      navigate(`/projects/${n.project}`);
    }
  };

  return (
    <Popover as="div" className="relative">
      <PopoverButton
        className="relative p-2 text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary focus:outline-none"
        aria-label="알림"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </PopoverButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <PopoverPanel className="absolute right-0 mt-2 w-80 origin-top-right border border-line bg-surface-secondary shadow-lg z-50 focus:outline-none">
          {({ close }) => (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="text-sm font-semibold text-content-primary">알림</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead.mutate()}
                    disabled={markAllAsRead.isPending}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    모두 읽음
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-content-tertiary">
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n, close)}
                      className={`w-full text-left px-4 py-3 border-b border-line last:border-b-0 transition-colors hover:bg-surface-hover ${
                        !n.is_read ? 'bg-accent/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                        )}
                        <div className={`flex-1 min-w-0 ${n.is_read ? 'ml-4' : ''}`}>
                          <p className={`text-sm leading-tight ${!n.is_read ? 'font-medium text-content-primary' : 'text-content-secondary'}`}>
                            {n.title}
                          </p>
                          {n.actor_name && (
                            <p className="mt-0.5 text-xs text-content-tertiary">{n.actor_name}</p>
                          )}
                          <p className="mt-0.5 text-xs text-content-muted">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}
