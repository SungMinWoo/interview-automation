import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Save, Eye, AlertCircle } from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import { useEmployees } from '@/hooks/useDistribution';
import {
  useMyManualDraft,
  useEnsureMyManualDraft,
  useUpdateMyManualDraft,
  useSubmitMyManualDraft,
} from '@/hooks/useResponses';
import type { Question } from '@/types/questionnaire';
import toast from 'react-hot-toast';

const AUTO_SAVE_MS = 8000;

function DraftAnswerInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: Question;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const qType = question.question_type || question.type || 'textarea';
  const options = Array.isArray(question.options) ? question.options : [];

  // 대면 인터뷰 메모는 항상 자유 텍스트로 입력 — 선택지/평점은 보조 정보로만 표기.
  const hint = (() => {
    if (qType === 'single_choice' || qType === 'multiple_choice') {
      if (options.length === 0) return null;
      const optTexts = options.map((o) => (typeof o === 'string' ? o : o.text));
      return `선택지: ${optTexts.join(' · ')}`;
    }
    if (qType === 'rating') return '평점 1~5점 기준';
    return null;
  })();

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        disabled={disabled}
        placeholder="답변을 자유롭게 메모하세요..."
        className="w-full resize-y border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20 disabled:opacity-60"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-[11px] text-content-muted">{hint}</p>}
    </div>
  );
}

export default function ManualDraftPage() {
  const { projectId, employeeId } = useParams<{ projectId: string; employeeId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? Number(projectId) : undefined;
  const eid = employeeId ? Number(employeeId) : undefined;

  const { data: project } = useProject(pid);
  const { data: questionnaire } = useQuestionnaire(pid);
  const { data: employees = [] } = useEmployees(pid);
  const employee = employees.find((e) => e.id === eid);

  const { data: draft, isLoading: draftLoading } = useMyManualDraft(pid, eid);
  const ensureDraft = useEnsureMyManualDraft();
  const updateDraft = useUpdateMyManualDraft();
  const submitDraft = useSubmitMyManualDraft();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const dirtyRef = useRef(false);

  // 모든 질문(섹션 + 비섹션) flatten
  const allQuestions = useMemo<Question[]>(() => {
    if (!questionnaire) return [];
    const sectioned = (questionnaire.sections ?? []).flatMap((s: any) => s.questions ?? []);
    return [...(questionnaire.questions ?? []), ...sectioned];
  }, [questionnaire]);

  // draft 없으면 자동 생성
  useEffect(() => {
    if (pid && eid && draft === null && !ensureDraft.isPending) {
      ensureDraft.mutate({ projectId: pid, employeeId: eid });
    }
  }, [pid, eid, draft, ensureDraft]);

  // draft answers를 로컬 상태로 hydrate. 모든 답변은 텍스트로 보관 (선택지/평점은 텍스트 변환).
  useEffect(() => {
    if (!draft?.answers) return;
    const map: Record<number, string> = {};
    for (const a of draft.answers) {
      if (a.text_value) map[a.question] = a.text_value;
      else if (a.choice_values && a.choice_values.length > 0) map[a.question] = a.choice_values.join(', ');
      else if (a.rating_value != null) map[a.question] = String(a.rating_value);
    }
    setAnswers(map);
  }, [draft?.id]);

  // 자동 저장
  useEffect(() => {
    if (!draft || draft.is_submitted) return;
    const timer = setInterval(() => {
      if (dirtyRef.current && pid && eid) {
        flushSave();
      }
    }, AUTO_SAVE_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  const flushSave = async () => {
    if (!pid || !eid || !draft) return;
    const payload = Object.entries(answers).map(([qid, val]) => ({
      question_id: Number(qid),
      text_value: val,
    }));
    try {
      await updateDraft.mutateAsync({ projectId: pid, draftId: draft.id, employeeId: eid, answers: payload });
      dirtyRef.current = false;
    } catch {
      /* 자동 저장 실패는 조용히 무시, 다음 사이클에 재시도 */
    }
  };

  const updateAnswer = (qid: number, v: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
    dirtyRef.current = true;
  };

  const handleManualSave = async () => {
    await flushSave();
    toast.success('메모가 저장되었습니다.');
  };

  const handleSubmitConfirmed = async () => {
    if (!pid || !eid || !draft) return;
    await flushSave();
    try {
      await submitDraft.mutateAsync({ projectId: pid, draftId: draft.id, employeeId: eid });
      setShowSubmitConfirm(false);
      toast.success('내 메모 작성을 완료했습니다.');
      navigate(`/projects/${pid}/responses?tab=in_person`);
    } catch {
      toast.error('제출에 실패했습니다.');
    }
  };

  if (draftLoading || !questionnaire) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const isSubmitted = !!draft?.is_submitted;

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
              내 메모 — {employee?.name || '인터뷰이'}
            </h1>
            <p className="text-sm text-content-tertiary">{project?.title}</p>
          </div>
        </div>
        {!isSubmitted && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSave}
              disabled={updateDraft.isPending}
              className="inline-flex items-center gap-1.5 border border-line px-3 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              {updateDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              저장
            </button>
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitDraft.isPending}
              className="inline-flex items-center gap-1.5 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {submitDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              작성 완료
            </button>
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="border border-line bg-surface-secondary p-4 text-xs leading-relaxed text-content-tertiary">
        대면 인터뷰 중 본인이 들은 내용을 자유롭게 메모해 주세요. {AUTO_SAVE_MS / 1000}초마다 자동 저장됩니다.
        작성 완료 후엔 머지 단계에서 다른 멤버의 메모와 함께 최종 응답으로 통합됩니다.
      </div>

      {isSubmitted && (
        <div className="inline-flex items-center gap-2 bg-success-bg px-3 py-2 text-xs font-medium text-success">
          <Eye className="h-3.5 w-3.5" />
          작성 완료된 메모는 수정할 수 없습니다.
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {allQuestions.map((q, i) => (
          <div key={q.id} className="border border-line bg-surface-secondary p-5">
            <p className="mb-2 text-sm font-medium text-content-primary">
              <span className="mr-2 text-accent">{i + 1}.</span>
              {q.text}
            </p>
            {q.description && (
              <p className="mb-3 text-xs text-content-tertiary">{q.description}</p>
            )}
            <DraftAnswerInput
              question={q}
              value={answers[q.id]}
              onChange={(v) => updateAnswer(q.id, v)}
              disabled={isSubmitted}
            />
          </div>
        ))}
      </div>

      {/* 작성 완료 확인 모달 */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
          <div className="w-full max-w-md bg-surface-secondary p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-warning-bg">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-content-primary">작성을 완료하시겠어요?</h3>
                <p className="mt-2 text-sm text-content-tertiary">
                  완료 후에는 본인의 메모를 더 이상 수정할 수 없습니다. 머지 단계에서는 최종 답변을 다시 편집할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover"
              >
                취소
              </button>
              <button
                onClick={handleSubmitConfirmed}
                disabled={submitDraft.isPending}
                className="inline-flex items-center gap-1.5 bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
              >
                {submitDraft.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                작성 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
