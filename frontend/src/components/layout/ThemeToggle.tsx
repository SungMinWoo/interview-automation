import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { isDark, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      className={`p-2 text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-secondary ${className}`}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-transform duration-200" />
      ) : (
        <Moon className="h-5 w-5 transition-transform duration-200" />
      )}
    </button>
  );
}
