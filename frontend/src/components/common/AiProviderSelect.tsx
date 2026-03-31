import { AI_PROVIDER_OPTIONS, type AiProvider } from '@/utils/constants';

interface AiProviderSelectProps {
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
  className?: string;
}

export default function AiProviderSelect({ value, onChange, className = '' }: AiProviderSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AiProvider)}
      className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${className}`}
    >
      {AI_PROVIDER_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
