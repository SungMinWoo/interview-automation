import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, registerSchema } from '@/utils/validators';
import type { LoginFormValues, RegisterFormValues } from '@/utils/validators';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// DRF 에러 응답({detail} 또는 {field: [msg]})에서 첫 메시지를 꺼낸다.
function getApiErrorMessage(error: unknown): string | null {
  if (!error) return null;
  const data =
    typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: unknown } }).response?.data
      : null;
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (typeof first === 'string') return first;
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  if (error instanceof Error) return error.message;
  return '요청 처리 중 오류가 발생했습니다.';
}

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register: registerUser, isLoading, loginError, registerError } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', username: '', company_name: '', password: '', password_confirm: '' },
  });

  const handleLogin = async (data: LoginFormValues) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch {
      // error is captured in loginError
    }
  };

  const handleRegister = async (data: RegisterFormValues) => {
    try {
      await registerUser(data);
      navigate(from, { replace: true });
    } catch {
      // error is captured in registerError
    }
  };

  const apiError = isRegisterMode ? registerError : loginError;
  const apiErrorMessage = getApiErrorMessage(apiError);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary px-4">
      {/* Theme toggle in corner */}
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-accent text-xl font-bold text-accent-text">
            IS
          </div>
          <h1 className="text-2xl font-bold text-content-primary">Interview Site</h1>
          <p className="mt-1 text-sm text-content-tertiary">
            {isRegisterMode ? '새 계정을 만들어주세요' : '계정에 로그인하세요'}
          </p>
        </div>

        {/* Card */}
        <div className="border border-line bg-surface-secondary p-8">
          {apiErrorMessage && (
            <div className="mb-4 bg-danger-bg p-3 text-sm text-danger">
              {apiErrorMessage}
            </div>
          )}

          {!isRegisterMode ? (
            /* Login Form */
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  이메일
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-danger">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="비밀번호를 입력하세요"
                    className="w-full border border-line bg-surface-secondary px-4 py-2.5 pr-10 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-danger">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                로그인
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  이름
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  placeholder="홍길동"
                  className="w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                  {...registerForm.register('username')}
                />
                {registerForm.formState.errors.username && (
                  <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  이메일
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-company" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  회사명 <span className="text-content-tertiary">(선택)</span>
                </label>
                <input
                  id="reg-company"
                  type="text"
                  placeholder="회사명"
                  className="w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                  {...registerForm.register('company_name')}
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  비밀번호
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8자 이상, 영문+숫자 포함"
                  className="w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                  {...registerForm.register('password')}
                />
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-password-confirm" className="mb-1.5 block text-sm font-medium text-content-secondary">
                  비밀번호 확인
                </label>
                <input
                  id="reg-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full border border-line bg-surface-secondary px-4 py-2.5 text-sm text-content-primary placeholder-content-tertiary transition-colors focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-line-focus/20"
                  {...registerForm.register('password_confirm')}
                />
                {registerForm.formState.errors.password_confirm && (
                  <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.password_confirm.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                회원가입
              </button>
            </form>
          )}

          {/* Toggle */}
          <div className="mt-6 text-center text-sm text-content-tertiary">
            {isRegisterMode ? (
              <>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="font-medium text-accent hover:text-accent"
                >
                  로그인
                </button>
              </>
            ) : (
              <>
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="font-medium text-accent hover:text-accent"
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
