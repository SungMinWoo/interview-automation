import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/utils/validators';
import type { LoginFormValues } from '@/utils/validators';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const SSO_PROVIDER_URL = import.meta.env.VITE_SSO_PROVIDER_URL || '';
const SSO_CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID || '';
const SSO_ENABLED = !!(SSO_PROVIDER_URL && SSO_CLIENT_ID);

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isLoading, loginError } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // SSO 에러 메시지
  const ssoError = searchParams.get('error');
  const ssoErrorMessage = ssoError
    ? ssoError === 'sso_failed'
      ? 'SSO 인증에 실패했습니다. 다시 시도해주세요.'
      : ssoError === 'auth_code_missing' || ssoError === 'pkce_missing'
        ? '잘못된 접근입니다. 다시 시도해주세요.'
        : 'SSO 인증 중 오류가 발생했습니다.'
    : null;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (data: LoginFormValues) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch {
      // error is captured in loginError
    }
  };

  const apiErrorMessage = (() => {
    if (!loginError) return null;
    const detail =
      loginError && typeof loginError === 'object' && 'response' in loginError
        ? (loginError as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : null;
    if (detail) return detail;
    if (loginError instanceof Error) return loginError.message;
    return '요청 처리 중 오류가 발생했습니다.';
  })();

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
          <p className="mt-1 text-sm text-content-tertiary">계정에 로그인하세요</p>
        </div>

        {/* Card */}
        <div className="border border-line bg-surface-secondary p-8">
          {(apiErrorMessage || ssoErrorMessage) && (
            <div className="mb-4 bg-danger-bg p-3 text-sm text-danger">
              {apiErrorMessage || ssoErrorMessage}
            </div>
          )}

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

          {SSO_ENABLED && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-content-muted">또는</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={async () => {
                  const codeVerifier = crypto.randomUUID();
                  localStorage.setItem('pkce_code_verifier', codeVerifier);
                  const codeChallenge = await generateCodeChallenge(codeVerifier);

                  const callbackUrl = `${window.location.origin}/oauth/callback`;
                  const params = new URLSearchParams({
                    client_id: SSO_CLIENT_ID,
                    redirect_uri: callbackUrl,
                    response_type: 'code',
                    scope: 'openid profile',
                    code_challenge: codeChallenge,
                    code_challenge_method: 'S256',
                  });

                  window.location.href = `${SSO_PROVIDER_URL}/o/oauth2/authorize?${params.toString()}`;
                }}
                className="flex w-full items-center justify-center gap-2 border border-line px-4 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover"
              >
                <LogIn className="h-4 w-4" />
                그룹웨어 SSO 로그인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
