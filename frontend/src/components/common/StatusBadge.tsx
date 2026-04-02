interface StatusConfig {
  label: string;
  color: string;
  dotColor: string;
}

const defaultStatusMap: Record<string, StatusConfig> = {
  created: {
    label: '생성됨',
    color: 'bg-surface-hover text-content-secondary',
    dotColor: 'bg-content-tertiary',
  },
  analyzing: {
    label: '분석 중',
    color: 'bg-surface-hover text-content-primary',
    dotColor: 'bg-content-primary',
  },
  collecting: {
    label: '수집 중',
    color: 'bg-warning-bg text-warning',
    dotColor: 'bg-warning',
  },
  processing: {
    label: '처리 중',
    color: 'bg-surface-hover text-content-primary',
    dotColor: 'bg-content-primary',
  },
  completed: {
    label: '완료',
    color: 'bg-success-bg text-success',
    dotColor: 'bg-success',
  },
  failed: {
    label: '실패',
    color: 'bg-danger-bg text-danger',
    dotColor: 'bg-danger',
  },
  paused: {
    label: '일시정지',
    color: 'bg-warning-bg text-warning',
    dotColor: 'bg-warning',
  },
};

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, StatusConfig>;
  className?: string;
}

export function StatusBadge({ status, colorMap, className = '' }: StatusBadgeProps) {
  const map = colorMap ?? defaultStatusMap;
  const config = map[status] ?? {
    label: status,
    color: 'bg-surface-hover text-content-secondary',
    dotColor: 'bg-content-tertiary',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
