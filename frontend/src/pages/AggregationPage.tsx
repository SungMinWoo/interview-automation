import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import {
  useAggregation,
  useAggregationStatus,
  useTriggerAggregation,
  useRegenerateAggregation,
  useKeywords,
  useCreateKeyword,
  useDeleteKeyword,
  useGenerateKeywords,
  useSentences,
  useCreateSentence,
  useDeleteSentence,
} from '@/hooks/useAggregation';
import { SENTIMENT_COLORS } from '@/utils/constants';
import toast from 'react-hot-toast';

export default function AggregationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: aggregation } = useAggregation(id);
  const [isPolling, setIsPolling] = useState(false);
  const { data: statusData } = useAggregationStatus(id, isPolling);
  const triggerAggregation = useTriggerAggregation();
  const regenerateAggregation = useRegenerateAggregation();
  const { data: keywords } = useKeywords(id);
  const createKeyword = useCreateKeyword();
  const deleteKeyword = useDeleteKeyword();
  const generateKeywords = useGenerateKeywords();
  const { data: sentences } = useSentences(id);
  const createSentence = useCreateSentence();
  const deleteSentence = useDeleteSentence();

  const [newKeyword, setNewKeyword] = useState('');
  const [newSentence, setNewSentence] = useState('');

  useEffect(() => {
    if (aggregation?.status === 'processing') setIsPolling(true);
    if (statusData?.status === 'completed' || statusData?.status === 'failed') setIsPolling(false);
  }, [aggregation?.status, statusData?.status]);

  const handleTrigger = async () => {
    if (!id) return;
    try {
      await triggerAggregation.mutateAsync(id);
      setIsPolling(true);
      toast.success('AI 취합을 시작합니다.');
    } catch {
      toast.error('취합 시작에 실패했습니다.');
    }
  };

  const handleRegenerate = async () => {
    if (!id) return;
    try {
      await regenerateAggregation.mutateAsync(id);
      setIsPolling(true);
      toast.success('재생성을 시작합니다.');
    } catch {
      toast.error('재생성에 실패했습니다.');
    }
  };

  const handleAddKeyword = async () => {
    if (!id || !newKeyword.trim()) return;
    try {
      await createKeyword.mutateAsync({ projectId: id, data: { text: newKeyword.trim() } });
      setNewKeyword('');
      toast.success('키워드가 추가되었습니다.');
    } catch {
      toast.error('키워드 추가에 실패했습니다.');
    }
  };

  const handleDeleteKeyword = async (kwId: number) => {
    if (!id) return;
    try {
      await deleteKeyword.mutateAsync({ projectId: id, keywordId: kwId });
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleGenerateKeywords = async () => {
    if (!id) return;
    try {
      await generateKeywords.mutateAsync(id);
      toast.success('AI 키워드가 생성되었습니다.');
    } catch {
      toast.error('키워드 생성에 실패했습니다.');
    }
  };

  const handleAddSentence = async () => {
    if (!id || !newSentence.trim()) return;
    try {
      await createSentence.mutateAsync({ projectId: id, data: { text: newSentence.trim() } });
      setNewSentence('');
      toast.success('문장이 추가되었습니다.');
    } catch {
      toast.error('문장 추가에 실패했습니다.');
    }
  };

  const handleDeleteSentence = async (sId: number) => {
    if (!id) return;
    try {
      await deleteSentence.mutateAsync({ projectId: id, sentenceId: sId });
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const isProcessing = aggregation?.status === 'processing' || isPolling;
  const isCompleted = aggregation?.status === 'completed';

  const sentimentColor = (s?: string) => SENTIMENT_COLORS[s ?? 'neutral'] ?? SENTIMENT_COLORS.neutral;

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 취합</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
          </div>
        </div>
        {isCompleted && (
          <button
            onClick={handleRegenerate}
            disabled={regenerateAggregation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {regenerateAggregation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            재생성
          </button>
        )}
      </div>

      {/* Trigger */}
      {(!aggregation || aggregation.status === 'pending' || aggregation.status === 'failed') && !isProcessing && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 dark:border-gray-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-900/20">
            <Play className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">AI 취합 시작</h3>
          <p className="mb-6 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
            수집된 응답을 AI가 분석하여 키워드, 핵심 문장, 인사이트를 추출합니다.
          </p>
          <button
            onClick={handleTrigger}
            disabled={triggerAggregation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {triggerAggregation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            AI 취합 시작
          </button>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 py-16 dark:border-cyan-800 dark:bg-cyan-900/10">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-cyan-600 dark:text-cyan-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">취합 진행 중...</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {statusData?.message ?? 'AI가 응답을 분석하고 있습니다.'}
          </p>
          {statusData?.progress != null && (
            <div className="mt-4 w-64">
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-cyan-600 transition-all"
                  style={{ width: `${statusData.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {isCompleted && aggregation && (
        <div className="space-y-6">
          {/* Summary Sections */}
          {aggregation.insights && aggregation.insights.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">종합 요약</h3>
              <ul className="space-y-2">
                {aggregation.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-300">
                    - {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">키워드</h3>
              <button
                onClick={handleGenerateKeywords}
                disabled={generateKeywords.isPending}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 disabled:opacity-50"
              >
                {generateKeywords.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI 추가 생성
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {(keywords ?? aggregation.overallKeywords).map((kw) => (
                <span
                  key={kw.id}
                  className={`group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${sentimentColor(kw.sentiment)}`}
                >
                  {kw.text}
                  {kw.category && (
                    <span className="opacity-60">({kw.category})</span>
                  )}
                  <button
                    onClick={() => handleDeleteKeyword(kw.id)}
                    className="ml-0.5 hidden text-current opacity-60 hover:opacity-100 group-hover:inline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="새 키워드..."
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <button
                onClick={handleAddKeyword}
                disabled={createKeyword.isPending || !newKeyword.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sentences */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">핵심 문장</h3>

            <div className="mb-4 space-y-2">
              {(sentences ?? aggregation.overallSentences).map((s) => (
                <div
                  key={s.id}
                  className="group flex items-start justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700/50"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{s.text}</p>
                    {s.category && (
                      <span className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {s.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSentence(s.id)}
                    className="ml-2 hidden flex-shrink-0 text-red-400 hover:text-red-500 group-hover:block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSentence}
                onChange={(e) => setNewSentence(e.target.value)}
                placeholder="새 핵심 문장..."
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSentence()}
              />
              <button
                onClick={handleAddSentence}
                disabled={createSentence.isPending || !newSentence.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
