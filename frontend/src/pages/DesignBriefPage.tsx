import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Wand2,
  Download,
  Eye,
  Clock,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import {
  useDesignBrief,
  useCompileBrief,
  useUpdateBrief,
  useStitchGenerations,
  useTriggerStitch,
  useRegenerateStitch,
  useFetchStitchScreens,
  useExportBrief,
  useGenerateDesignMd,
  downloadDesignMd,
} from '@/hooks/useDesignBrief';
import { AiProviderSelect } from '@/components/common';
import { DEFAULT_AI_PROVIDER, AI_PROVIDER_LABELS, type AiProvider } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

const STITCH_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  processing: '생성 중',
  completed: '완료',
  failed: '실패',
};

export default function DesignBriefPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: brief, isLoading: briefLoading } = useDesignBrief(id);
  const compileBrief = useCompileBrief();
  const updateBrief = useUpdateBrief();
  const { data: stitchGenerations } = useStitchGenerations(id);
  const triggerStitch = useTriggerStitch();
  const regenerateStitch = useRegenerateStitch();
  const fetchScreens = useFetchStitchScreens();
  const exportBrief = useExportBrief();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    target_audience: '',
    design_direction: '',
    additional_notes: '',
    color_preferences: { primary: '', secondary: '', accent: '' } as Record<string, string>,
  });
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [selectedStitchId, setSelectedStitchId] = useState<number | null>(null);
  const [showPromptId, setShowPromptId] = useState<number | null>(null);
  const [fetchingGenId, setFetchingGenId] = useState<number | null>(null);

  // Use actual backend field names (snake_case)
  const briefData = brief as any;

  const startEdit = () => {
    if (briefData) {
      const cp = briefData.color_preferences ?? {};
      setEditForm({
        title: briefData.title ?? '',
        summary: briefData.summary ?? '',
        target_audience: briefData.target_audience ?? '',
        design_direction: briefData.design_direction ?? '',
        additional_notes: briefData.additional_notes ?? '',
        color_preferences: {
          primary: cp.primary ?? '',
          secondary: cp.secondary ?? '',
          accent: cp.accent ?? '',
        },
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateBrief.mutateAsync({ projectId: id, data: editForm });
      setIsEditing(false);
      toast.success('브리프가 저장되었습니다.');
    } catch {
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleCompile = async () => {
    if (!id) return;
    try {
      await compileBrief.mutateAsync(id);
      toast.success('취합 결과를 기반으로 디자인 브리프가 생성되었습니다.');
    } catch {
      toast.error('컴파일에 실패했습니다. 취합을 먼저 완료해주세요.');
    }
  };

  const handleStitch = async () => {
    if (!id) return;
    try {
      await triggerStitch.mutateAsync({ projectId: id });
      toast.success('Stitch 디자인 생성을 시작합니다.');
    } catch {
      toast.error('생성에 실패했습니다.');
    }
  };

  const handleRegenerateStitch = async (stitchId: number) => {
    if (!id) return;
    try {
      await regenerateStitch.mutateAsync({ projectId: id, stitchId });
      toast.success('재생성을 시작합니다.');
    } catch {
      toast.error('재생성에 실패했습니다.');
    }
  };

  const handleFetchScreens = async (genId: number) => {
    if (!id) return;
    setFetchingGenId(genId);
    try {
      await fetchScreens.mutateAsync({ projectId: id, generationId: genId });
      toast.success('Stitch에서 결과를 가져왔습니다.');
    } catch {
      toast.error('결과 가져오기에 실패했습니다.');
    } finally {
      setFetchingGenId(null);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const result = await exportBrief.mutateAsync({ projectId: id, data: { format: 'html' } });
      window.open(result.downloadUrl, '_blank');
      toast.success('내보내기가 완료되었습니다.');
    } catch {
      toast.error('내보내기에 실패했습니다.');
    }
  };

  const selectedStitch = stitchGenerations?.find((s: any) => s.id === selectedStitchId);

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">디자인 브리프</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {briefData && (
            <button
              onClick={handleExport}
              disabled={exportBrief.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5 disabled:opacity-50"
            >
              {exportBrief.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              내보내기
            </button>
          )}
        </div>
      </div>

      {/* Brief Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">브리프</h2>
          <div className="flex gap-2">
            {briefData && !isEditing && (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                수정
              </button>
            )}
            <button
              onClick={handleCompile}
              disabled={compileBrief.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {compileBrief.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              {briefData ? '브리프 재생성' : '취합 결과로 브리프 생성'}
            </button>
          </div>
        </div>

        {briefLoading ? (
          <div className="flex h-32 items-center justify-center text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            로딩 중...
          </div>
        ) : !briefData ? (
          <div className="flex h-32 flex-col items-center justify-center text-gray-400">
            <FileText className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">브리프가 없습니다. 취합 결과를 기반으로 브리프를 생성해주세요.</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">제목</label>
              <input
                className={inputClass}
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">요약</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={editForm.summary}
                onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">타겟 오디언스</label>
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={editForm.target_audience}
                onChange={(e) => setEditForm((f) => ({ ...f, target_audience: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">디자인 방향</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={editForm.design_direction}
                onChange={(e) => setEditForm((f) => ({ ...f, design_direction: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">브랜드 키 컬러</label>
              <div className="grid grid-cols-3 gap-3">
                {(['primary', 'secondary', 'accent'] as const).map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                      {key === 'primary' ? '메인 컬러' : key === 'secondary' ? '보조 컬러' : '강조 컬러'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editForm.color_preferences[key] || '#6366f1'}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            color_preferences: { ...f.color_preferences, [key]: e.target.value },
                          }))
                        }
                        className="h-9 w-9 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        placeholder="#6366f1"
                        value={editForm.color_preferences[key] || ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            color_preferences: { ...f.color_preferences, [key]: e.target.value },
                          }))
                        }
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">추가 메모</label>
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={editForm.additional_notes}
                onChange={(e) => setEditForm((f) => ({ ...f, additional_notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={updateBrief.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateBrief.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {briefData.title && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">제목</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{briefData.title}</p>
              </div>
            )}
            {briefData.summary && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">요약</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{briefData.summary}</p>
              </div>
            )}
            {briefData.target_audience && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">타겟 오디언스</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{briefData.target_audience}</p>
              </div>
            )}
            {briefData.design_direction && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">디자인 방향</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{briefData.design_direction}</p>
              </div>
            )}
            {briefData.key_requirements?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">핵심 요구사항</p>
                <ul className="space-y-1">
                  {briefData.key_requirements.map((req: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">- {req}</li>
                  ))}
                </ul>
              </div>
            )}
            {briefData.selected_keywords?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">선택된 키워드</p>
                <div className="flex flex-wrap gap-1.5">
                  {briefData.selected_keywords.map((kw: any, i: number) => (
                    <span key={i} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
                      {typeof kw === 'string' ? kw : kw.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {briefData.selected_sentences?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">핵심 문장</p>
                <ul className="space-y-1">
                  {briefData.selected_sentences.map((s: any, i: number) => (
                    <li key={i} className="text-sm italic text-gray-600 dark:text-gray-400">
                      "{typeof s === 'string' ? s : s.text}"
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {briefData.color_preferences && Object.values(briefData.color_preferences).some(Boolean) && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">브랜드 키 컬러</p>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(briefData.color_preferences as Record<string, string>).filter(([, v]) => v).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600" style={{ backgroundColor: value }} />
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{key === 'primary' ? '메인' : key === 'secondary' ? '보조' : '강조'}</p>
                        <p className="font-mono text-xs text-gray-400">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {briefData.tone_and_mood && Object.keys(briefData.tone_and_mood).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">톤 & 무드</p>
                <pre className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(briefData.tone_and_mood, null, 2)}
                </pre>
              </div>
            )}
            {briefData.additional_notes && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">추가 메모</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{briefData.additional_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Design MD Section */}
      {briefData && (
        <DesignMdSection projectId={id!} briefData={briefData} aiProvider={aiProvider} setAiProvider={setAiProvider} />
      )}

      {/* Stitch Section - only show if brief exists */}
      {briefData && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stitch 디자인</h2>
            <div className="flex items-center gap-2">
              {!briefData.design_md ? (
                <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  DESIGN.md를 먼저 생성해주세요
                </span>
              ) : (
                <button
                  onClick={handleStitch}
                  disabled={triggerStitch.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {triggerStitch.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Stitch 디자인 생성
                </button>
              )}
            </div>
          </div>

          {/* Generation History */}
          {!stitchGenerations || stitchGenerations.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-gray-400">
              <Wand2 className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">생성된 디자인이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stitchGenerations.map((gen: any) => {
                const hasHtml = !!gen.generated_html_content;
                const isOpen = selectedStitchId === gen.id;
                const isPromptOpen = showPromptId === gen.id;
                const isFetching = fetchingGenId === gen.id;

                return (
                  <div key={gen.id} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    {/* Card Header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
                          <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">v{gen.version}</p>
                            {gen.ai_provider && (
                              <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                {AI_PROVIDER_LABELS[gen.ai_provider as AiProvider] || gen.ai_provider}
                              </span>
                            )}
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              gen.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : gen.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : gen.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {STITCH_STATUS_LABELS[gen.status] || gen.status}
                            </span>
                            {hasHtml && <span className="text-[10px] text-green-600">HTML 있음</span>}
                            {!hasHtml && gen.stitch_project_id && <span className="text-[10px] text-yellow-600">프로젝트만 생성됨</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(gen.created_at)}
                          </div>
                          {gen.error_message && (
                            <p className="mt-0.5 text-xs text-orange-500 dark:text-orange-400">{gen.error_message}</p>
                          )}
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {gen.stitch_project_url && (
                          <a
                            href={gen.stitch_project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                          >
                            <Wand2 className="h-3 w-3" />
                            Stitch에서 보기
                          </a>
                        )}
                        {gen.stitch_project_id && (
                          <button
                            onClick={() => handleFetchScreens(gen.id)}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                          >
                            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                            결과 가져오기
                          </button>
                        )}
                        {hasHtml && (
                          <button
                            onClick={() => setSelectedStitchId(isOpen ? null : gen.id)}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            <Eye className="h-3 w-3" />
                            {isOpen ? '접기' : '미리보기'}
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerateStitch(gen.id)}
                          disabled={isFetching}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3 w-3" />
                          재생성
                        </button>
                        {(gen.design_md_snapshot || gen.prompt_text) && (
                          <button
                            onClick={() => setShowPromptId(isPromptOpen ? null : gen.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <FileText className="h-3 w-3" />
                            {isPromptOpen ? '상세 접기' : 'DESIGN.md 보기'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Design MD & Prompt Detail */}
                    {isPromptOpen && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50 space-y-3">
                        {gen.design_md_snapshot && (
                          <div>
                            <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">DESIGN.md (생성 시점)</p>
                            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-relaxed text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                              {gen.design_md_snapshot}
                            </pre>
                          </div>
                        )}
                        {gen.prompt_text && (
                          <div>
                            <p className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">스크린 생성 프롬프트</p>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-relaxed text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                              {gen.prompt_text}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Preview - directly under this card */}
                    {isOpen && hasHtml && (
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between bg-gray-50 px-4 py-2 dark:bg-gray-800">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">미리보기 - v{gen.version}</span>
                          {gen.generated_html_url && (
                            <a href={gen.generated_html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                              새 탭에서 열기
                            </a>
                          )}
                        </div>
                        <iframe
                          srcDoc={gen.generated_html_content}
                          className="h-[600px] w-full border-0 bg-white"
                          title={`Stitch Preview v${gen.version}`}
                          sandbox="allow-scripts"
                        />
                        {gen.generated_screenshot_url && (
                          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">스크린샷</p>
                            <img src={gen.generated_screenshot_url} alt="Screenshot" className="max-h-80 rounded-lg border border-gray-200 dark:border-gray-700" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DesignMdSection({
  projectId,
  briefData,
  aiProvider,
  setAiProvider,
}: {
  projectId: number;
  briefData: any;
  aiProvider: AiProvider;
  setAiProvider: (v: AiProvider) => void;
}) {
  const generateDesignMd = useGenerateDesignMd();
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    try {
      await generateDesignMd.mutateAsync({ projectId, ai_provider: aiProvider });
      toast.success('DESIGN.md가 생성되었습니다.');
    } catch {
      toast.error('DESIGN.md 생성에 실패했습니다.');
    }
  };

  const handleDownload = () => {
    if (!briefData.design_md) return;
    const blob = new Blob([briefData.design_md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DESIGN.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!briefData.design_md) return;
    navigator.clipboard.writeText(briefData.design_md);
    toast.success('클립보드에 복사되었습니다.');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">DESIGN.md</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Stitch에 전달할 디자인 시스템 명세서</p>
        </div>
        <div className="flex items-center gap-2">
          {briefData.design_md && (
            <>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                복사
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <Download className="h-3 w-3" />
                다운로드
              </button>
            </>
          )}
          <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
          <button
            onClick={handleGenerate}
            disabled={generateDesignMd.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {generateDesignMd.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {briefData.design_md ? 'DESIGN.md 재생성' : 'DESIGN.md 생성'}
          </button>
        </div>
      </div>

      {!briefData.design_md ? (
        <div className="flex h-24 flex-col items-center justify-center text-gray-400">
          <FileText className="mb-2 h-6 w-6 opacity-30" />
          <p className="text-xs">브리프를 기반으로 DESIGN.md를 생성해주세요.</p>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="mb-3 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {showPreview ? '접기' : '미리보기 펼치기'} ({briefData.design_md.length.toLocaleString()}자)
          </button>
          {showPreview && (
            <pre className="max-h-[500px] overflow-auto rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {briefData.design_md}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
