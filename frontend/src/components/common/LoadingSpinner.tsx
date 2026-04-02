interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`animate-spin rounded-full border-line border-t-accent ${sizeStyles[size]}`}
        role="status"
        aria-label="로딩 중"
      />
      {text && (
        <p className="text-sm text-content-tertiary">{text}</p>
      )}
    </div>
  );
}
