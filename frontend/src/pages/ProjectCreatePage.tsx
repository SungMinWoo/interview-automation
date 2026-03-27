import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjects';
import { projectSchema } from '@/utils/validators';
import type { ProjectFormValues } from '@/utils/validators';
import toast from 'react-hot-toast';

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      client_name: '',
      client_contact_email: '',
      client_contact_phone: '',
      requirements_text: '',
      existing_site_url: '',
      reference_sites: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'reference_sites',
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const payload = {
        title: data.title,
        client_name: data.client_name,
        client_contact_email: data.client_contact_email || '',
        client_contact_phone: data.client_contact_phone || '',
        requirements_text: data.requirements_text,
        existing_site_url: data.existing_site_url || '',
        reference_sites: data.reference_sites?.map((site) => ({
          url: site.url,
          title: site.title || '',
          description: site.description || '',
        })) || [],
      };
      const project = await createProject.mutateAsync(payload);
      toast.success('프로젝트가 생성되었습니다.');
      navigate(`/projects/${project.id}`);
    } catch {
      toast.error('프로젝트 생성에 실패했습니다.');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">새 프로젝트</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">프로젝트 정보를 입력해주세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                프로젝트명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: ABC 기업 홈페이지 리뉴얼"
                className={inputClass}
                {...register('title')}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                클라이언트 회사명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="예: ABC 주식회사"
                className={inputClass}
                {...register('client_name')}
              />
              {errors.client_name && (
                <p className="mt-1 text-xs text-red-500">{errors.client_name.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  담당자 이메일
                </label>
                <input
                  type="email"
                  placeholder="contact@company.com"
                  className={inputClass}
                  {...register('client_contact_email')}
                />
                {errors.client_contact_email && (
                  <p className="mt-1 text-xs text-red-500">{errors.client_contact_email.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  담당자 전화번호
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  className={inputClass}
                  {...register('client_contact_phone')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">요구사항</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                요구사항 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                placeholder="클라이언트의 요구사항을 자세히 작성해주세요..."
                className={`${inputClass} resize-y`}
                {...register('requirements_text')}
              />
              {errors.requirements_text && (
                <p className="mt-1 text-xs text-red-500">{errors.requirements_text.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                기존 사이트 URL
              </label>
              <input
                type="url"
                placeholder="https://current-site.com"
                className={inputClass}
                {...register('existing_site_url')}
              />
              {errors.existing_site_url && (
                <p className="mt-1 text-xs text-red-500">{errors.existing_site_url.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Reference Sites */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">레퍼런스 사이트</h2>
            <button
              type="button"
              onClick={() => append({ url: '', title: '', description: '' })}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              레퍼런스 사이트를 추가해주세요.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-gray-100 p-4 dark:border-gray-700/50"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      사이트 {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="사이트명"
                      className={inputClass}
                      {...register(`reference_sites.${index}.title`)}
                    />
                    <input
                      type="url"
                      placeholder="https://reference-site.com"
                      className={inputClass}
                      {...register(`reference_sites.${index}.url`)}
                    />
                    <input
                      type="text"
                      placeholder="설명 (선택)"
                      className={inputClass}
                      {...register(`reference_sites.${index}.description`)}
                    />
                  </div>
                  {errors.reference_sites?.[index]?.url && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.reference_sites[index]?.url?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={createProject.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            프로젝트 생성
          </button>
        </div>
      </form>
    </div>
  );
}
