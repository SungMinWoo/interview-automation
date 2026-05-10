import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Mail,
  LinkIcon,
  RotateCcw,
  X,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  User,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProject } from '@/hooks/useProjects';
import { useMyRole } from '@/hooks/useMembers';
import { RoleBanner } from '@/components/common';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import { useDepartments, usePositions } from '@/hooks/useProjectStructure';
import {
  useEmployees,
  useCreateEmployee,
  useDeleteEmployee,
  useInvitations,
  useGenerateInvitations,
  useSendInvitations,
  useResendInvitation,
  useRegenerateInvitation,
} from '@/hooks/useDistribution';
import { employeeSchema } from '@/utils/validators';
import type { EmployeeFormValues } from '@/utils/validators';
import type { Employee, Invitation } from '@/types/distribution';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: '대기', color: 'bg-surface-hover text-content-secondary', icon: Clock },
  sent: { label: '발송됨', color: 'bg-surface-hover text-content-primary', icon: Mail },
  opened: { label: '열람', color: 'bg-warning-bg text-warning', icon: Eye },
  completed: { label: '답변완료', color: 'bg-success-bg text-success', icon: CheckCircle2 },
  failed: { label: '실패', color: 'bg-danger-bg text-danger', icon: AlertCircle },
  expired: { label: '만료', color: 'bg-surface-hover text-content-tertiary', icon: Clock },
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('링크가 복사되었습니다.');
  });
}

