import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Eye,
  PenLine,
  Lock,
  X,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useResponses, useResponse, useCloseCollection } from '@/hooks/useResponses';
import { useEmployees } from '@/hooks/useDistribution';
import { RESPONSE_STATUS_LABELS, RESPONSE_STATUS_COLORS } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

export default function ResponsesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: responsesData, isLoading } = useResponses(id);
  const { data: employees } = useEmployees(id);
  const closeCollection = useCloseCollection();
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const responses = responsesData?.results ?? [];
  const totalResponses = employees?.length ?? 0;
  const completedCount = responses.filter((r) => r.status === 'completed').length;
  const progressPercent = totalResponses > 0 ? (completedCount / totalResponses) * 100 : 0;

  const handleClose = async () => {
    if (!id) return;
    try {
      await closeCollection.mutateAsync(id);
      setShowCloseConfirm(false);
      toast.success('수집이 마감되었습니다.');
    } catch {
      toast.error('수집 마감에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">응답 관리</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCloseConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          <Lock className="h-4 w-4" />
          수집 마감
        </button>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-[#1a1a2e]">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">응답 진행률</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {completedCount} / {totalResponses}명 완료
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-3 rounded-full bg-indigo-600 transition-all dark:bg-indigo-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-gray-400">{Math.round(progressPercent)}%</p>
      </div>

      {/* Response List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(employees ?? []).map((emp) => {
            const response = responses.find((r) => r.employeeId === emp.id);
            const status = response?.status;
            return (
              <div
                key={emp.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1a1a2e]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
                    <p className="text-xs text-gray-400">
                      {emp.department ?? ''} {emp.position ?? ''}
                    </p>
                  </div>
                  {status ? (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        RESPONSE_STATUS_COLORS[status]
                      }`}
                    >
                      {RESPONSE_STATUS_LABELS[status]}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      미응답
                    </span>
                  )}
                </div>

                {response?.completedAt && (
                  <p className="mb-2 text-xs text-gray-400">
                    {formatDateTime(response.completedAt)}
                  </p>
                )}

                <div className="flex gap-2">
                  {response?.status === 'completed' && (
                    <button
                      onClick={() => setSelectedResponseId(response.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Eye className="h-3 w-3" />
                      보기
                    </button>
                  )}
                  <Link
                    to={`/projects/${projectId}/responses/manual/${emp.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                  >
                    <PenLine className="h-3 w-3" />
                    수동 입력
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response Detail Drawer */}
      {selectedResponseId !== null && (
        <ResponseDetailDrawer
          projectId={id!}
          responseId={selectedResponseId}
          onClose={() => setSelectedResponseId(null)}
        />
      )}

      {/* Close Collection Confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-[#1a1a2e]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">수집 마감</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              수집을 마감하면 더 이상 응답을 받을 수 없습니다. 계속하시겠습니까?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                취소
              </button>
              <button
                onClick={handleClose}
                disabled={closeCollection.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {closeCollection.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                마감
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseDetailDrawer({
  projectId,
  responseId,
  onClose,
}: {
  projectId: number;
  responseId: number;
  onClose: () => void;
}) {
  const { data: response, isLoading } = useResponse(projectId, responseId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl dark:bg-[#1a1a2e]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            응답 상세 - {response?.employeeName ?? ''}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          </div>
        ) : response ? (
          <div className="space-y-4">
            {response.answers.map((a, i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-4 dark:border-gray-700/50">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Q{i + 1}. {a.questionText}
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {Array.isArray(a.answer) ? a.answer.join(', ') : String(a.answer ?? '-')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">응답 데이터를 불러올 수 없습니다.</p>
        )}
      </div>
    </div>
  );
}
