import { Crown, Shield, Pencil, Eye } from 'lucide-react';
import type { MemberRole } from '@/types/member';
import { MEMBER_ROLE_LABELS } from '@/utils/constants';

interface RoleBannerProps {
  role: MemberRole | null;
  isSiteAdmin?: boolean;
}

const ROLE_ICONS: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
};

const ROLE_PERMISSIONS: Record<MemberRole, string> = {
  owner: '모든 권한 · 멤버/소유권 관리, 프로젝트 삭제',
  admin: '콘텐츠 편집 · 멤버 관리 가능',
  editor: '콘텐츠 편집 가능 · 멤버 관리 불가',
  viewer: '읽기 전용 · 편집 및 AI 실행 불가',
};

export function RoleBanner({ role, isSiteAdmin }: RoleBannerProps) {
  if (!role && !isSiteAdmin) return null;

  if (isSiteAdmin && !role) {
    return (
      <div className="flex items-center gap-2 border border-warning bg-warning-bg px-3 py-2 text-xs text-warning">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-medium">사이트 관리자</span>
        <span className="text-content-tertiary">·</span>
        <span>이 프로젝트의 멤버는 아니지만 모든 권한으로 조회/관리합니다.</span>
      </div>
    );
  }

  if (!role) return null;

  // Viewer: prominent banner — this is the user the feedback is targeting.
  if (role === 'viewer') {
    return (
      <div className="flex items-start gap-3 border border-line bg-surface-hover px-4 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-content-tertiary/10">
          <Eye className="h-4 w-4 text-content-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-content-primary">읽기 전용 모드 (뷰어)</span>
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-content-tertiary/10 text-content-secondary">
              View only
            </span>
          </div>
          <p className="mt-0.5 text-xs text-content-tertiary">
            프로젝트 내용을 조회만 할 수 있습니다. 편집·AI 실행·멤버 관리는 편집자 이상 권한이 필요합니다.
          </p>
        </div>
      </div>
    );
  }

  // Owner / Admin / Editor: subtle inline pill — informational, not nagging.
  const Icon = ROLE_ICONS[role];
  return (
    <div className="inline-flex items-center gap-2 border border-line bg-surface-secondary px-2.5 py-1 text-xs text-content-tertiary">
      <Icon className="h-3.5 w-3.5 text-accent" />
      <span className="font-medium text-content-secondary">내 권한: {MEMBER_ROLE_LABELS[role]}</span>
      <span className="text-content-muted">·</span>
      <span>{ROLE_PERMISSIONS[role]}</span>
    </div>
  );
}
