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
  pending: { label: '대기', color: 'bg-surface-hover text-content-secondary' },
  sent: { label: '발송됨', color: 'bg-surface-hover text-content-primary' },
  opened: { label: '열람', color: 'bg-warning-bg text-warning' },
  completed: { label: '답변완료', color: 'bg-success-bg text-success' },
  failed: { label: '실패', color: 'bg-danger-bg text-danger' },
  expired: { label: '만료', color: 'bg-surface-hover text-content-tertiary' },
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
            className="p-2 text-content-tertiary transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">응답 관리</h1>
            <p className="text-sm text-content-tertiary">{project?.title}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCloseConfirm(true)}
          className="inline-flex items-center gap-2 bg-danger px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:opacity-85"
        >
          <Lock className="h-4 w-4" />
          수집 마감
        </button>
      </div>

      {/* Progress */}
      <div className="border border-line bg-surface-secondary p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-content-tertiary">응답 진행률</span>
          <span className="font-medium text-content-primary">
            {completedCount} / {totalEmployees}명 완료
          </span>
        </div>
        <div className="h-3 rounded-full bg-surface-hover">
          <div
            className="h-3 rounded-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-content-tertiary">{Math.round(progressPercent)}%</p>
      </div>

      {/* Employee Response Grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-content-tertiary">
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
                className="border border-line bg-surface-secondary p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-content-primary">{emp.name}</p>
                    <p className="text-xs text-content-tertiary">
                      {[emp.department, emp.position].filter(Boolean).join(' · ') || emp.email}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                    {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {statusCfg.label}
                  </span>
                </div>

                {isCompleted && inv?.completed_at && (
                  <p className="mb-2 text-xs text-content-tertiary">
                    답변 완료: {formatDateTime(inv.completed_at)}
                  </p>
                )}

                {resp && (
                  <p className="mb-2 text-xs text-content-tertiary">
                    <MessageSquare className="mr-0.5 inline h-3 w-3" />
                    답변 {(resp as any).answer_count ?? 0}개
                  </p>
                )}

                <div className="flex gap-2">
                  {resp && (
                    <button
                      onClick={() => setSelectedResponseId(resp.id)}
                      className="inline-flex items-center gap-1 bg-surface-hover px-2.5 py-1 text-xs font-medium text-content-secondary hover:bg-surface-hover"
                    >
                      <Eye className="h-3 w-3" />
                      보기
                    </button>
                  )}
                  <Link
                    to={`/projects/${projectId}/responses/manual/${emp.id}`}
                    className="inline-flex items-center gap-1 bg-surface-hover px-2.5 py-1 text-xs font-medium text-accent hover:bg-surface-hover"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
          <div className="w-full max-w-sm bg-surface-secondary p-6">
            <h3 className="text-lg font-semibold text-content-primary">수집 마감</h3>
            <p className="mt-2 text-sm text-content-tertiary">
              수집을 마감하면 더 이상 응답을 받을 수 없습니다. 계속하시겠습니까?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
              >
                취소
              </button>
              <button
                onClick={handleClose}
                disabled={closeCollection.isPending}
                className="inline-flex items-center gap-2 bg-danger px-4 py-2 text-sm font-medium text-accent-text hover:opacity-85 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(0,0,0,.6)]">
      <div className="w-full max-w-lg overflow-y-auto bg-surface-secondary p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-content-primary">
            응답 상세 {resp?.employee_name ? `- ${resp.employee_name}` : ''}
          </h3>
          <button onClick={onClose} className="text-content-tertiary hover:text-content-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-content-tertiary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          </div>
        ) : resp?.answers ? (
          <div className="space-y-4">
            {resp.answers.map((a: any, i: number) => (
              <div key={a.id || i} className="border border-line p-4">
                <p className="mb-1 text-xs font-medium text-content-tertiary">
                  Q{i + 1}. {a.question_text}
                </p>
                <p className="text-sm text-content-primary">
                  {a.text_value || (a.choice_values?.length ? a.choice_values.join(', ') : null) || (a.rating_value != null ? `${a.rating_value}점` : '-')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-content-tertiary">응답 데이터를 불러올 수 없습니다.</p>
        )}
      </div>
    </div>
  );
}
