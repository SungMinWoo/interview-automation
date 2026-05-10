import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, FolderOpen, Calendar, Crown } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  MEMBER_ROLE_LABELS,
  MEMBER_ROLE_COLORS,
} from '@/utils/constants';
import { formatDate } from '@/utils/formatters';
import type { ProjectStatus, ProjectType } from '@/types/project';

const STATUS_FILTERS: Array<{ value: ProjectStatus | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'created', label: '생성됨' },
  { value: 'analyzing', label: '분석 중' },
  { value: 'analysis_ready', label: '분석 완료' },
  { value: 'analysis_confirmed', label: '분석 확인됨' },
  { value: 'questionnaire_ready', label: '질문지 완료' },
  { value: 'distributing', label: '배포 중' },
  { value: 'collecting', label: '수집 중' },
  { value: 'closed', label: '마감됨' },
  { value: 'aggregating', label: '취합 중' },
  { value: 'aggregation_ready', label: '취합 완료' },
  { value: 'brief_ready', label: '브리프 완료' },
  { value: 'completed', label: '완료' },
];

const TABS: Array<{ value: ProjectType; label: string; desc: string }> = [
  { value: 'uxui', label: 'UX/UI', desc: '웹사이트/앱 디자인 프로젝트' },
  { value: 'bx', label: 'BX', desc: '브랜드 전략 프로젝트' },
];

export default function ProjectListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: ProjectType = tabParam === 'bx' ? 'bx' : 'uxui';
  const setActiveTab = (tab: ProjectType) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'uxui') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const { data: projects = [], isLoading } = useProjects();
  const tabProjects = projects.filter((p) => (p.project_type || 'uxui') === activeTab);
  const filtered = tabProjects.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const uxuiCount = projects.filter((p) => (p.project_type || 'uxui') === 'uxui').length;
  const bxCount = projects.filter((p) => p.project_type === 'bx').length;
  const tabCounts: Record<ProjectType, number> = { uxui: uxuiCount, bx: bxCount };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">프로젝트</h1>
          <p className="mt-1 text-sm text-content-tertiary">
            전체 프로젝트 {projects.length}개
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          새 프로젝트
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setStatusFilter('all');
                setSearch('');
              }}
              className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'text-content-primary'
                  : 'text-content-muted hover:text-content-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  activeTab === tab.value
                    ? 'bg-accent text-accent-text'
                    : 'bg-surface-hover text-content-tertiary'
                }`}>
                  {tabCounts[tab.value]}
                </span>
              </span>
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-content-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Status filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            placeholder="프로젝트명 또는 회사명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-line bg-surface-secondary py-2.5 pl-10 pr-4 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-accent text-accent-text'
                  : 'bg-surface-hover text-content-secondary hover:text-content-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-content-tertiary">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center border-2 border-dashed border-line">
          <FolderOpen className="mb-3 h-12 w-12 text-content-muted" />
          <p className="text-content-tertiary">
            {search || statusFilter !== 'all'
              ? '검색 결과가 없습니다'
              : `${TABS.find((t) => t.value === activeTab)?.label} 프로젝트가 없습니다`}
          </p>
          {!search && statusFilter === 'all' && (
            <Link
              to="/projects/new"
              className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:text-accent"
            >
              <Plus className="h-4 w-4" />
              새 프로젝트 만들기
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group border border-line bg-surface-secondary p-5 transition-all hover:border-line-hover"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-content-primary group-hover:text-accent">
                    {project.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-content-tertiary">
                    {project.client_name}
                  </p>
                </div>
                <div className="ml-2 flex flex-shrink-0 flex-col items-end gap-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      PROJECT_STATUS_COLORS[project.status]
                    }`}
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                  {project.my_role && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium ${
                        MEMBER_ROLE_COLORS[project.my_role]
                      }`}
                      title="내 권한"
                    >
                      {MEMBER_ROLE_LABELS[project.my_role]}
                    </span>
                  )}
                </div>
              </div>

              {project.requirements_text && (
                <p className="mb-3 line-clamp-2 text-sm text-content-tertiary">
                  {project.requirements_text}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-content-tertiary">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(project.created_at)}
                </span>
                {project.owner_name && (
                  <span
                    className="inline-flex items-center gap-1 truncate"
                    title={project.owner_email || project.owner_name}
                  >
                    <Crown className="h-3.5 w-3.5 text-accent" />
                    <span className="truncate">{project.owner_name}</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