export default function DistributionPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { myRole, isSiteAdmin } = useMyRole(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/projects/${projectId}`}
          className="p-2 text-content-tertiary transition-colors hover:bg-surface-hover"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-content-primary">배포 관리</h1>
          <p className="text-sm text-content-tertiary">{project?.title}</p>
        </div>
      </div>

      {myRole === 'viewer' && <RoleBanner role="viewer" />}
      {!myRole && isSiteAdmin && <RoleBanner role={null} isSiteAdmin />}

      {id && <EmployeeSection projectId={id} />}
    </div>
  );
}

function EmployeeSection({ projectId }: { projectId: number }) {
  const { canEdit } = useMyRole(projectId);
  const { data: employees = [], isLoading: empLoading } = useEmployees(projectId);
  const { data: invitations = [], isLoading: invLoading } = useInvitations(projectId);
  const { data: questionnaire } = useQuestionnaire(projectId);
  const { data: departments = [] } = useDepartments(projectId);
  const { data: positions = [] } = usePositions(projectId);
  const isQuestionnaireConfirmed = questionnaire?.status === 'confirmed';
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const generateInvitations = useGenerateInvitations();
  const sendInvitations = useSendInvitations();
  const resendInvitation = useResendInvitation();
  const regenerateInvitation = useRegenerateInvitation();
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', email: '', phone: '', department: '', position: '' },
  });

  // Map invitations by employee id
  const invByEmployee: Record<number, Invitation> = {};
  for (const inv of invitations) {
    invByEmployee[inv.employee] = inv;
  }

  const onAdd = async (data: EmployeeFormValues) => {
    try {
      await createEmployee.mutateAsync({ projectId, data });
      reset();
      setShowAddModal(false);
      toast.success('직원이 추가되었습니다.');
    } catch {
      toast.error('직원 추가에 실패했습니다.');
    }
  };

  const handleDelete = async (empId: number) => {
    try {
      await deleteEmployee.mutateAsync({ projectId, employeeId: empId });
      toast.success('직원이 삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleGenerateAll = async () => {
    try {
      await generateInvitations.mutateAsync({ projectId, data: {} });
      toast.success('초대 링크가 생성되었습니다.');
    } catch {
      toast.error('초대 링크 생성에 실패했습니다.');
    }
  };

  const handleSendAll = async () => {
    try {
      await sendInvitations.mutateAsync({ projectId });
      toast.success('이메일 발송을 시작합니다.');
    } catch {
      toast.error('이메일 발송에 실패했습니다.');
    }
  };

  const handleResend = async (invId: number) => {
    try {
      await resendInvitation.mutateAsync({ projectId, invitationId: invId });
      toast.success('재발송되었습니다.');
    } catch {
      toast.error('재발송에 실패했습니다.');
    }
  };

  const handleRegenerate = async (employeeId: number) => {
    try {
      await regenerateInvitation.mutateAsync({ projectId, employeeId });
      toast.success('초대 링크가 재생성되었습니다.');
    } catch {
      toast.error('재생성에 실패했습니다.');
    }
  };

  const inputClass =
    'w-full border border-line bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder-content-tertiary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20';

  const isLoading = empLoading || invLoading;

  const employeesWithoutInvitation = employees.filter((e) => !invByEmployee[e.id]);

  return (
    <>
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-tertiary">
          등록된 직원: {employees.length}명
          {invitations.length > 0 && ` · 초대: ${invitations.length}건`}
        </p>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {employeesWithoutInvitation.length > 0 && (
              isQuestionnaireConfirmed ? (
                <button
                  onClick={handleGenerateAll}
                  disabled={generateInvitations.isPending}
                  className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generateInvitations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  전체 초대 링크 생성 ({employeesWithoutInvitation.length})
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm text-content-muted">
                  <AlertCircle className="h-4 w-4" />
                  질문지 확정 후 초대 링크를 생성할 수 있습니다
                </span>
              )
            )}
            {invitations.some((inv) => inv.status === 'pending') && (
              <button
                onClick={handleSendAll}
                disabled={sendInvitations.isPending}
                className="inline-flex items-center gap-2 bg-accent px-3 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendInvitations.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                대기 중 이메일 일괄 발송
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-accent px-3 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              직원 추가
            </button>
          </div>
        )}
      </div>

      {/* Employee List with Invitations */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-content-tertiary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : employees.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center border-2 border-dashed border-line">
          <User className="mb-2 h-8 w-8 text-content-muted" />
          <p className="text-sm text-content-tertiary">
            {canEdit
              ? '등록된 직원이 없습니다. 직원을 추가해주세요.'
              : '아직 등록된 직원이 없습니다. 편집자 이상 권한이 있는 멤버가 직원을 추가하면 여기에 표시됩니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => {
            const inv = invByEmployee[emp.id];
            return <EmployeeCard key={emp.id} employee={emp} invitation={inv} onDelete={handleDelete} onResend={handleResend} onRegenerate={handleRegenerate} projectId={projectId} isQuestionnaireConfirmed={isQuestionnaireConfirmed} canEdit={canEdit} />;
          })}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
          <div className="w-full max-w-md bg-surface-secondary p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-content-primary">직원 추가</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-content-tertiary hover:text-content-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-content-secondary">
                  이름 <span className="text-danger">*</span>
                </label>
                <input type="text" className={inputClass} {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-content-secondary">
                  이메일 <span className="text-danger">*</span>
                </label>
                <input type="email" className={inputClass} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-content-secondary">
                  전화번호 <span className="text-xs text-content-tertiary">(뒷4자리가 설문 비밀번호)</span>
                </label>
                <input type="text" className={inputClass} placeholder="010-1234-5678" {...register('phone')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-content-secondary">부서</label>
                  {departments.length > 0 ? (
                    <select className={inputClass} {...register('department')}>
                      <option value="">선택</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className={inputClass} placeholder="부서명" {...register('department')} />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-content-secondary">직급</label>
                  {positions.length > 0 ? (
                    <select className={inputClass} {...register('position')}>
                      <option value="">선택</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className={inputClass} placeholder="직급" {...register('position')} />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createEmployee.isPending}
                  className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                >
                  {createEmployee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function EmployeeCard({
  employee,
  invitation,
  onDelete,
  onResend,
  onRegenerate,
  projectId,
  isQuestionnaireConfirmed = false,
  canEdit,
}: {
  employee: Employee;
  invitation?: Invitation;
  onDelete: (id: number) => void;
  onResend: (invId: number) => void;
  onRegenerate: (empId: number) => void;
  projectId: number;
  isQuestionnaireConfirmed?: boolean;
  canEdit: boolean;
}) {
  const generateInvitations = useGenerateInvitations();
  const statusCfg = invitation ? STATUS_CONFIG[invitation.is_expired && invitation.status !== 'completed' ? 'expired' : invitation.status] || STATUS_CONFIG.pending : null;

  const handleGenerateForOne = async () => {
    try {
      await generateInvitations.mutateAsync({ projectId, data: {} });
      toast.success('초대 링크가 생성되었습니다.');
    } catch {
      toast.error('생성에 실패했습니다.');
    }
  };

  return (
    <div className="border border-line bg-surface-secondary p-4">
      <div className="flex items-start justify-between">
        {/* Employee Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-content-primary">{employee.name}</p>
            {employee.position && (
              <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                {employee.position}
              </span>
            )}
            {employee.department && (
              <span className="text-xs text-content-tertiary">{employee.department}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-content-tertiary">{employee.email}</p>
          {employee.phone && (
            <p className="text-xs text-content-tertiary">
              {employee.phone} <span className="text-content-muted">· 비밀번호: 뒷4자리</span>
            </p>
          )}
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-2">
          {statusCfg && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
              <statusCfg.icon className="h-3 w-3" />
              {statusCfg.label}
            </span>
          )}
          {canEdit && (
            <button onClick={() => onDelete(employee.id)} className="text-content-tertiary hover:text-danger" title="직원 삭제">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Invitation Details */}
      {invitation ? (
        <div className="mt-3 border border-line bg-surface-primary p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-3.5 w-3.5 flex-shrink-0 text-content-tertiary" />
                <p className="truncate text-xs font-mono text-content-secondary">
                  {invitation.survey_url || `/survey/${invitation.token}`}
                </p>
                <button
                  onClick={() => copyToClipboard(invitation.survey_url || `${window.location.origin}/survey/${invitation.token}`)}
                  className="flex-shrink-0 text-content-tertiary hover:text-accent"
                  title="링크 복사"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-content-tertiary">
                {invitation.expires_at && (
                  <span className={invitation.is_expired ? 'text-danger' : ''}>
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    만료: {formatDateTime(invitation.expires_at)}
                    {invitation.is_expired && ' (만료됨)'}
                  </span>
                )}
                {invitation.sent_at && <span>발송: {formatDateTime(invitation.sent_at)}</span>}
                {invitation.completed_at && (
                  <span className="text-success">
                    <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                    답변: {formatDateTime(invitation.completed_at)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 gap-1">
              {invitation.status !== 'completed' && canEdit && (
                <>
                  <button
                    onClick={() => onResend(invitation.id)}
                    className="bg-surface-secondary px-2 py-1 text-xs font-medium text-content-secondary hover:bg-surface-hover"
                    title="이메일 재발송"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRegenerate(employee.id)}
                    className="bg-surface-secondary px-2 py-1 text-xs font-medium text-content-secondary hover:bg-surface-hover"
                    title="링크 재생성"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : isQuestionnaireConfirmed && canEdit ? (
        <div className="mt-3">
          <button
            onClick={handleGenerateForOne}
            disabled={generateInvitations.isPending}
            className="inline-flex items-center gap-1.5 border border-dashed border-line px-3 py-1.5 text-xs font-medium text-content-tertiary transition-colors hover:border-line-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateInvitations.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3 w-3" />}
            초대 링크 생성
          </button>
        </div>
      ) : !isQuestionnaireConfirmed ? (
        <p className="mt-3 text-xs text-content-muted">질문지 확정 후 초대 링크 생성 가능</p>
      ) : null}
    </div>
  );
}
