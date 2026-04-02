import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

const variantStyles = {
  primary:
    'bg-accent text-accent-text hover:bg-accent-hover focus-visible:ring-line-focus',
  secondary:
    'bg-surface-secondary text-content-secondary border border-line hover:bg-surface-hover focus-visible:ring-line-focus',
  danger:
    'bg-danger text-accent-text hover:bg-danger/80 focus-visible:ring-line-focus',
  ghost:
    'text-content-secondary hover:bg-surface-hover focus-visible:ring-line-focus',
} as const;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  isLoading?: boolean;
  icon?: ReactNode;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      disabled,
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
