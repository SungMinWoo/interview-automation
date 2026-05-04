import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, ShieldCheck, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { listAdminUsers, updateAdminUser } from '@/api/admin';
import { ConfirmDialog } from '@/components/common';
import { useAuthStore } from '@/store/authStore';
import type { AdminUser } from '@/types/auth';

export default function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [pendingToggle, setPendingToggle] = useState<AdminUser | null>(null);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => listAdminUsers(search || undefined),
  });

  const toggleMutation = useMutation({
    mutationFn: (u: AdminUser) =>
      updateAdminUser(u.id, { is_active: !u.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('변경되었습니다.');
      setPendingToggle(null);
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string; is_active?: string[] } } }).response?.data
          : null;
      const msg =
        detail?.detail ||
        (Array.isArray(detail?.is_active) ? detail.is_active[0] : detail?.is_active) ||
        '변경에 실패했습니다.';
      toast.error(typeof msg === 'string' ? msg : '변경에 실패했습니다.');
      setPendingToggle(null);
    },
  });

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.email.localeCompare(b.email);
    });
  }, [users]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">사용자 관리</h1>
        <p className="text-sm text-content-tertiary">
          모든 사용자 목록을 확인하고 비활성화 여부를 변경할 수 있습니다.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이메일, 이름, 회사명으로 검색..."
          className="w-full border border-line bg-surface-input py-2 pl-9 pr-3 text-sm text-content-primary placeholder-content-tertiary focus:border-line-focus focus:outline-none"
        />
      </div>

      <div className="border border-line bg-surface-secondary">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-hover text-left text-xs font-medium uppercase tracking-wide text-content-tertiary">
              <tr>
                <th className="px-4 py-3">사용자</th>
                <th className="px-4 py-3">회사</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-content-tertiary">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-content-tertiary">
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const isMe = me?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                            {(u.first_name || u.username || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-content-primary">
                              {u.first_name || u.username}
                              {isMe && (
                                <span className="ml-2 text-xs text-content-tertiary">(나)</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-content-tertiary">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-content-secondary">{u.company_name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.is_superuser && (
                            <span className="inline-flex items-center gap-1 bg-warning-bg px-2 py-0.5 text-xs text-warning">
                              <ShieldCheck className="h-3 w-3" />
                              Superuser
                            </span>
                          )}
                          {u.is_staff && !u.is_superuser && (
                            <span className="inline-flex items-center gap-1 bg-accent/10 px-2 py-0.5 text-xs text-accent">
                              <Shield className="h-3 w-3" />
                              Staff
                            </span>
                          )}
                          {!u.is_staff && !u.is_superuser && (
                            <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-secondary">
                              일반
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="bg-success-bg px-2 py-0.5 text-xs text-success">활성</span>
                        ) : (
                          <span className="bg-danger-bg px-2 py-0.5 text-xs text-danger">비활성</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isMe && u.is_superuser}
                          onClick={() => setPendingToggle(u)}
                          className="border border-line px-3 py-1 text-xs text-content-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                          title={isMe && u.is_superuser ? '본인 superuser 계정은 비활성화 불가' : ''}
                        >
                          {u.is_active ? '비활성화' : '활성화'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!pendingToggle}
        title={pendingToggle?.is_active ? '계정 비활성화' : '계정 활성화'}
        message={
          pendingToggle?.is_active
            ? `${pendingToggle?.first_name || pendingToggle?.email}님의 계정을 비활성화하시겠습니까? 비활성화된 계정은 로그인할 수 없습니다.`
            : `${pendingToggle?.first_name || pendingToggle?.email}님의 계정을 다시 활성화하시겠습니까?`
        }
        confirmText={pendingToggle?.is_active ? '비활성화' : '활성화'}
        variant={pendingToggle?.is_active ? 'danger' : 'info'}
        isLoading={toggleMutation.isPending}
        onConfirm={() => pendingToggle && toggleMutation.mutate(pendingToggle)}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}
