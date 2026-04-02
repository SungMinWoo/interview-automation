import { type ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = '데이터가 없습니다',
  emptyDescription = '표시할 항목이 없습니다.',
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="데이터를 불러오는 중..." />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`overflow-x-auto border border-line ${className}`}>
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-hover">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-content-tertiary"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface-secondary">
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row, index)}
              className="transition-colors hover:bg-surface-hover"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-sm text-content-secondary"
                >
                  {col.render
                    ? col.render(row, index)
                    : (row[col.key] as ReactNode) ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
