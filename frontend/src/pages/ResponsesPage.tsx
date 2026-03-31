import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Eye,
  PenLine,
  Lock,
  X,
  CheckCircle2,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useResponses, useResponse, useCloseCollection } from '@/hooks/useResponses';
import { useEmployees, useInvitations } from '@/hooks/useDistribution';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

const INV_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  sent: { label: '발송됨', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  opened: { label: '열람', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: '답변완료', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: '실패', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  expired: { label: '만료', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
};

export default function ResponsesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: responses = [], isLoading: respLoading } = useResponses(id);
  const { data: employees = [] } = useEmployees(id);
  const { data: invitations = [] } = useInvitations(id);
  const closeCollection = useCloseCollection();
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Map invitations and responses by employee id
  const invByEmployee: Record<number, { status: string; completed_at?: string | null }> = {};
  for (const inv of invitations) {
    invByEmployee[inv.employee] = inv;
  }

  const respByEmployee: Record<number, { id: number; completed_at?: string | null; answer_count?: number }> = {};
  for (const r of responses as any[]) {
    respByEmployee[r.employee] = r;
  }

  const totalEmployees = employees.length;
  const completedCount = invitations.filter((inv) => inv.status === 'completed').length;
  const progressPercent = totalEmployees > 0 ? (completedCount / totalEmployees) * 100 : 0;

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

  const isLoading = respLoading;

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
            {completedCount} / {totalEmployees}명 완료
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

      {/* Employee Response Grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => {
            const inv = invByEmployee[emp.id];
            const resp = respByEmployee[emp.id];
            const invStatus = inv?.status || 'pending';
            const isCompleted = invStatus === 'completed';
            const statusCfg = INV_STATUS_CONFIG[invStatus] || INV_STATUS_CONFIG.pending;

            return (
              <div
                key={emp.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1a1a2e]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
                    <p className="text-xs text-gray-400">
                      {[emp.department, emp.position].filter(Boolean).join(' · ') || emp.email}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                    {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {statusCfg.label}
                  </span>
                </div>

                {isCompleted && inv?.completed_at && (
                  <p className="mb-2 text-xs text-gray-400">
                    답변 완료: {formatDateTime(inv.completed_at)}
                  </p>
                )}

                {resp && (
                  <p className="mb-2 text-xs text-gray-400">
                    <MessageSquare className="mr-0.5 inline h-3 w-3" />
                    답변 {(resp as any).answer_count ?? 0}개
                  </p>
                )}

                <div className="flex gap-2">
                  {resp && (
                    <button
                      onClick={() => setSelectedResponseId(resp.id)}
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
  const resp = response as any;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl dark:bg-[#1a1a2e]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            응답 상세 {resp?.employee_name ? `- ${resp.employee_name}` : ''}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          </div>
        ) : resp?.answers ? (
          <div className="space-y-4">
            {resp.answers.map((a: any, i: number) => (
              <div key={a.id || i} className="rounded-lg border border-gray-100 p-4 dark:border-gray-700/50">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Q{i + 1}. {a.question_text}
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {a.text_value || (a.choice_values?.length ? a.choice_values.join(', ') : null) || (a.rating_value != null ? `${a.rating_value}점` : '-')}
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
