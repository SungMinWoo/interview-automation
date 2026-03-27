import type { ProjectStatus } from '@/types/project';
import type { AnalysisStatus } from '@/types/analysis';
import type { InvitationStatus } from '@/types/distribution';
import type { ResponseStatus } from '@/types/response';
import type { AggregationStatus } from '@/types/aggregation';
import {
  PROJECT_STATUS_LABELS,
  ANALYSIS_STATUS_LABELS,
  INVITATION_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
  AGGREGATION_STATUS_LABELS,
} from './constants';

/**
 * Format a date string to Korean locale format.
 */
export function formatDate(dateStr: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date string with time.
 */
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Relative time from now (e.g. "3일 전", "방금 전")
 */
export function formatRelativeTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 30) return `${diffDay}일 전`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

/**
 * Map status values to Korean labels.
 */
export function projectStatusText(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status] ?? status;
}

export function analysisStatusText(status: AnalysisStatus): string {
  return ANALYSIS_STATUS_LABELS[status] ?? status;
}

export function invitationStatusText(status: InvitationStatus): string {
  return INVITATION_STATUS_LABELS[status] ?? status;
}

export function responseStatusText(status: ResponseStatus): string {
  return RESPONSE_STATUS_LABELS[status] ?? status;
}

export function aggregationStatusText(status: AggregationStatus): string {
  return AGGREGATION_STATUS_LABELS[status] ?? status;
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
