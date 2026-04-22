import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import * as authApi from '@/api/auth';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: storeLogin } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    if (!code) {
      navigate('/login?error=auth_code_missing', { replace: true });
      return;
    }

    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      navigate('/login?error=pkce_missing', { replace: true });
      return;
    }

    (async () => {
      try {
        const data = await authApi.ssoTokenExchange(code, codeVerifier);
        localStorage.removeItem('pkce_code_verifier');
        storeLogin(data.tokens, data.user);
        navigate('/dashboard', { replace: true });
      } catch {
        localStorage.removeItem('pkce_code_verifier');
        navigate('/login?error=sso_failed', { replace: true });
      }
    })();
  }, [searchParams, navigate, storeLogin]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-primary">
      <Loader2 className="mb-4 h-10 w-10 animate-spin text-accent" />
      <p className="text-sm text-content-tertiary">SSO 인증 처리 중...</p>
    </div>
  );
}
