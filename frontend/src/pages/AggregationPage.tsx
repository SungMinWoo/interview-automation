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
import { AiProviderSelect } from '@/components/common';
import { DEFAULT_AI_PROVIDER, AI_PROVIDER_LABELS, type AiProvider } from '@/utils/constants';
import toast from 'react-hot-toast';

export default function AggregationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ? Number(projectId) : undefined;
  const { data: project } = useProject(id);
  const { data: aggregation, refetch: refetchAggregation } = useAggregation(id);
  const shouldPoll = aggregation?.status === 'processing';
  const { data: statusData } = useAggregationStatus(id, shouldPoll);
  const triggerAggregation = useTriggerAggregation();
  const regenerateAggregation = useRegenerateAggregation();
  const { data: keywords, refetch: refetchKeywords } = useKeywords(id);
  const createKeyword = useCreateKeyword();
  const deleteKeyword = useDeleteKeyword();
  const generateKeywords = useGenerateKeywords();
  const { data: sentences, refetch: refetchSentences } = useSentences(id);
  const createSentence = useCreateSentence();
  const deleteSentence = useDeleteSentence();

  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [newKeyword, setNewKeyword] = useState('');
  const [newSentence, setNewSentence] = useState('');

  useEffect(() => {
    if (statusData && statusData.status !== 'processing') {
      refetchAggregation();
      refetchKeywords();
      refetchSentences();
    }
  }, [statusData?.status, refetchAggregation, refetchKeywords, refetchSentences]);

  const handleTrigger = async () => {
    if (!id) return;
    try {
      await triggerAggregation.mutateAsync({ projectId: id, ai_provider: aiProvider });
      refetchAggregation();
      toast.success(`${AI_PROVIDER_LABELS[aiProvider]}로 AI 취합을 시작합니다.`);
    } catch {
      toast.error('취합 시작에 실패했습니다.');
    }
  };

  const handleRegenerate = async () => {
    if (!id) return;
    try {
      await regenerateAggregation.mutateAsync({ projectId: id, ai_provider: aiProvider });
      refetchAggregation();
      toast.success(`${AI_PROVIDER_LABELS[aiProvider]}로 재생성을 시작합니다.`);
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

  const isProcessing = aggregation?.status === 'processing';
  const isCompleted = aggregation?.status === 'completed';

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
            <h1 className="text-2xl font-bold text-content-primary">AI 취합</h1>
            <p className="text-sm text-content-tertiary">{project?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aggregation?.ai_provider && (
            <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-accent">
              {AI_PROVIDER_LABELS[aggregation.ai_provider as AiProvider] || aggregation.ai_provider}
            </span>
          )}
          {isCompleted && (
            <>
              <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
              <button
                onClick={handleRegenerate}
                disabled={regenerateAggregation.isPending}
                className="inline-flex items-center gap-2 border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                {regenerateAggregation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                재생성
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trigger */}
      {(!aggregation || aggregation.status === 'pending' || aggregation.status === 'failed') && !isProcessing && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-line py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center bg-surface-hover">
            <Play className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-content-primary">AI 취합 시작</h3>
          <p className="mb-6 max-w-md text-center text-sm text-content-tertiary">
            수집된 응답을 AI가 분석하여 키워드, 핵심 문장, 인사이트를 추출합니다.
          </p>
          <div className="flex items-center gap-3">
            <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
            <button
              onClick={handleTrigger}
              disabled={triggerAggregation.isPending}
              className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {triggerAggregation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              AI 취합 시작
            </button>
          </div>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center border border-line bg-surface-hover py-16">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-accent" />
          <h3 className="mb-2 text-lg font-semibold text-content-primary">취합 진행 중...</h3>
          <p className="text-sm text-content-tertiary">
            {statusData?.message ?? 'AI가 응답을 분석하고 있습니다.'}
          </p>
          {statusData?.progress != null && (
            <div className="mt-4 w-64">
              <div className="h-2 rounded-full bg-surface-hover">
                <div
                  className="h-2 rounded-full bg-accent transition-all"
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
          {/* Summary */}
          {aggregation.summary && (
            <div className="border border-line bg-surface-secondary p-6">
              <h3 className="mb-3 text-base font-semibold text-content-primary">종합 요약</h3>
              <p className="whitespace-pre-wrap text-sm text-content-secondary">{aggregation.summary}</p>
            </div>
          )}

          {/* Section Summaries */}
          {Array.isArray(aggregation.section_summaries) && aggregation.section_summaries.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-content-primary">파트별 요약</h3>
              {aggregation.section_summaries.map((section: { title?: string; summary?: string; key_quotes?: string[] }, idx: number) => (
                <div key={idx} className="border border-line bg-surface-secondary p-6 mb-4">
                  {section.title && (
                    <h4 className="mb-2 text-sm font-bold text-content-primary">{section.title}</h4>
                  )}
                  {section.summary && (
                    <p className="whitespace-pre-wrap text-sm text-content-secondary">{section.summary}</p>
                  )}
                  {Array.isArray(section.key_quotes) && section.key_quotes.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {section.key_quotes.map((quote: string, qi: number) => (
                        <li key={qi} className="text-sm italic text-content-tertiary">"{quote}"</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Company Direction & Values */}
          {(aggregation.company_direction || aggregation.company_values?.length > 0 || aggregation.desired_changes?.length > 0) && (
            <div className="border border-line bg-surface-secondary p-6">
              {aggregation.company_direction && (
                <div className="mb-4">
                  <h4 className="mb-1 text-sm font-semibold text-content-primary">회사 방향성</h4>
                  <p className="whitespace-pre-wrap text-sm text-content-secondary">{aggregation.company_direction}</p>
                </div>
              )}
              {aggregation.company_values?.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-1 text-sm font-semibold text-content-primary">추구하는 가치</h4>
                  <div className="flex flex-wrap gap-2">
                    {aggregation.company_values.map((v, i) => (
                      <span key={i} className="rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-accent">{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {aggregation.desired_changes?.length > 0 && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-content-primary">변화하고 싶은 것들</h4>
                  {typeof aggregation.desired_changes[0] === 'object' && aggregation.desired_changes[0] !== null ? (
                    <div className="space-y-3">
                      {aggregation.desired_changes.map((group: { category?: string; items?: string[] }, i: number) => (
                        <div key={i}>
                          {group.category && (
                            <h5 className="mb-1 text-xs font-semibold text-content-tertiary">{group.category}</h5>
                          )}
                          <ul className="space-y-1">
                            {(group.items ?? []).map((item: string, j: number) => (
                              <li key={j} className="text-sm text-content-secondary">- {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {aggregation.desired_changes.map((c: string, i: number) => (
                        <li key={i} className="text-sm text-content-secondary">- {c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sentences */}
          <div className="border border-line bg-surface-secondary p-6">
            <h3 className="mb-4 text-base font-semibold text-content-primary">핵심 문장</h3>

            <div className="mb-4 space-y-2">
              {(sentences ?? aggregation.sentences ?? []).map((s) => (
                <div
                  key={s.id}
                  className="group flex items-start justify-between border border-line p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm text-content-secondary">{s.text}</p>
                    {s.category && (
                      <span className="mt-1 inline-block bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                        {s.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSentence(s.id)}
                    className="ml-2 hidden flex-shrink-0 text-danger hover:text-danger group-hover:block"
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
                className="flex-1 border border-line bg-surface-secondary px-3 py-1.5 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSentence()}
              />
              <button
                onClick={handleAddSentence}
                disabled={createSentence.isPending || !newSentence.trim()}
                className="bg-accent px-3 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Keywords */}
          <div className="border border-line bg-surface-secondary p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-content-primary">키워드</h3>
              <button
                onClick={handleGenerateKeywords}
                disabled={generateKeywords.isPending}
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent disabled:opacity-50"
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
              {(keywords ?? aggregation.keywords ?? []).map((kw) => (
                <span
                  key={kw.id}
                  className="group inline-flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-content-secondary"
                >
                  {kw.text}
                  {kw.category && (
                    <span className="opacity-60">({kw.category})</span>
                  )}
                  {kw.weight && kw.weight !== 1 && (
                    <span className="opacity-40">{kw.weight.toFixed(1)}</span>
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
                className="flex-1 border border-line bg-surface-secondary px-3 py-1.5 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <button
                onClick={handleAddKeyword}
                disabled={createKeyword.isPending || !newKeyword.trim()}
                className="bg-accent px-3 py-1.5 text-xs font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
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
