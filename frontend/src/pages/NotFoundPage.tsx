import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-primary px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-accent">404</p>
        <h1 className="mt-4 text-2xl font-bold text-content-primary">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-content-tertiary">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          <Home className="h-4 w-4" />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
