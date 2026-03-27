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
  useExportBrief,
} from '@/hooks/useDesignBrief';
import { BRIEF_STATUS_LABELS, STITCH_STATUS_LABELS } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';
import toast from 'react-hot-toast';

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
  const exportBrief = useExportBrief();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    summary: '',
    projectGoals: '',
    targetAudience: '',
    designDirection: '',
  });
  const [selectedStitchId, setSelectedStitchId] = useState<number | null>(null);

  const startEdit = () => {
    if (brief) {
      setEditForm({
        summary: brief.summary ?? '',
        projectGoals: brief.projectGoals ?? '',
        targetAudience: brief.targetAudience ?? '',
        designDirection: brief.designDirection ?? '',
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
      toast.success('디자인 브리프가 컴파일되었습니다.');
    } catch {
      toast.error('컴파일에 실패했습니다.');
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

  const selectedStitch = stitchGenerations?.find((s) => s.id === selectedStitchId);

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
          <button
            onClick={handleExport}
            disabled={exportBrief.isPending || !brief}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {exportBrief.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            내보내기
          </button>
        </div>
      </div>

      {/* Brief Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">브리프</h2>
          <div className="flex gap-2">
            {brief && !isEditing && (
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
              디자인 브리프 컴파일
            </button>
          </div>
        </div>

        {briefLoading ? (
          <div className="flex h-32 items-center justify-center text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            로딩 중...
          </div>
        ) : !brief ? (
          <div className="flex h-32 flex-col items-center justify-center text-gray-400">
            <p className="text-sm">브리프가 없습니다. 컴파일을 시작해주세요.</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
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
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">프로젝트 목표</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={editForm.projectGoals}
                onChange={(e) => setEditForm((f) => ({ ...f, projectGoals: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">타겟 오디언스</label>
              <textarea
                rows={2}
                className={`${inputClass} resize-y`}
                value={editForm.targetAudience}
                onChange={(e) => setEditForm((f) => ({ ...f, targetAudience: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">디자인 방향</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-y`}
                value={editForm.designDirection}
                onChange={(e) => setEditForm((f) => ({ ...f, designDirection: e.target.value }))}
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
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">상태</p>
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {BRIEF_STATUS_LABELS[brief.status]}
              </span>
            </div>
            {brief.summary && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">요약</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{brief.summary}</p>
              </div>
            )}
            {brief.projectGoals && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">프로젝트 목표</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{brief.projectGoals}</p>
              </div>
            )}
            {brief.targetAudience && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">타겟 오디언스</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{brief.targetAudience}</p>
              </div>
            )}
            {brief.designDirection && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">디자인 방향</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{brief.designDirection}</p>
              </div>
            )}
            {brief.keyRequirements && brief.keyRequirements.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">핵심 요구사항</p>
                <ul className="space-y-1">
                  {brief.keyRequirements.map((req, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">- {req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stitch Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stitch 디자인</h2>
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
        </div>

        {/* Generation History */}
        {!stitchGenerations || stitchGenerations.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-gray-400">
            <Wand2 className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">생성된 디자인이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stitchGenerations.map((gen) => (
              <div
                key={gen.id}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                  selectedStitchId === gen.id
                    ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      생성 #{gen.id}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(gen.createdAt)}
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          gen.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : gen.status === 'processing'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : gen.status === 'failed'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {STITCH_STATUS_LABELS[gen.status]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {gen.status === 'completed' && (
                    <button
                      onClick={() => setSelectedStitchId(gen.id === selectedStitchId ? null : gen.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Eye className="h-3 w-3" />
                      미리보기
                    </button>
                  )}
                  <button
                    onClick={() => handleRegenerateStitch(gen.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    재생성
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Area */}
        {selectedStitch?.generatedContent && (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              미리보기 - 생성 #{selectedStitch.id}
            </div>
            <iframe
              srcDoc={selectedStitch.generatedContent}
              className="h-[500px] w-full border-0 bg-white"
              title="Stitch Preview"
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  );
}
