import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import { useEmployees } from '@/hooks/useDistribution';
import { useSubmitManualEntry } from '@/hooks/useResponses';
import { QUESTION_TYPE_LABELS } from '@/utils/constants';
import toast from 'react-hot-toast';

export default function ManualEntryPage() {
  const { projectId, employeeId } = useParams<{ projectId: string; employeeId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? Number(projectId) : undefined;
  const eid = employeeId ? Number(employeeId) : undefined;
  const { data: project } = useProject(pid);
  const { data: questionnaire, isLoading: questLoading } = useQuestionnaire(pid);
  const { data: employees } = useEmployees(pid);
  const submitManualEntry = useSubmitManualEntry();

  const employee = employees?.find((e) => e.id === eid);
  const questions = questionnaire?.questions ?? [];

  const [answers, setAnswers] = useState<Record<number, string | string[] | number>>({});

  const updateAnswer = (questionId: number, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!pid || !eid) return;
    const answerList = Object.entries(answers).map(([qId, answer]) => ({
      questionId: Number(qId),
      answer,
    }));
    try {
      await submitManualEntry.mutateAsync({
        projectId: pid,
        employeeId: eid,
        data: { answers: answerList },
      });
      toast.success('응답이 제출되었습니다.');
      navigate(`/projects/${projectId}/responses`);
    } catch {
      toast.error('제출에 실패했습니다.');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/projects/${projectId}/responses`}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">수동 입력</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project?.title}</p>
        </div>
      </div>

      {/* Employee Info */}
      {employee && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1a1a2e]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              {employee.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</p>
              <p className="text-xs text-gray-400">
                {[employee.department, employee.position].filter(Boolean).join(' / ') || employee.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {questLoading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-[#1a1a2e]"
            >
              <div className="mb-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Q{index + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{q.text}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {QUESTION_TYPE_LABELS[q.type]}
                      </span>
                      {q.isRequired && (
                        <span className="text-xs text-red-500">필수</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Answer Input */}
              {q.type === 'open_ended' && (
                <textarea
                  rows={3}
                  placeholder="답변을 입력하세요..."
                  className={`${inputClass} resize-y`}
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                />
              )}

              {q.type === 'single_choice' && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.text}
                        checked={answers[q.id] === opt.text}
                        onChange={() => updateAnswer(q.id, opt.text)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = (answers[q.id] as string[]) ?? [];
                    const isChecked = selected.includes(opt.text);
                    return (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = isChecked
                              ? selected.filter((s) => s !== opt.text)
                              : [...selected, opt.text];
                            updateAnswer(q.id, next);
                          }}
                          className="rounded border-gray-300 text-indigo-600 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'scale' && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateAnswer(q.id, v)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                        answers[q.id] === v
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'ranking' && (
                <textarea
                  rows={2}
                  placeholder="순위를 입력하세요 (예: 1, 3, 2)"
                  className={`${inputClass} resize-y`}
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Link
          to={`/projects/${projectId}/responses`}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
        >
          취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitManualEntry.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitManualEntry.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          제출
        </button>
      </div>
    </div>
  );
}
