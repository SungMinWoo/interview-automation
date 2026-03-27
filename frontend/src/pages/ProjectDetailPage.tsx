import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useProject, useDeleteProject } from '@/hooks/useProjects';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_PHASES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';
import type { ProjectStatus } from '@/types/project';
import toast from 'react-hot-toast';
import { useState } from 'react';

const STATUS_ORDER: ProjectStatus[] = [
  'created',
  'analyzing',
  'analysis_ready',
  'analysis_confirmed',
  'questionnaire_ready',
  'distributing',
  'collecting',
  'closed',
  'aggregating',
  'aggregation_ready',
  'brief_ready',
  'completed',
];

function getPhaseState(
  projectStatus: ProjectStatus,
  phaseKey: string,
): 'completed' | 'active' | 'upcoming' {
  // Map each phase key to the first status in that phase's range.
  // A phase is "completed" once the project status index is past the phase's last status.
  const phaseStatusMap: Record<string, { start: ProjectStatus; end: ProjectStatus }> = {
    analysis: { start: 'analyzing', end: 'analysis_confirmed' },
    questionnaire: { start: 'questionnaire_ready', end: 'questionnaire_ready' },
    distribution: { start: 'distributing', end: 'distributing' },
    collection: { start: 'collecting', end: 'closed' },
    aggregation: { start: 'aggregating', end: 'aggregation_ready' },
    brief: { start: 'brief_ready', end: 'brief_ready' },
  };
  const phaseRange = phaseStatusMap[phaseKey];
  if (!phaseRange) return 'upcoming';

  const projectIdx = STATUS_ORDER.indexOf(projectStatus);
  const phaseStartIdx = STATUS_ORDER.indexOf(phaseRange.start);
  const phaseEndIdx = STATUS_ORDER.indexOf(phaseRange.end);

  if (projectIdx > phaseEndIdx) return 'completed';
  if (projectIdx >= phaseStartIdx && projectIdx <= phaseEndIdx) return 'active';
  return 'upcoming';
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project, isLoading, error } = useProject(id);
  const deleteProject = useDeleteProject();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteProject.mutateAsync(id);
      toast.success('프로젝트가 삭제되었습니다.');
      navigate('/projects');
    } catch {
      toast.error('프로젝트 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        로딩 중...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-400">
        <p>프로젝트를 찾을 수 없습니다.</p>
        <Link to="/projects" className="mt-2 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
          프로젝트 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  PROJECT_STATUS_COLORS[project.status]
                }`}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {project.client_name} &middot; {formatDate(project.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            title="프로젝트 삭제"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {project.requirements_text && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <p className="text-sm text-gray-600 dark:text-gray-300">{project.requirements_text}</p>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">프로젝트 진행 현황</h2>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-6">
            {PROJECT_PHASES.map((phase, index) => {
              const state = getPhaseState(project.status, phase.key);
              return (
                <div key={phase.key} className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center">
                    {state === 'completed' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    ) : state === 'active' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 ring-4 ring-indigo-50 dark:bg-indigo-900/30 dark:ring-indigo-900/10">
                        <div className="h-3 w-3 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            state === 'active'
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : state === 'completed'
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {index + 1}. {phase.label}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {state === 'completed'
                            ? '완료'
                            : state === 'active'
                              ? '진행 중'
                              : '대기'}
                        </p>
                      </div>
                      <Link
                        to={`/projects/${project.id}/${phase.path}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          state === 'active'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : state === 'completed'
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                              : 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500'
                        }`}
                      >
                        {state === 'active' ? '진행하기' : '보기'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reference Sites */}
      {project.reference_sites && project.reference_sites.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">레퍼런스 사이트</h2>
          <div className="space-y-2">
            {project.reference_sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700/50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{site.title}</p>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {site.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-[#1a1a2e]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">프로젝트 삭제</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
