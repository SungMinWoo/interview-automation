import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Mail,
  LinkIcon,
  RotateCcw,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProject } from '@/hooks/useProjects';
import {
  useEmployees,
  useCreateEmployee,
  useDeleteEmployee,
  useInvitations,
  useGenerateInvitations,
  useSendInvitations,
  useResendInvitation,
} from '@/hooks/useDistribution';
import { employeeSchema } from '@/utils/validators';
import type { EmployeeFormValues } from '@/utils/validators';
import { INVITATION_STATUS_LABELS, INVITATION_STATUS_COLORS } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

export default function DistributionPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const [activeTab, setActiveTab] = useState<'employees' | 'distribution'>('employees');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/projects/${projectId}`}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">배포 관리</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'employees'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-[#1a1a2e] dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          직원 관리
        </button>
        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'distribution'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-[#1a1a2e] dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          배포 현황
        </button>
      </div>

      {activeTab === 'employees' ? (
        <EmployeeTab projectId={id!} />
      ) : (
        <DistributionTab projectId={id!} />
      )}
    </div>
  );
}

function EmployeeTab({ projectId }: { projectId: number }) {
  const { data: employees, isLoading } = useEmployees(projectId);
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', email: '', department: '', position: '' },
  });

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

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          등록된 직원: {employees?.length ?? 0}명
        </p>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5">
            <Upload className="h-4 w-4" />
            일괄 가져오기
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            직원 추가
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : !employees || employees.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400">등록된 직원이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">이름</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">이메일</th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 dark:text-gray-400 sm:table-cell">
                  부서
                </th>
                <th className="hidden px-4 py-3 font-medium text-gray-500 dark:text-gray-400 sm:table-cell">
                  직급
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-[#1a1a2e]">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {emp.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{emp.email}</td>
                  <td className="hidden px-4 py-3 text-gray-500 dark:text-gray-400 sm:table-cell">
                    {emp.department ?? '-'}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 dark:text-gray-400 sm:table-cell">
                    {emp.position ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-[#1a1a2e]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">직원 추가</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input type="text" className={inputClass} {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input type="email" className={inputClass} {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    부서
                  </label>
                  <input type="text" className={inputClass} {...register('department')} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    직급
                  </label>
                  <input type="text" className={inputClass} {...register('position')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createEmployee.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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

function DistributionTab({ projectId }: { projectId: number }) {
  const { data: invitationsData, isLoading } = useInvitations(projectId);
  const generateInvitations = useGenerateInvitations();
  const sendInvitations = useSendInvitations();
  const resendInvitation = useResendInvitation();

  const invitations = invitationsData?.results ?? [];

  const handleGenerate = async () => {
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
      toast.success('이메일이 발송되었습니다.');
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

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          초대 {invitations.length}건
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generateInvitations.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {generateInvitations.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            초대 링크 생성
          </button>
          <button
            onClick={handleSendAll}
            disabled={sendInvitations.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {sendInvitations.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            이메일 발송
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : invitations.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400">초대가 없습니다. 초대 링크를 먼저 생성해주세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1a1a2e]"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {inv.employeeName}
                </p>
                <p className="text-xs text-gray-400">{inv.employeeEmail}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    INVITATION_STATUS_COLORS[inv.status]
                  }`}
                >
                  {INVITATION_STATUS_LABELS[inv.status]}
                </span>
                {inv.sentAt && (
                  <span className="text-xs text-gray-400">{formatDateTime(inv.sentAt)}</span>
                )}
                {(inv.status === 'sent' || inv.status === 'failed') && (
                  <button
                    onClick={() => handleResend(inv.id)}
                    className="rounded p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="재발송"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
