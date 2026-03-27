import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, CheckCircle2, AlertCircle, Pencil, Check, RefreshCw, XCircle } from 'lucide-react';
import {
  useAnalysis,
  useAnalysisStatus,
  useTriggerAnalysis,
  useUpdateAnalysis,
  useConfirmAnalysis,
} from '@/hooks/useAnalysis';
import { useProject } from '@/hooks/useProjects';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  processing: '분석 중',
  completed: '완료',
  confirmed: '확인됨',
  failed: '실패',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AnalysisPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: analysis, refetch: refetchAnalysis } = useAnalysis(id);
  const [isPolling, setIsPolling] = useState(false);
  const { data: statusData } = useAnalysisStatus(id, isPolling);
  const triggerAnalysis = useTriggerAnalysis();
  const updateAnalysis = useUpdateAnalysis();
  const confirmAnalysis = useConfirmAnalysis();
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    requirements_summary: '',
    combined_insights: {} as Record<string, unknown>,
  });

  // Polling logic
  useEffect(() => {
    if (analysis?.status === 'processing') {
      setIsPolling(true);
    }
  }, [analysis?.status]);

  useEffect(() => {
    if (statusData?.status === 'completed' || statusData?.status === 'failed') {
      setIsPolling(false);
      refetchAnalysis();
    }
  }, [statusData?.status, refetchAnalysis]);

  // Init edit data
  useEffect(() => {
    if (analysis && (analysis.status === 'completed' || analysis.status === 'confirmed')) {
      setEditData({
        requirements_summary: analysis.requirements_summary || '',
        combined_insights: analysis.combined_insights || {},
      });
    }
  }, [analysis]);

  const handleTrigger = async () => {
    if (!id) return;
    try {
      await triggerAnalysis.mutateAsync(id);
      setIsPolling(true);
      toast.success('AI 분석을 시작합니다.');
    } catch {
      toast.error('분석 시작에 실패했습니다.');
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    try {
      await triggerAnalysis.mutateAsync(id);
      setIsPolling(true);
      toast.success('AI 분석을 다시 시작합니다.');
    } catch {
      toast.error('분석 재시작에 실패했습니다.');
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await updateAnalysis.mutateAsync({ projectId: id, data: editData });
      setEditMode(false);
      toast.success('분석 결과가 수정되었습니다.');
    } catch {
      toast.error('수정에 실패했습니다.');
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    try {
      await confirmAnalysis.mutateAsync(id);
      toast.success('분석이 확인되었습니다.');
    } catch {
      toast.error('확인에 실패했습니다.');
    }
  };

  const isProcessing = analysis?.status === 'processing' || isPolling;
  const isCompleted = analysis?.status === 'completed';
  const isConfirmed = analysis?.status === 'confirmed';
  const isFailed = analysis?.status === 'failed';
  const hasResults = isCompleted || isConfirmed;

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 분석</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
          </div>
        </div>
        {analysis && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[analysis.status] || STATUS_COLORS.pending}`}
          >
            {analysis.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
            {(isCompleted || isConfirmed) && <CheckCircle2 className="h-3 w-3" />}
            {isFailed && <XCircle className="h-3 w-3" />}
            {STATUS_LABELS[analysis.status] || analysis.status}
          </span>
        )}
      </div>

      {/* Failed State */}
      {isFailed && analysis && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
              분석에 실패했습니다
            </h3>
            <p className="mb-2 max-w-lg text-sm text-red-600 dark:text-red-400">
              AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.
            </p>
            {analysis.error_message && (
              <details className="mb-4 w-full max-w-lg text-left">
                <summary className="cursor-pointer text-xs text-red-500 hover:text-red-600 dark:text-red-400">
                  상세 에러 보기
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-red-100 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {analysis.error_message}
                </pre>
              </details>
            )}
            <button
              onClick={handleRetry}
              disabled={triggerAnalysis.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {triggerAnalysis.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Trigger Button (no analysis yet or pending) */}
      {(!analysis || analysis.status === 'pending') && !isPolling && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
            <Play className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            AI 분석 시작
          </h3>
          <p className="mb-6 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
            프로젝트 정보와 레퍼런스 사이트를 기반으로 AI가 종합 분석을 수행합니다.
          </p>
          <button
            onClick={handleTrigger}
            disabled={triggerAnalysis.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {triggerAnalysis.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            AI 분석 시작
          </button>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && !isFailed && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50 py-16 dark:border-blue-800 dark:bg-blue-900/10">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            분석 진행 중...
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AI가 프로젝트를 분석하고 있습니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && analysis && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-end gap-3">
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateAnalysis.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateAnalysis.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  저장
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleRetry}
                  disabled={triggerAnalysis.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  <RefreshCw className="h-4 w-4" />
                  재분석
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  <Pencil className="h-4 w-4" />
                  수정
                </button>
                {!analysis.confirmed_at && (
                  <button
                    onClick={handleConfirm}
                    disabled={confirmAnalysis.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {confirmAnalysis.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Check className="h-4 w-4" />
                    분석 확인
                  </button>
                )}
              </>
            )}
          </div>

          {/* Requirements Summary */}
          <Section
            title="요구사항 요약"
            value={editMode ? editData.requirements_summary : analysis.requirements_summary || ''}
            editMode={editMode}
            onChange={(v) => setEditData((d) => ({ ...d, requirements_summary: v }))}
          />

          {/* Existing Site Analysis */}
          {analysis.existing_site_analysis && Object.keys(analysis.existing_site_analysis).length > 0 && (
            <JsonSection title="기존 사이트 분석" data={analysis.existing_site_analysis} />
          )}

          {/* Reference Sites Analysis */}
          {analysis.reference_sites_analysis && Object.keys(analysis.reference_sites_analysis).length > 0 && (
            <JsonSection title="레퍼런스 사이트 분석" data={analysis.reference_sites_analysis} />
          )}

          {/* Combined Insights */}
          {analysis.combined_insights && Object.keys(analysis.combined_insights).length > 0 && (
            <JsonSection title="종합 인사이트" data={analysis.combined_insights} />
          )}

          {/* Confirmed badge */}
          {analysis.confirmed_at && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              분석이 확인되었습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  value,
  editMode,
  onChange,
}: {
  title: string;
  value: string;
  editMode: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
      <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {editMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {value || '아직 데이터가 없습니다.'}
        </p>
      )}
    </div>
  );
}

function JsonSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
      <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {key.replace(/_/g, ' ')}
            </p>
            {Array.isArray(value) ? (
              <ul className="space-y-1">
                {value.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-300">
                    {typeof item === 'string' ? `- ${item}` : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : typeof value === 'object' && value !== null ? (
              <pre className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">{String(value)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
