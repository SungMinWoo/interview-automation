import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import { useEmployees } from '@/hooks/useDistribution';
import { useStartManualEntry, useSubmitManualEntry } from '@/hooks/useResponses';
import { QUESTION_TYPE_LABELS, IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '@/utils/constants';
import type { Question } from '@/types/questionnaire';
import toast from 'react-hot-toast';

function QuestionInput({ question, value, onChange }: { question: Question; value: string | string[] | number | undefined; onChange: (v: string | string[] | number) => void }) {
  const qType = question.question_type || question.type || 'textarea';
  const inputClass = 'w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20';
  const options = Array.isArray(question.options) ? question.options : [];

  if (qType === 'text') {
    return <input type="text" placeholder="답변을 입력하세요..." className={inputClass} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }

  if (qType === 'textarea') {
    return <textarea rows={3} placeholder="답변을 입력하세요..." className={`${inputClass} resize-y`} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }

  if (qType === 'single_choice') {
    return (
      <div className="space-y-2">
        {options.map((opt, i) => {
          const optText = typeof opt === 'string' ? opt : opt.text;
          return (
            <label key={i} className="flex cursor-pointer items-center gap-2.5 border border-line p-3 transition-colors hover:bg-surface-hover">
              <input type="radio" name={`q-${question.id}`} value={optText} checked={value === optText} onChange={() => onChange(optText)} className="text-accent" />
              <span className="text-sm text-content-secondary">{optText}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (qType === 'multiple_choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {options.map((opt, i) => {
          const optText = typeof opt === 'string' ? opt : opt.text;
          const isChecked = selected.includes(optText);
          return (
            <label key={i} className="flex cursor-pointer items-center gap-2.5 border border-line p-3 transition-colors hover:bg-surface-hover">
              <input type="checkbox" checked={isChecked} onChange={() => onChange(isChecked ? selected.filter((s) => s !== optText) : [...selected, optText])} className="border-line text-accent" />
              <span className="text-sm text-content-secondary">{optText}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (qType === 'rating') {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" onClick={() => onChange(v)} className={`flex h-10 w-10 items-center justify-center border text-sm font-medium transition-colors ${value === v ? 'border-accent bg-accent text-accent-text' : 'border-line text-content-secondary hover:bg-surface-hover'}`}>
            {v}
          </button>
        ))}
      </div>
    );
  }

  // ranking or fallback
  return <textarea rows={2} placeholder="답변을 입력하세요..." className={`${inputClass} resize-y`} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

export default function ManualEntryPage() {
  const { projectId, employeeId } = useParams<{ projectId: string; employeeId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? Number(projectId) : undefined;
  const eid = employeeId ? Number(employeeId) : undefined;
  const { data: project } = useProject(pid);
  const { data: questionnaire, isLoading: questLoading } = useQuestionnaire(pid);
  const { data: employees } = useEmployees(pid);
  const startManualEntry = useStartManualEntry();
  const submitManualEntry = useSubmitManualEntry();

  const employee = employees?.find((e) => e.id === eid);
  // Collect all questions: sectioned + unsectioned
  const sectionQuestions = (questionnaire?.sections ?? []).flatMap((s) => s.questions ?? []);
  const unsectionedQuestions = questionnaire?.questions ?? [];
  const questions = [...sectionQuestions, ...unsectionedQuestions].sort((a, b) => a.order - b.order);
  const [answers, setAnswers] = useState<Record<number, string | string[] | number>>({});
  const [responseId, setResponseId] = useState<number | null>(null);

  // Start manual entry session
  useEffect(() => {
    if (!pid || !eid) return;
    startManualEntry.mutateAsync({ projectId: pid, employeeId: eid })
      .then((data) => {
        if (data?.response_id) setResponseId(data.response_id);
        else if (data?.id) setResponseId(data.id);
      })
      .catch(() => {
        // May already exist, try to proceed
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, eid]);

  const updateAnswer = (questionId: number, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!pid || !responseId) {
      toast.error('세션이 시작되지 않았습니다.');
      return;
    }

    const answerList = Object.entries(answers).map(([qId, answer]) => {
      const entry: { question_id: number; text_value?: string; choice_values?: string[]; rating_value?: number | null } = {
        question_id: Number(qId),
      };
      if (typeof answer === 'string') {
        entry.text_value = answer;
      } else if (Array.isArray(answer)) {
        entry.choice_values = answer;
      } else if (typeof answer === 'number') {
        entry.rating_value = answer;
      }
      return entry;
    });

    try {
      await submitManualEntry.mutateAsync({
        projectId: pid,
        data: { response_id: responseId, answers: answerList },
      });
      toast.success('응답이 제출되었습니다.');
      navigate(`/projects/${projectId}/responses`);
    } catch {
      toast.error('제출에 실패했습니다.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}/responses`} className="p-2 text-content-tertiary transition-colors hover:bg-surface-hover">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-content-primary">수동 입력</h1>
          <p className="text-sm text-content-tertiary">{project?.title}</p>
        </div>
      </div>

      {/* Employee Info */}
      {employee && (
        <div className="border border-line bg-surface-secondary p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-sm font-medium text-accent">
              {employee.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary">{employee.name}</p>
              <p className="text-xs text-content-tertiary">
                {[employee.department, employee.position].filter(Boolean).join(' / ') || employee.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {questLoading ? (
        <div className="flex h-40 items-center justify-center text-content-tertiary">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => {
            const qType = q.question_type || q.type || 'textarea';
            const importance = q.importance ?? 3;
            const isRequired = q.importance === 'required';
            return (
              <div key={q.id} className="border border-line bg-surface-secondary p-5">
                <div className="mb-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-accent">Q{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-content-primary">{q.text}</p>
                      {q.description && <p className="mt-1 text-xs text-content-tertiary">{q.description}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-content-tertiary">{QUESTION_TYPE_LABELS[qType] || qType}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] ${IMPORTANCE_COLORS[importance] || ''}`}>
                          {IMPORTANCE_LABELS[importance] || ''}
                        </span>
                        {isRequired && <span className="text-xs text-danger">필수</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <QuestionInput question={q} value={answers[q.id]} onChange={(v) => updateAnswer(q.id, v)} />
              </div>
            );
          })}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Link to={`/projects/${projectId}/responses`} className="border border-line px-5 py-2.5 text-sm font-medium text-content-secondary hover:bg-surface-hover">
          취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitManualEntry.isPending}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {submitManualEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          제출
        </button>
      </div>
    </div>
  );
}
