import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderOpen, Calendar } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';
import type { ProjectStatus } from '@/types/project';

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

export default function ProjectListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const { data: projectsData, isLoading } = useProjects();

  const projects = projectsData?.results ?? [];
  const filtered = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-accent text-accent-text'
                  : 'bg-surface-hover text-content-secondary hover:bg-surface-hover'
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
              : '아직 프로젝트가 없습니다'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link
              to="/projects/new"
              className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:text-accent"
            >
              <Plus className="h-4 w-4" />
              첫 프로젝트 만들기
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
                <span
                  className={`ml-2 inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    PROJECT_STATUS_COLORS[project.status]
                  }`}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
              </div>

              {project.requirements_text && (
                <p className="mb-3 line-clamp-2 text-sm text-content-tertiary">
                  {project.requirements_text}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-content-tertiary">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
