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
      className={`border border-line bg-surface-secondary px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-line-focus ${className}`}
    >
      {AI_PROVIDER_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
