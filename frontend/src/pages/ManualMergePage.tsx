import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, GitMerge, Sparkles } from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import { useEmployees } from '@/hooks/useDistribution';
import {
  useEmployeeDraftsDetail,
  useMergeManualEntry,
  useAiMergeAnswer,
} from '@/hooks/useResponses';
import { AiProviderSelect } from '@/components/common';
import { DEFAULT_AI_PROVIDER, type AiProvider } from '@/utils/constants';
import type { Question } from '@/types/questionnaire';
import type { ManualDraft } from '@/types/response';
import toast from 'react-hot-toast';

function formatDraftAnswer(draft: ManualDraft, questionId: number): string {
  const ans = draft.answers?.find((a) => a.question === questionId);
  if (!ans) return '';
  if (ans.text_value) return ans.text_value;
  if (ans.choice_values && ans.choice_values.length > 0) return ans.choice_values.join(', ');
  if (ans.rating_value != null) return `${ans.rating_value}점`;
  return '';
}

export default function ManualMergePage() {
  const { projectId, employeeId } = useParams<{ projectId: string; employeeId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? Number(projectId) : undefined;
  const eid = employeeId ? Number(employeeId) : undefined;

  const { data: project } = useProject(pid);
  const { data: questionnaire } = useQuestionnaire(pid);
  const { data: employees = [] } = useEmployees(pid);
  const employee = employees.find((e) => e.id === eid);

  const { data: detail, isLoading } = useEmployeeDraftsDetail(pid, eid);
  const merge = useMergeManualEntry();
  const aiMerge = useAiMergeAnswer();
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [aiLoadingQid, setAiLoadingQid] = useState<number | null>(null);

  const allQuestions = useMemo<Question[]>(() => {
    if (!questionnaire) return [];
    const sectioned = (questionnaire.sections ?? []).flatMap((s: any) => s.questions ?? []);
    return [...(questionnaire.questions ?? []), ...sectioned];
  }, [questionnaire]);

  const [finalAnswers, setFinalAnswers] = useState<Record<number, string>>({});

  // 처음엔 가장 최근 submitted draft의 답변으로 prefill
  useEffect(() => {
    if (!detail?.drafts || detail.drafts.length === 0) return;
    const submittedDrafts = detail.drafts.filter((d) => d.is_submitted);
    const baseDraft = submittedDrafts[0] || detail.drafts[0];
    if (!baseDraft) return;
    const initial: Record<number, string> = {};
    for (const q of allQuestions) {
      initial[q.id] = formatDraftAnswer(baseDraft, q.id);
    }
    setFinalAnswers(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.drafts?.length, allQuestions.length]);

  const drafts = detail?.drafts ?? [];

  const handleMerge = async () => {
    if (!pid || !eid) return;
    const answers = Object.entries(finalAnswers)
      .filter(([, v]) => v && v.trim().length > 0)
      .map(([qid, v]) => ({ question_id: Number(qid), text_value: v }));
    try {
      await merge.mutateAsync({ projectId: pid, employeeId: eid, answers });
      toast.success('머지된 응답이 저장되었습니다.');
      navigate(`/projects/${pid}/responses?tab=in_person`);
    } catch {
      toast.error('머지에 실패했습니다.');
    }
  };

  const handleAiMerge = async (questionId: number) => {
    if (!pid || !eid) return;
    setAiLoadingQid(questionId);
    try {
      const result = await aiMerge.mutateAsync({
        projectId: pid,
        employeeId: eid,
        questionId,
        aiProvider,
      });
      setFinalAnswers((p) => ({ ...p, [questionId]: result.merged_text }));
      toast.success(`AI가 ${result.source_count}개 메모를 합쳤습니다. 수정 가능합니다.`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'AI 합치기에 실패했습니다.';
      toast.error(detail);
    } finally {
      setAiLoadingQid(null);
    }
  };

  if (isLoading || !questionnaire) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="space-y-4">
        <Link to={`/projects/${pid}/responses`} className="inline-flex items-center gap-1 text-sm text-content-tertiary">
          <ArrowLeft className="h-4 w-4" /> 응답 페이지로
        </Link>
        <p className="text-sm text-content-tertiary">머지할 멤버 메모가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}/responses`}
            className="p-2 text-content-tertiary transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">
              머지 — {employee?.name || '인터뷰이'}
            </h1>
            <p className="text-sm text-content-tertiary">{project?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiProviderSelect value={aiProvider} onChange={setAiProvider} />
          <button
            onClick={handleMerge}
            disabled={merge.isPending}
            className="inline-flex items-center gap-1.5 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
          >
            {merge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
            머지하여 공식 응답으로 저장
          </button>
        </div>
      </div>

      <div className="border border-line bg-surface-secondary p-4 text-xs leading-relaxed text-content-tertiary">
        멤버 {drafts.length}명의 메모를 질문별로 나란히 보고, 아래 "최종 답변"에 합쳐 작성하세요.
        직접 입력하거나 <strong className="text-content-secondary">"AI로 합치기"</strong> 버튼으로 자동 통합 후 수정할 수 있습니다.
        머지된 응답이 공식 응답으로 저장되어 AI 취합 입력으로 사용됩니다.
      </div>

      {/* 질문별 카드 */}
      <div className="space-y-5">
        {allQuestions.map((q, i) => (
          <div key={q.id} className="border border-line bg-surface-secondary p-5">
            <p className="mb-3 text-sm font-medium text-content-primary">
              <span className="mr-2 text-accent">{i + 1}.</span>
              {q.text}
            </p>

            {/* 멤버 메모들 */}
            <div className="mb-4 space-y-2">
              {drafts.map((d) => {
                const ans = formatDraftAnswer(d, q.id);
                return (
                  <div key={d.id} className="flex gap-3 border-l-2 border-line bg-surface-hover p-2.5">
                    <span className="flex-shrink-0 text-xs font-semibold text-content-tertiary">
                      {d.author_name || `User ${d.author}`}
                      {!d.is_submitted && <span className="ml-1 text-warning">(작성 중)</span>}
                    </span>
                    <span className="text-xs text-content-secondary whitespace-pre-wrap">
                      {ans || <span className="text-content-muted">— 답변 없음</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 최종 답변 */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-accent">최종 답변</label>
                <button
                  type="button"
                  onClick={() => handleAiMerge(q.id)}
                  disabled={aiLoadingQid === q.id}
                  className="inline-flex items-center gap-1 border border-line bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-content-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
                  title="멤버 메모들을 AI가 자연스러운 한 문단으로 합쳐줍니다"
                >
                  {aiLoadingQid === q.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-accent" />
                  )}
                  AI로 합치기
                </button>
              </div>
              <textarea
                rows={3}
                value={finalAnswers[q.id] ?? ''}
                onChange={(e) => setFinalAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                placeholder="멤버 메모를 참고해 합친 최종 답변을 입력하세요. AI 결과도 자유롭게 수정 가능합니다."
                className="w-full border border-line bg-surface-input px-3 py-2 text-sm leading-relaxed text-content-primary placeholder-content-muted focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
