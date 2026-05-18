import { Link } from 'react-router-dom';
import { FolderOpen, Plus, BarChart3, Clock, CheckCircle2, Users, ArrowRight, Crown, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProjects } from '@/hooks/useProjects';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, MEMBER_ROLE_LABELS, MEMBER_ROLE_COLORS } from '@/utils/constants';
import { formatRelativeTime } from '@/utils/formatters';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: projects = [], isLoading } = useProjects();
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => !['created', 'completed'].includes(p.status),
  ).length;
  const pendingSurveys = projects.filter((p) => p.status === 'distributing' || p.status === 'collecting').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const recentProjects = projects.slice(0, 5);

  // 내 역할별 프로젝트 분포
  const ownedCount = projects.filter((p) => p.my_role === 'owner').length;
  const adminCount = projects.filter((p) => p.my_role === 'admin').length;
  const editorCount = projects.filter((p) => p.my_role === 'editor').length;
  const viewerCount = projects.filter((p) => p.my_role === 'viewer').length;
  const manageableCount = ownedCount + adminCount + editorCount;
  const isViewerHeavy = viewerCount > 0 && manageableCount === 0;

  const stats = [
    { label: '전체 프로젝트', value: totalProjects, icon: FolderOpen, color: 'text-content-primary', bg: 'bg-surface-hover' },
    { label: '진행 중', value: activeProjects, icon: BarChart3, color: 'text-warning', bg: 'bg-warning-bg' },
    { label: '설문 진행', value: pendingSurveys, icon: Users, color: 'text-accent', bg: 'bg-surface-hover' },
    { label: '완료', value: completedProjects, icon: CheckCircle2, color: 'text-success', bg: 'bg-success-bg' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">
          안녕하세요, {user?.first_name?.trim() || user?.username || '사용자'}님
        </h1>
        <p className="mt-1 text-content-tertiary">
          {totalProjects === 0
            ? '아직 참여 중인 프로젝트가 없습니다.'
            : isViewerHeavy
              ? `참여 중인 프로젝트가 ${totalProjects}개 있습니다.`
              : '프로젝트 현황을 한눈에 확인하세요.'}
        </p>
        {totalProjects > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {ownedCount > 0 && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${MEMBER_ROLE_COLORS.owner}`}>
                <Crown className="h-3 w-3" />
                소유 {ownedCount}
              </span>
            )}
            {adminCount > 0 && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${MEMBER_ROLE_COLORS.admin}`}>
                {MEMBER_ROLE_LABELS.admin} {adminCount}
              </span>
            )}
            {editorCount > 0 && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${MEMBER_ROLE_COLORS.editor}`}>
                {MEMBER_ROLE_LABELS.editor} {editorCount}
              </span>
            )}
            {viewerCount > 0 && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${MEMBER_ROLE_COLORS.viewer}`}>
                <Eye className="h-3 w-3" />
                {MEMBER_ROLE_LABELS.viewer} {viewerCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border border-line bg-surface-secondary p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-content-tertiary">{stat.label}</p>
                <p className="text-2xl font-bold text-content-primary">
                  {isLoading ? '-' : stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Projects */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="border border-line bg-surface-secondary p-6">
          <h2 className="mb-4 text-lg font-semibold text-content-primary">빠른 작업</h2>
          <div className="space-y-3">
            {/* Primary CTA: 내 프로젝트 */}
            <Link
              to="/projects"
              className="group flex items-center justify-between gap-3 border border-accent/30 bg-accent/5 p-4 transition-colors hover:bg-accent/10"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-accent/10">
                  <FolderOpen className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-content-primary">
                    {isViewerHeavy ? '참여 중인 프로젝트' : '내 프로젝트'}
                    {totalProjects > 0 && (
                      <span className="ml-1.5 text-accent">{totalProjects}</span>
                    )}
                  </p>
                  <p className="text-xs text-content-tertiary">
                    {activeProjects > 0
                      ? `진행 중 ${activeProjects}개 · 바로 이어서 작업하기`
                      : '전체 프로젝트 보기'}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Secondary CTA: 새 프로젝트 (뷰어 전용 사용자에게는 더 약화) */}
            <Link
              to="/projects/new"
              className={`flex items-center gap-3 border border-line p-3 transition-colors hover:bg-surface-hover ${
                isViewerHeavy ? 'opacity-70' : ''
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center bg-surface-hover">
                <Plus className="h-4 w-4 text-content-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">새 프로젝트</p>
                <p className="text-xs text-content-tertiary">
                  {isViewerHeavy ? '직접 프로젝트를 만들 수도 있습니다' : '새로운 인터뷰 프로젝트 시작'}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2 border border-line bg-surface-secondary p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-content-primary">최근 프로젝트</h2>
            <Link
              to="/projects"
              className="text-sm text-accent hover:text-accent"
            >
              전체 보기
            </Link>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-content-tertiary">
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-content-tertiary">
              <FolderOpen className="mb-2 h-8 w-8" />
              <p className="text-sm">아직 참여 중인 프로젝트가 없습니다</p>
              <p className="mt-1 text-xs text-content-muted">
                새 프로젝트를 만들거나, 다른 멤버가 추가해주길 기다려보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between border border-line p-4 transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content-primary">
                      {project.title}
                    </p>
                    <p className="text-xs text-content-tertiary">
                      {project.client_name}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {project.my_role && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium ${
                          MEMBER_ROLE_COLORS[project.my_role]
                        }`}
                        title={`내 권한: ${MEMBER_ROLE_LABELS[project.my_role]}`}
                      >
                        {project.my_role === 'owner' && <Crown className="h-2.5 w-2.5" />}
                        {project.my_role === 'viewer' && <Eye className="h-2.5 w-2.5" />}
                        {MEMBER_ROLE_LABELS[project.my_role]}
                      </span>
                    )}
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        PROJECT_STATUS_COLORS[project.status]
                      }`}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                    <span className="text-xs text-content-tertiary">
                      {formatRelativeTime(project.updated_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
