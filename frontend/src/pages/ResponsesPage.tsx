import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
  Users as UsersIcon,
  GitMerge,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useMyRole } from '@/hooks/useMembers';
import { RoleBanner } from '@/components/common';
import { useResponses, useResponse, useCloseCollection, useEmployeeDrafts } from '@/hooks/useResponses';
import { useEmployees, useInvitations } from '@/hooks/useDistribution';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

type ResponseTab = 'online' | 'in_person';

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
  const { canEdit, myRole, isSiteAdmin } = useMyRole(id);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ResponseTab = searchParams.get('tab') === 'in_person' ? 'in_person' : 'online';
  const setActiveTab = (tab: ResponseTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'online') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

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
        {canEdit && (
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="inline-flex items-center gap-2 bg-danger px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:opacity-85"
          >
            <Lock className="h-4 w-4" />
            수집 마감
          </button>
        )}
      </div>
      {myRole === 'viewer' && <RoleBanner role="viewer" />}
      {!myRole && isSiteAdmin && <RoleBanner role={null} isSiteAdmin />}

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

      {/* Sub Tabs */}
      <div className="border-b border-line">
        <div className="flex">
          {([
            { value: 'online', label: '온라인 응답' },
            { value: 'in_person', label: '대면 인터뷰' },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === t.value
                  ? 'text-content-primary'
                  : 'text-content-muted hover:text-content-secondary'
              }`}
            >
              {t.label}
              {activeTab === t.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-content-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Response Grid — 온라인 응답 탭 */}
      {activeTab === 'online' && (isLoading ? (
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
                  {canEdit && (
                    <Link
                      to={`/projects/${projectId}/responses/manual/${emp.id}`}
                      className="inline-flex items-center gap-1 bg-surface-hover px-2.5 py-1 text-xs font-medium text-accent hover:bg-surface-hover"
                    >
                      <PenLine className="h-3 w-3" />
                      수동 입력
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* 대면 인터뷰 탭 */}
      {activeTab === 'in_person' && id && (
        <InPersonInterviewSection projectId={id} canEdit={canEdit} />
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

// ─── 대면 인터뷰 탭 ───

function InPersonInterviewSection({ projectId, canEdit }: { projectId: number; canEdit: boolean }) {
  const { data: employees = [] } = useEmployees(projectId);

  if (employees.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center border-2 border-dashed border-line">
        <UsersIcon className="mb-2 h-8 w-8 text-content-muted" />
        <p className="text-sm text-content-tertiary">등록된 직원이 없습니다. 배포 페이지에서 직원을 먼저 추가해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-line bg-surface-secondary p-4 text-xs leading-relaxed text-content-tertiary">
        같은 인터뷰이에 대해 멤버 여러 명이 각자 메모를 작성한 뒤, "머지" 단계에서 최종 답변 하나로 합쳐 공식 응답으로 저장합니다.
        머지된 응답이 AI 취합 입력으로 사용됩니다.
      </div>

      {employees.map((emp) => (
        <InPersonEmployeeCard
          key={emp.id}
          projectId={projectId}
          employee={emp}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function InPersonEmployeeCard({
  projectId,
  employee,
  canEdit,
}: {
  projectId: number;
  employee: { id: number; name: string; position?: string; department?: string };
  canEdit: boolean;
}) {
  const { data: summary, isLoading } = useEmployeeDrafts(projectId, employee.id);
  const drafts = summary?.drafts ?? [];
  const isMerged = !!summary?.merged_response_id;

  return (
    <div className="border border-line bg-surface-secondary p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-content-primary">{employee.name}</p>
          <p className="text-xs text-content-tertiary">
            {[employee.department, employee.position].filter(Boolean).join(' · ') || ''}
          </p>
        </div>
        {isMerged && (
          <span className="inline-flex items-center gap-1 bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3 w-3" />
            머지 완료
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-content-tertiary">로딩 중...</p>
      ) : drafts.length === 0 ? (
        <p className="mb-3 text-xs text-content-tertiary">아직 작성된 메모가 없습니다.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center justify-between text-xs">
              <span className="text-content-secondary">
                {d.author_name || `User ${d.author}`}
              </span>
              <span className="text-content-tertiary">
                {d.is_submitted ? `완료 · ${formatDateTime(d.submitted_at!)}` : `작성 중 · ${d.answer_count}개 답변`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/projects/${projectId}/responses/draft/${employee.id}`}
            className="inline-flex items-center gap-1 border border-line px-2.5 py-1 text-xs font-medium text-content-secondary hover:bg-surface-hover"
          >
            <PenLine className="h-3 w-3" />
            내 메모 작성
          </Link>
          {drafts.some((d) => d.is_submitted) && (
            <Link
              to={`/projects/${projectId}/responses/merge/${employee.id}`}
              className="inline-flex items-center gap-1 bg-accent px-2.5 py-1 text-xs font-medium text-accent-text hover:bg-accent-hover"
            >
              <GitMerge className="h-3 w-3" />
              {isMerged ? '머지 다시하기' : '머지하기'}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
