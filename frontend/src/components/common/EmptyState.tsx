import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-hover text-content-tertiary">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-content-tertiary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
