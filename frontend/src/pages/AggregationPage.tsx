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
  Copy,
  FileText,
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
  const [newKeywordCategory, setNewKeywordCategory] = useState('');
  const [newKeywordWeight, setNewKeywordWeight] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [newSentenceCategory, setNewSentenceCategory] = useState('');

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
      const data: { text: string; category?: string; weight?: number } = { text: newKeyword.trim() };
      if (newKeywordCategory.trim()) data.category = newKeywordCategory.trim();
      if (newKeywordWeight.trim()) {
        const w = parseFloat(newKeywordWeight.trim());
        if (!isNaN(w) && w >= 0 && w <= 1) data.weight = w;
      }
      await createKeyword.mutateAsync({ projectId: id, data });
      setNewKeyword('');
      setNewKeywordCategory('');
      setNewKeywordWeight('');
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
      const data: { text: string; category?: string } = { text: newSentence.trim() };
      if (newSentenceCategory.trim()) data.category = newSentenceCategory.trim();
      await createSentence.mutateAsync({ projectId: id, data });
      setNewSentence('');
      setNewSentenceCategory('');
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

  const allKeywords = keywords ?? aggregation?.keywords ?? [];
  const allSentences = sentences ?? aggregation?.sentences ?? [];

  const buildPlainText = () => {
    if (!aggregation) return '';
    const lines: string[] = [];
    if (aggregation.summary) {
      lines.push('[ 종합 요약 ]', aggregation.summary, '');
    }
    if (Array.isArray(aggregation.section_summaries)) {
      lines.push('[ 파트별 요약 ]');
      aggregation.section_summaries.forEach((s: Record<string, unknown>) => {
        lines.push(`\n■ ${(s.section_title as string) || (s.title as string) || ''}`);
        if (s.summary) lines.push(s.summary as string);
        if (Array.isArray(s.key_quotes)) {
          s.key_quotes.forEach((q: string) => lines.push(`  "${q}"`));
        }
      });
      lines.push('');
      lines.push('[ 질문별 요약 ]');
      aggregation.section_summaries.forEach((s: Record<string, unknown>) => {
        const qs = s.question_summaries as { question: string; summary: string; key_points?: string[] }[] | undefined;
        if (!Array.isArray(qs) || qs.length === 0) return;
        lines.push(`\n■ ${(s.section_title as string) || (s.title as string) || ''}`);
        qs.forEach((q) => {
          lines.push(`  Q. ${q.question}`);
          lines.push(`     ${q.summary}`);
          if (Array.isArray(q.key_points)) q.key_points.forEach((p) => lines.push(`     - ${p}`));
        });
      });
      lines.push('');
    }
    if (aggregation.company_direction) {
      lines.push('[ 회사 방향성 ]', aggregation.company_direction, '');
    }
    if (aggregation.company_values?.length) {
      lines.push('[ 추구하는 가치 ]', aggregation.company_values.join(', '), '');
    }
    if (aggregation.desired_changes?.length) {
      lines.push('[ 변화하고 싶은 것들 ]');
      aggregation.desired_changes.forEach((c: unknown) => {
        if (typeof c === 'object' && c !== null && 'category' in c) {
          const g = c as { category: string; items?: string[] };
          lines.push(`  ${g.category}: ${(g.items ?? []).join(', ')}`);
        } else {
          lines.push(`  - ${c}`);
        }
      });
      lines.push('');
    }
    if (allKeywords.length) {
      lines.push('[ 키워드 ]');
      allKeywords.forEach((kw) => {
        const parts = [kw.text];
        if (kw.category) parts.push(`(${kw.category})`);
        if (kw.weight && kw.weight !== 1) parts.push(kw.weight.toFixed(1));
        lines.push(`  ${parts.join(' ')}${kw.is_user_added ? ' [직접 추가]' : ''}`);
      });
      lines.push('');
    }
    if (allSentences.length) {
      lines.push('[ 핵심 문장 ]');
      allSentences.forEach((s) => {
        const cat = s.category ? ` [${s.category}]` : '';
        lines.push(`  ${s.text}${cat}${s.is_user_added ? ' [직접 추가]' : ''}`);
      });
    }
    return lines.join('\n');
  };

  const buildMarkdown = () => {
    if (!aggregation) return '';
    const lines: string[] = ['# AI 취합 결과', ''];
    if (aggregation.summary) {
      lines.push('## 종합 요약', '', aggregation.summary, '');
    }
    if (Array.isArray(aggregation.section_summaries)) {
      lines.push('## 파트별 요약', '');
      aggregation.section_summaries.forEach((s: Record<string, unknown>) => {
        lines.push(`### ${(s.section_title as string) || (s.title as string) || ''}`, '');
        if (s.summary) lines.push(s.summary as string, '');
        if (Array.isArray(s.key_quotes) && s.key_quotes.length > 0) {
          s.key_quotes.forEach((q: string) => lines.push(`> "${q}"`, ''));
        }
      });
      lines.push('## 질문별 요약', '');
      aggregation.section_summaries.forEach((s: Record<string, unknown>) => {
        const qs = s.question_summaries as { question: string; summary: string; key_points?: string[] }[] | undefined;
        if (!Array.isArray(qs) || qs.length === 0) return;
        lines.push(`### ${(s.section_title as string) || (s.title as string) || ''}`, '');
        qs.forEach((q) => {
          lines.push(`**Q. ${q.question}**`, '', q.summary, '');
          if (Array.isArray(q.key_points) && q.key_points.length > 0) {
            q.key_points.forEach((p) => lines.push(`- ${p}`));
            lines.push('');
          }
        });
      });
    }
    if (aggregation.company_direction) {
      lines.push('## 회사 방향성', '', aggregation.company_direction, '');
    }
    if (aggregation.company_values?.length) {
      lines.push('## 추구하는 가치', '', aggregation.company_values.map((v) => `\`${v}\``).join(' · '), '');
    }
    if (aggregation.desired_changes?.length) {
      lines.push('## 변화하고 싶은 것들', '');
      aggregation.desired_changes.forEach((c: unknown) => {
        if (typeof c === 'object' && c !== null && 'category' in c) {
          const g = c as { category: string; items?: string[] };
          lines.push(`**${g.category}**`);
          (g.items ?? []).forEach((item) => lines.push(`- ${item}`));
          lines.push('');
        } else {
          lines.push(`- ${c}`);
        }
      });
      lines.push('');
    }
    if (allKeywords.length) {
      lines.push('## 키워드', '', '| 키워드 | 카테고리 | 가중치 | 출처 |', '|--------|----------|--------|------|');
      allKeywords.forEach((kw) => {
        lines.push(`| ${kw.text} | ${kw.category || '-'} | ${kw.weight && kw.weight !== 1 ? kw.weight.toFixed(1) : '-'} | ${kw.is_user_added ? '직접 추가' : 'AI'} |`);
      });
      lines.push('');
    }
    if (allSentences.length) {
      lines.push('## 핵심 문장', '');
      allSentences.forEach((s) => {
        const tag = s.is_user_added ? ' `직접 추가`' : '';
        const cat = s.category ? ` _${s.category}_` : '';
        lines.push(`- ${s.text}${cat}${tag}`);
      });
    }
    return lines.join('\n');
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(buildPlainText());
    toast.success('텍스트로 복사되었습니다.');
  };

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(buildMarkdown());
    toast.success('마크다운으로 복사되었습니다.');
  };

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
          {/* Copy Buttons */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-hover"
            >
              <Copy className="h-3.5 w-3.5" />
              텍스트 복사
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-hover"
            >
              <FileText className="h-3.5 w-3.5" />
              마크다운 복사
            </button>
          </div>

          {/* Summary */}
          {aggregation.summary && (
            <div className="border border-line bg-surface-secondary p-6">
              <h3 className="mb-3 text-base font-semibold text-content-primary">종합 요약</h3>
              <p className="whitespace-pre-wrap text-sm text-content-secondary">{aggregation.summary}</p>
            </div>
          )}

          {/* Section Summaries (파트별) */}
          {Array.isArray(aggregation.section_summaries) && aggregation.section_summaries.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-content-primary">파트별 요약</h3>
              {aggregation.section_summaries.map((section: { title?: string; section_title?: string; summary?: string; key_quotes?: string[] }, idx: number) => (
                <div key={idx} className="border border-line bg-surface-secondary p-6 mb-4">
                  {(section.section_title || section.title) && (
                    <h4 className="mb-2 text-sm font-bold text-content-primary">{section.section_title || section.title}</h4>
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

          {/* Question Summaries (질문별) */}
          {Array.isArray(aggregation.section_summaries) && aggregation.section_summaries.some((s: Record<string, unknown>) => Array.isArray(s.question_summaries) && (s.question_summaries as unknown[]).length > 0) && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-content-primary">질문별 요약</h3>
              {aggregation.section_summaries.map((section: { title?: string; section_title?: string; question_summaries?: { question: string; summary: string; key_points?: string[] }[] }, idx: number) => {
                if (!Array.isArray(section.question_summaries) || section.question_summaries.length === 0) return null;
                return (
                  <div key={idx} className="border border-line bg-surface-secondary p-6 mb-4">
                    {(section.section_title || section.title) && (
                      <h4 className="mb-3 text-sm font-bold text-content-primary">{section.section_title || section.title}</h4>
                    )}
                    <div className="space-y-3">
                      {section.question_summaries.map((qs, qi: number) => (
                        <div key={qi} className="border-l-2 border-line pl-3">
                          <p className="text-xs font-medium text-content-primary">{qs.question}</p>
                          <p className="mt-1 text-xs text-content-secondary">{qs.summary}</p>
                          {Array.isArray(qs.key_points) && qs.key_points.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {qs.key_points.map((point: string, pi: number) => (
                                <li key={pi} className="text-xs text-content-tertiary">- {point}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
              {allSentences.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-start justify-between border border-line p-3"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium ${s.is_user_added ? 'bg-surface-hover text-content-tertiary' : 'bg-surface-hover text-accent'}`}>
                        {s.is_user_added ? '직접 추가' : 'AI'}
                      </span>
                      {s.category && (
                        <span className="bg-surface-hover px-2 py-0.5 text-xs text-content-tertiary">
                          {s.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-content-secondary">{s.text}</p>
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
                className="flex-1 border border-line bg-surface-secondary px-3 py-1.5 text-sm text-content-primary placeholder-content-tertiary"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSentence()}
              />
              <input
                type="text"
                value={newSentenceCategory}
                onChange={(e) => setNewSentenceCategory(e.target.value)}
                placeholder="카테고리"
                className="w-24 border border-line bg-surface-secondary px-3 py-1.5 text-sm text-content-primary placeholder-content-tertiary"
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
              {allKeywords.map((kw) => (
                <span
                  key={kw.id}
                  className={`group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${kw.is_user_added ? 'border border-line bg-transparent text-content-secondary' : 'bg-surface-hover text-content-secondary'}`}
                >
                  {kw.is_user_added ? (
                    <span className="text-content-tertiary">+</span>
                  ) : (
                    <Sparkles className="h-2.5 w-2.5 opacity-50" />
                  )}
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
                className="flex-1 border border-line bg-surface-secondary px-3 py-1.5 text-sm text-content-primary placeholder-content-tertiary"
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <input
                type="text"
                value={newKeywordCategory}
                onChange={(e) => setNewKeywordCategory(e.target.value)}
                placeholder="카테고리"
                className="w-24 border border-line bg-surface-secondary px-3 py-1.5 text-sm text-content-primary placeholder-content-tertiary"
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <input
                type="text"
                value={newKeywordWeight}
                onChange={(e) => setNewKeywordWeight(e.target.value)}
                placeholder="가중치"
                className="w-16 border border-line bg-surface-secondary px-3 py-1.5 text-sm text-content-primary placeholder-content-tertiary"
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
