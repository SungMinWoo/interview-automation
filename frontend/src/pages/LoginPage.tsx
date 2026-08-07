import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

  // SSO 에러 메시지
  const ssoError = searchParams.get('error');
  const ssoErrorMessage = ssoError
    ? ssoError === 'sso_failed'
      ? 'SSO 인증에 실패했습니다. 다시 시도해주세요.'
      : ssoError === 'auth_code_missing' || ssoError === 'pkce_missing'
        ? '잘못된 접근입니다. 다시 시도해주세요.'
        : 'SSO 인증 중 오류가 발생했습니다.'
    : null;

  const handleSsoLogin = async () => {
    setRedirecting(true);
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
  };

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
          <p className="mt-1 text-sm text-content-tertiary">그룹웨어 계정으로 로그인하세요</p>
        </div>

        {/* Card */}
        <div className="border border-line bg-surface-secondary p-8">
          {ssoErrorMessage && (
            <div className="mb-4 bg-danger-bg p-3 text-sm text-danger">
              {ssoErrorMessage}
            </div>
          )}

          {SSO_ENABLED ? (
            <button
              type="button"
              onClick={handleSsoLogin}
              disabled={redirecting}
              className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {redirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              그룹웨어 SSO 로그인
            </button>
          ) : (
            <div className="text-center text-sm text-content-tertiary">
              SSO가 설정되지 않았습니다. 관리자에게 문의해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
