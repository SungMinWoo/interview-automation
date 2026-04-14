import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2, AlertCircle, Clock, Send } from 'lucide-react';
import axios from 'axios';
import { API_PATHS } from '@/utils/constants';
import { surveyPasswordSchema } from '@/utils/validators';
import type { SurveyPasswordFormValues } from '@/utils/validators';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function api(path: string, options?: { method?: string; data?: unknown; token?: string }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;
  return axios({
    method: options?.method || 'GET',
    url: `${BASE_URL}${path}`,
    data: options?.data,
    headers,
  });
}

interface SurveyInfo {
  project_title: string;
  employee_name: string;
  status: string;
  is_expired: boolean;
}

interface SurveyQuestion {
  id: number;
  text: string;
  description: string;
  question_type: string;
  is_required: boolean;
  importance?: string;
  order: number;
  options: string[];
}

type SurveyStep = 'loading' | 'password' | 'questions' | 'submitting' | 'done' | 'expired' | 'error';

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<SurveyStep>('loading');
  const [surveyInfo, setSurveyInfo] = useState<SurveyInfo | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
        const res = await api(API_PATHS.SURVEY(token));
        const data = res.data;
        setSurveyInfo(data);
        if (data.is_expired) {
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
    if (!token || !accessToken || step !== 'questions' || Object.keys(answers).length === 0) return;
    const draftAnswers = Object.entries(answers).map(([qId, val]) => {
      const entry: { question_id: number; text_value?: string; choice_values?: string[]; rating_value?: number | null } = { question_id: Number(qId) };
      if (typeof val === 'string') entry.text_value = val;
      else if (Array.isArray(val)) entry.choice_values = val;
      else if (typeof val === 'number') entry.rating_value = val;
      return entry;
    });
    try {
      await api(API_PATHS.SURVEY_DRAFT(token), { method: 'PATCH', data: { answers: draftAnswers }, token: accessToken });
    } catch { /* silent */ }
  }, [token, accessToken, step, answers]);

  useEffect(() => {
    if (step === 'questions') {
      draftTimerRef.current = setInterval(saveDraft, 30000);
    }
    return () => { if (draftTimerRef.current) clearInterval(draftTimerRef.current); };
  }, [step, saveDraft]);

  const handlePasswordSubmit = async (data: SurveyPasswordFormValues) => {
    if (!token) return;
    try {
      const res = await api(API_PATHS.SURVEY_VERIFY(token), { method: 'POST', data: { password: data.password } });
      const jwt = res.data.access_token;
      setAccessToken(jwt);

      // Fetch questions
      const qRes = await api(`/survey/${token}/questions/`, { token: jwt });
      setQuestions(qRes.data);
      setStep('questions');
    } catch {
      passwordForm.setError('password', { message: '비밀번호가 올바르지 않습니다.' });
    }
  };

  const updateAnswer = (questionId: number, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!token || !accessToken) return;
    setStep('submitting');
    try {
      const answerList = Object.entries(answers).map(([qId, val]) => {
        const entry: { question_id: number; text_value?: string; choice_values?: string[]; rating_value?: number | null } = { question_id: Number(qId) };
        if (typeof val === 'string') entry.text_value = val;
        else if (Array.isArray(val)) entry.choice_values = val;
        else if (typeof val === 'number') entry.rating_value = val;
        return entry;
      });
      await api(API_PATHS.SURVEY_SUBMIT(token), { method: 'POST', data: { answers: answerList }, token: accessToken });
      setStep('done');
    } catch {
      setStep('questions');
      setError('제출에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const inputClass = 'w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20';

  return (
    <div className="min-h-screen bg-surface-primary">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {step === 'loading' && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}

        {step === 'error' && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-danger" />
            <h2 className="text-xl font-bold text-content-primary">오류가 발생했습니다</h2>
            <p className="mt-2 text-sm text-content-tertiary">{error}</p>
          </div>
        )}

        {step === 'expired' && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Clock className="mb-4 h-12 w-12 text-warning" />
            <h2 className="text-xl font-bold text-content-primary">설문이 만료되었습니다</h2>
            <p className="mt-2 text-sm text-content-tertiary">관리자에게 문의해주세요.</p>
          </div>
        )}

        {step === 'password' && surveyInfo && (
          <div className="space-y-6">
            <div className="border border-line bg-surface-secondary p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-surface-hover">
                <Send className="h-7 w-7 text-accent" />
              </div>
              <h1 className="text-xl font-bold text-content-primary">{surveyInfo.project_title}</h1>
              <p className="mt-1 text-sm text-content-secondary">
                안녕하세요, <span className="font-medium">{surveyInfo.employee_name}</span>님
              </p>
            </div>

            <div className="border border-line bg-surface-secondary p-8">
              <h2 className="mb-4 text-center text-base font-semibold text-content-primary">비밀번호 인증</h2>
              <p className="mb-6 text-center text-sm text-content-tertiary">전화번호 뒷 4자리를 입력해주세요.</p>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="0000"
                  className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                  {...passwordForm.register('password')}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-center text-xs text-danger">{passwordForm.formState.errors.password.message}</p>
                )}
                <button type="submit" className="w-full bg-accent py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover">
                  확인
                </button>
              </form>
            </div>
          </div>
        )}

        {(step === 'questions' || step === 'submitting') && (
          <div className="space-y-5">
            <div className="border border-line bg-surface-secondary p-6">
              <h1 className="text-xl font-bold text-content-primary">{surveyInfo?.project_title}</h1>
              <p className="mt-3 text-xs text-content-tertiary">총 {questions.length}개 질문 &middot; 응답은 자동 저장됩니다</p>
            </div>

            {error && <div className="bg-danger-bg p-3 text-sm text-danger">{error}</div>}

            {questions.map((q, index) => (
              <div key={q.id} className="border border-line bg-surface-secondary p-6">
                <div className="mb-4">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 text-sm font-semibold text-accent">{index + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-content-primary">{q.text}</p>
                      {q.description && <p className="mt-1 text-xs text-content-tertiary">{q.description}</p>}
                      {q.importance === 'required' && <span className="mt-1 inline-block text-xs text-danger">* 필수</span>}
                    </div>
                  </div>
                </div>

                {(q.question_type === 'textarea' || q.question_type === 'text') && (
                  <textarea
                    rows={q.question_type === 'text' ? 1 : 4}
                    placeholder="답변을 입력하세요..."
                    className={`${inputClass} resize-y`}
                    value={(answers[q.id] as string) ?? ''}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                  />
                )}

                {q.question_type === 'single_choice' && (
                  <div className="space-y-2">
                    {q.options.map((opt, i) => (
                      <label key={i} className={`flex cursor-pointer items-center gap-3 border p-3.5 transition-colors ${answers[q.id] === opt ? 'border-line-hover bg-surface-hover' : 'border-line hover:bg-surface-hover'}`}>
                        <input type="radio" name={`survey-q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => updateAnswer(q.id, opt)} className="text-accent" />
                        <span className="text-sm text-content-secondary">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {q.options.map((opt, i) => {
                      const selected = (answers[q.id] as string[]) ?? [];
                      const isChecked = selected.includes(opt);
                      return (
                        <label key={i} className={`flex cursor-pointer items-center gap-3 border p-3.5 transition-colors ${isChecked ? 'border-line-hover bg-surface-hover' : 'border-line hover:bg-surface-hover'}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => updateAnswer(q.id, isChecked ? selected.filter((s) => s !== opt) : [...selected, opt])} className="border-line text-accent" />
                          <span className="text-sm text-content-secondary">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.question_type === 'rating' && (
                  <div className="flex items-center justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} type="button" onClick={() => updateAnswer(q.id, v)} className={`flex h-12 w-12 items-center justify-center border text-base font-medium transition-all ${answers[q.id] === v ? 'border-accent bg-accent text-accent-text' : 'border-line text-content-secondary hover:bg-surface-hover'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                {q.question_type === 'ranking' && (
                  <textarea rows={2} placeholder="순위를 입력하세요..." className={`${inputClass} resize-y`} value={(answers[q.id] as string) ?? ''} onChange={(e) => updateAnswer(q.id, e.target.value)} />
                )}
              </div>
            ))}

            <div className="pb-8">
              <button onClick={() => setShowConfirm(true)} disabled={step === 'submitting'} className="w-full bg-accent py-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50">
                {step === 'submitting' ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />제출 중...</span> : '제출'}
              </button>
            </div>

            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.6)] p-4">
                <div className="w-full max-w-sm bg-surface-secondary p-6">
                  <h3 className="text-lg font-semibold text-content-primary">응답 제출</h3>
                  <p className="mt-2 text-sm text-content-tertiary">제출하시겠습니까? 모든 질문에 답하지 않아도 됩니다.</p>
                  <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setShowConfirm(false)} className="border border-line px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-hover">취소</button>
                    <button onClick={() => { setShowConfirm(false); handleSubmit(); }} className="bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover">제출</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-content-primary">감사합니다!</h2>
            <p className="mt-2 text-sm text-content-tertiary">응답이 성공적으로 제출되었습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
