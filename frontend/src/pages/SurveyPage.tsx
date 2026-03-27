import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, AlertCircle, Clock, Send } from 'lucide-react';
import apiClient from '@/api/client';
import { API_PATHS } from '@/utils/constants';
import { surveyPasswordSchema } from '@/utils/validators';
import type { SurveyPasswordFormValues } from '@/utils/validators';
import type { Question } from '@/types/questionnaire';

interface SurveyInfo {
  title: string;
  description?: string;
  introMessage?: string;
  outroMessage?: string;
  questions: Question[];
  employeeName?: string;
  status: 'active' | 'expired' | 'completed';
}

type SurveyStep = 'loading' | 'password' | 'questions' | 'submitting' | 'done' | 'expired' | 'error';

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<SurveyStep>('loading');
  const [surveyInfo, setSurveyInfo] = useState<SurveyInfo | null>(null);
  const [answers, setAnswers] = useState<Record<number, string | string[] | number>>({});
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setInterval>>();

  const passwordForm = useForm<SurveyPasswordFormValues>({
    resolver: zodResolver(surveyPasswordSchema),
    defaultValues: { password: '' },
  });

  // Load survey info
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await apiClient.get<SurveyInfo>(API_PATHS.SURVEY(token));
        const data = res.data;
        setSurveyInfo(data);
        if (data.status === 'expired') {
          setStep('expired');
        } else if (data.status === 'completed') {
          setStep('done');
        } else {
          setStep('password');
        }
      } catch {
        setStep('error');
        setError('설문 정보를 불러올 수 없습니다.');
      }
    })();
  }, [token]);

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (!token || step !== 'questions' || Object.keys(answers).length === 0) return;
    try {
      await apiClient.post(API_PATHS.SURVEY_DRAFT(token), { answers });
    } catch {
      // silent fail for drafts
    }
  }, [token, step, answers]);

  useEffect(() => {
    if (step === 'questions') {
      draftTimerRef.current = setInterval(saveDraft, 30000); // every 30s
    }
    return () => {
      if (draftTimerRef.current) clearInterval(draftTimerRef.current);
    };
  }, [step, saveDraft]);

  const handlePasswordSubmit = async (data: SurveyPasswordFormValues) => {
    if (!token) return;
    try {
      await apiClient.post(API_PATHS.SURVEY_VERIFY(token), { password: data.password });
      setStep('questions');
    } catch {
      passwordForm.setError('password', { message: '비밀번호가 올바르지 않습니다.' });
    }
  };

  const updateAnswer = (questionId: number, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    setStep('submitting');
    try {
      const answerList = Object.entries(answers).map(([qId, answer]) => ({
        questionId: Number(qId),
        answer,
      }));
      await apiClient.post(API_PATHS.SURVEY_SUBMIT(token), { answers: answerList });
      setStep('done');
    } catch {
      setStep('questions');
      setError('제출에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const questions = surveyInfo?.questions ?? [];

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Loading */}
        {step === 'loading' && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">오류가 발생했습니다</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        )}

        {/* Expired */}
        {step === 'expired' && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Clock className="mb-4 h-12 w-12 text-orange-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">설문이 만료되었습니다</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              이 설문의 기한이 지났습니다. 관리자에게 문의해주세요.
            </p>
          </div>
        )}

        {/* Password Step */}
        {step === 'password' && surveyInfo && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-[#1a1a2e]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
                <Send className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{surveyInfo.title}</h1>
              {surveyInfo.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{surveyInfo.description}</p>
              )}
              {surveyInfo.employeeName && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  안녕하세요, <span className="font-medium">{surveyInfo.employeeName}</span>님
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-[#1a1a2e]">
              <h2 className="mb-4 text-center text-base font-semibold text-gray-900 dark:text-white">
                비밀번호 인증
              </h2>
              <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
                이메일로 전송된 4자리 비밀번호를 입력해주세요.
              </p>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="0000"
                    className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                    {...passwordForm.register('password')}
                  />
                  {passwordForm.formState.errors.password && (
                    <p className="mt-2 text-center text-xs text-red-500">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  확인
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Questions Step */}
        {(step === 'questions' || step === 'submitting') && surveyInfo && (
          <div className="space-y-5">
            {/* Intro */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{surveyInfo.title}</h1>
              {surveyInfo.introMessage && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500 dark:text-gray-400">
                  {surveyInfo.introMessage}
                </p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                총 {questions.length}개 질문 &middot; 응답은 자동 저장됩니다
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Questions */}
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-[#1a1a2e]"
              >
                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {index + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{q.text}</p>
                      {q.description && (
                        <p className="mt-1 text-xs text-gray-400">{q.description}</p>
                      )}
                      {q.isRequired && (
                        <span className="mt-1 inline-block text-xs text-red-500">* 필수</span>
                      )}
                    </div>
                  </div>
                </div>

                {q.type === 'open_ended' && (
                  <textarea
                    rows={4}
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
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                          answers[q.id] === opt.text
                            ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20'
                            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`survey-q-${q.id}`}
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
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                            isChecked
                              ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20'
                              : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
                          }`}
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
                  <div className="flex items-center justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateAnswer(q.id, v)}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl border text-base font-medium transition-all ${
                          answers[q.id] === v
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
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
                    placeholder="순위를 입력하세요..."
                    className={`${inputClass} resize-y`}
                    value={(answers[q.id] as string) ?? ''}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Submit */}
            <div className="pb-8">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={step === 'submitting'}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {step === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    제출 중...
                  </span>
                ) : (
                  '제출'
                )}
              </button>
            </div>

            {/* Confirm Dialog */}
            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-[#1a1a2e]">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">응답 제출</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    제출 후에는 수정할 수 없습니다. 제출하시겠습니까?
                  </p>
                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        setShowConfirm(false);
                        handleSubmit();
                      }}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      제출
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">감사합니다!</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {surveyInfo?.outroMessage ?? '응답이 성공적으로 제출되었습니다. 참여해 주셔서 감사합니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
