interface StatusConfig {
  label: string;
  color: string;
  dotColor: string;
}

const defaultStatusMap: Record<string, StatusConfig> = {
  created: {
    label: '생성됨',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    dotColor: 'bg-gray-400',
  },
  analyzing: {
    label: '분석 중',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  collecting: {
    label: '수집 중',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
  },
  processing: {
    label: '처리 중',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    dotColor: 'bg-purple-500',
  },
  completed: {
    label: '완료',
    color: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    dotColor: 'bg-green-500',
  },
  failed: {
    label: '실패',
    color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
  paused: {
    label: '일시정지',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    dotColor: 'bg-orange-500',
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
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    dotColor: 'bg-gray-400',
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
