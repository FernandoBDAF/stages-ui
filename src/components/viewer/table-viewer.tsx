'use client';

import { useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableViewerProps {
  documents: Record<string, unknown>[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (skip: number) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  onDocumentClick?: (docId: string) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  isLoading?: boolean;
  className?: string;
}

export function TableViewer({
  documents,
  total,
  skip,
  limit,
  hasMore,
  onPageChange,
  onSortChange,
  onDocumentClick,
  sortField,
  sortOrder,
  isLoading = false,
  className,
}: TableViewerProps) {
  // Infer columns from documents
  const columns = useMemo(() => {
    if (documents.length === 0) return [];
    
    const allKeys = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    
    // Prioritize _id, then sort alphabetically
    const keys = Array.from(allKeys);
    keys.sort((a, b) => {
      if (a === '_id') return -1;
      if (b === '_id') return 1;
      return a.localeCompare(b);
    });
    
    return keys;
  }, [documents]);

  // Sort documents locally based on sortField and sortOrder
  const sortedDocuments = useMemo(() => {
    if (!sortField || !sortOrder) return documents;
    
    return [...documents].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [documents, sortField, sortOrder]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortField !== column) {
      onSortChange(column, 'asc');
    } else if (sortOrder === 'asc') {
      onSortChange(column, 'desc');
    } else {
      // Reset sort - call with empty to indicate no sort
      onSortChange('', 'asc');
    }
  };

  // Format cell value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 50) + '...';
    if (typeof value === 'string' && value.length > 100) return value.slice(0, 100) + '...';
    return String(value);
  };

  // Pagination
  const currentPage = Math.floor(skip / limit);
  const totalPages = Math.ceil(total / limit);
  const canGoPrev = skip > 0;
  const canGoNext = hasMore;

  const handlePrevPage = () => {
    onPageChange(Math.max(0, skip - limit));
  };

  const handleNextPage = () => {
    onPageChange(skip + limit);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {documents.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full text-neutral-500">
            No documents found
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
              <tr>
                {columns.map(column => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className={cn(
                      'px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400',
                      'border-b border-neutral-200 dark:border-neutral-700',
                      'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 select-none'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{column}</span>
                      {sortField === column ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="w-4 h-4 flex-shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-30 flex-shrink-0" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDocuments.map((doc, rowIndex) => (
                <tr
                  key={doc._id as string || rowIndex}
                  onClick={() => doc._id && onDocumentClick?.(String(doc._id))}
                  className={cn(
                    'border-b border-neutral-100 dark:border-neutral-800',
                    'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                    onDocumentClick && 'cursor-pointer'
                  )}
                >
                  {columns.map(column => (
                    <td
                      key={column}
                      className="px-4 py-3 text-neutral-700 dark:text-neutral-300"
                    >
                      <span className="truncate block max-w-[300px]" title={String(doc[column])}>
                        {formatValue(doc[column])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
          <div className="text-sm text-neutral-500">
            Showing {skip + 1}–{Math.min(skip + limit, total)} of {total.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={!canGoPrev || isLoading}
              className={cn(
                'p-2 rounded-lg',
                canGoPrev && !isLoading
                  ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={!canGoNext || isLoading}
              className={cn(
                'p-2 rounded-lg',
                canGoNext && !isLoading
                  ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
