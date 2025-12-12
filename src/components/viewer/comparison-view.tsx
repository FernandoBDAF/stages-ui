'use client';

import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { X, Link2, Link2Off, FileText, GitCompare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentComparison } from '@/hooks/use-iteration';
import { DiffHighlight, DiffStatsBadge, InlineDiff } from './diff-highlight';
import { JsonViewer } from './json-viewer';
import { Button } from '@/components/ui/button';
import type { ChangedField } from '@/types/iteration-api';

interface ComparisonViewProps {
  dbName: string;
  collection: string;
  leftDocId: string;
  rightDocId: string;
  onClose: () => void;
  className?: string;
}

/**
 * Loading phases for comparison
 */
type LoadingPhase = 'fetching' | 'processing' | 'ready';

/**
 * Enhanced loading skeleton with progress indicator
 */
function CompareLoadingSkeleton({ phase }: { phase: LoadingPhase }) {
  const phaseMessages: Record<LoadingPhase, { label: string; progress: number }> = {
    fetching: { label: 'Fetching documents...', progress: 33 },
    processing: { label: 'Computing differences...', progress: 66 },
    ready: { label: 'Preparing view...', progress: 100 },
  };

  const { label, progress } = phaseMessages[phase];

  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <div className="h-6 w-36 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Loading content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          {/* Icon */}
          <div className="relative">
            <GitCompare className="h-12 w-12 text-neutral-300 dark:text-neutral-700" />
            <Loader2 className="h-6 w-6 text-primary absolute -bottom-1 -right-1 animate-spin" />
          </div>

          {/* Progress bar */}
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-muted-foreground font-mono">{progress}%</span>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Document indicators */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-red-500" />
              <span>Version 1</span>
            </div>
            <span className="text-neutral-300 dark:text-neutral-700">↔</span>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-green-500" />
              <span>Version 2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse"
              style={{ width: `${60 + Math.random() * 40}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Side-by-side document comparison view
 * Features:
 * - Synchronized scrolling (toggleable)
 * - Diff highlighting for text fields
 * - Field-by-field comparison
 * - Metrics summary
 * - Loading progress indicator
 */
export function ComparisonView({
  dbName,
  collection,
  leftDocId,
  rightDocId,
  onClose,
  className,
}: ComparisonViewProps) {
  const [syncScroll, setSyncScroll] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('fetching');
  
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const { data, isLoading, isFetching, error } = useDocumentComparison(
    dbName,
    collection,
    leftDocId,
    rightDocId
  );

  // Update loading phase based on query state
  useEffect(() => {
    if (isFetching && !data) {
      setLoadingPhase('fetching');
    } else if (isFetching && data) {
      // Refetching existing data
      setLoadingPhase('processing');
    } else if (!isFetching && data) {
      // Brief processing phase before showing content
      setLoadingPhase('processing');
      const timer = setTimeout(() => setLoadingPhase('ready'), 300);
      return () => clearTimeout(timer);
    }
  }, [isFetching, data]);

  // Estimate if this is a large diff (for showing extended loading)
  const isLargeDiff = useMemo(() => {
    if (!data) return false;
    
    // Check if any changed field has a lot of changes
    const hasLargeTextChanges = data.diff?.changed_fields.some(
      (f: ChangedField) => f.changes && f.changes.length > 20
    );
    
    // Check total number of changed fields
    const totalChanges = 
      (data.diff?.added_fields.length || 0) +
      (data.diff?.removed_fields.length || 0) +
      (data.diff?.changed_fields.length || 0);
    
    return hasLargeTextChanges || totalChanges > 15;
  }, [data]);

  // Synchronized scrolling handler
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || isScrolling.current) return;
    
    isScrolling.current = true;
    
    const sourceRef = source === 'left' ? leftPanelRef : rightPanelRef;
    const targetRef = source === 'left' ? rightPanelRef : leftPanelRef;
    
    if (sourceRef.current && targetRef.current) {
      const scrollPercentage = sourceRef.current.scrollTop / 
        (sourceRef.current.scrollHeight - sourceRef.current.clientHeight);
      
      targetRef.current.scrollTop = scrollPercentage * 
        (targetRef.current.scrollHeight - targetRef.current.clientHeight);
    }
    
    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  }, [syncScroll]);

  // Find the main text field for highlighting
  const textField = data?.diff?.changed_fields.find(
    (f: ChangedField) => f.similarity !== undefined && f.changes && f.changes.length > 0
  );

  // Show loading skeleton during initial load or when phase is not ready
  if (isLoading || (loadingPhase !== 'ready' && !error)) {
    return <CompareLoadingSkeleton phase={loadingPhase} />;
  }

  if (error || !data) {
    return (
      <div className={cn('p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Compare Documents</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error instanceof Error ? error.message : 'Failed to load comparison'}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Compare Documents</h2>
          <DiffStatsBadge
            addedFields={data.diff.added_fields.length}
            removedFields={data.diff.removed_fields.length}
            changedFields={data.diff.changed_fields.length}
            similarity={data.metrics.overall_similarity}
          />
          {isLargeDiff && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
              Large diff
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sync scroll toggle */}
          <Button
            variant={syncScroll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSyncScroll(!syncScroll)}
            className="gap-2"
          >
            {syncScroll ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
            Sync Scroll
          </Button>
          
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-neutral-200 dark:border-neutral-800">
            <button
              className={cn(
                'px-3 py-1.5 text-sm',
                viewMode === 'split' ? 'bg-neutral-100 dark:bg-neutral-800' : ''
              )}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button
              className={cn(
                'px-3 py-1.5 text-sm',
                viewMode === 'unified' ? 'bg-neutral-100 dark:bg-neutral-800' : ''
              )}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
          </div>
          
          {/* Close button */}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comparison Content */}
      {viewMode === 'split' ? (
        <div className="flex-1 flex min-h-0">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col border-r border-neutral-200 dark:border-neutral-800">
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/10 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Version 1 (Left)
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {leftDocId.slice(0, 12)}...
              </span>
            </div>
            <div
              ref={leftPanelRef}
              className="flex-1 overflow-auto p-4"
              onScroll={() => handleScroll('left')}
            >
              {textField && textField.changes ? (
                <DiffHighlight
                  text={String(data.left[textField.field] || '')}
                  changes={textField.changes}
                  side="left"
                />
              ) : (
                <JsonViewer data={data.left} defaultExpanded={3} />
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 bg-green-50 dark:bg-green-900/10 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Version 2 (Right)
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {rightDocId.slice(0, 12)}...
              </span>
            </div>
            <div
              ref={rightPanelRef}
              className="flex-1 overflow-auto p-4"
              onScroll={() => handleScroll('right')}
            >
              {textField && textField.changes ? (
                <DiffHighlight
                  text={String(data.right[textField.field] || '')}
                  changes={textField.changes}
                  side="right"
                />
              ) : (
                <JsonViewer data={data.right} defaultExpanded={3} />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Unified View */
        <div className="flex-1 overflow-auto p-4">
          <UnifiedDiffView data={data} />
        </div>
      )}

      {/* Footer with field changes */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <FieldChangeSummary diff={data.diff} />
      </div>
    </div>
  );
}

/**
 * Unified diff view showing all field changes
 */
function UnifiedDiffView({ data }: { data: NonNullable<ReturnType<typeof useDocumentComparison>['data']> }) {
  const { diff } = data;

  return (
    <div className="space-y-6">
      {/* Added fields */}
      {diff.added_fields.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
            Added Fields ({diff.added_fields.length})
          </h3>
          <div className="space-y-2">
            {diff.added_fields.map((field) => (
              <div key={field} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="font-mono text-sm font-medium">{field}</span>
                <div className="mt-1 text-sm">
                  <JsonViewer data={data.right[field]} defaultExpanded={1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed fields */}
      {diff.removed_fields.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
            Removed Fields ({diff.removed_fields.length})
          </h3>
          <div className="space-y-2">
            {diff.removed_fields.map((field) => (
              <div key={field} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="font-mono text-sm font-medium line-through">{field}</span>
                <div className="mt-1 text-sm opacity-60">
                  <JsonViewer data={data.left[field]} defaultExpanded={1} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Changed fields */}
      {diff.changed_fields.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
            Changed Fields ({diff.changed_fields.length})
          </h3>
          <div className="space-y-3">
            {diff.changed_fields.map((change) => (
              <div key={change.field} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-medium">{change.field}</span>
                  {change.similarity !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(change.similarity * 100)}% similar
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  {typeof change.left_value === 'string' && typeof change.right_value === 'string' ? (
                    <InlineDiff
                      leftText={String(change.left_value).slice(0, 200)}
                      rightText={String(change.right_value).slice(0, 200)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-red-600 dark:text-red-400 block mb-1">Before:</span>
                        <JsonViewer data={change.left_value} defaultExpanded={1} />
                      </div>
                      <div>
                        <span className="text-xs text-green-600 dark:text-green-400 block mb-1">After:</span>
                        <JsonViewer data={change.right_value} defaultExpanded={1} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unchanged fields */}
      {diff.unchanged_fields.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Unchanged Fields ({diff.unchanged_fields.length})
          </h3>
          <div className="text-sm text-muted-foreground">
            {diff.unchanged_fields.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Summary of field changes
 */
function FieldChangeSummary({ diff }: { diff: NonNullable<ReturnType<typeof useDocumentComparison>['data']>['diff'] }) {
  const totalChanges = diff.added_fields.length + diff.removed_fields.length + diff.changed_fields.length;

  if (totalChanges === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Documents are identical
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {diff.added_fields.map((field) => (
        <span key={field} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
          +{field}
        </span>
      ))}
      {diff.removed_fields.map((field) => (
        <span key={field} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full line-through">
          {field}
        </span>
      ))}
      {diff.changed_fields.map((change) => (
        <span key={change.field} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
          ~{change.field}
        </span>
      ))}
    </div>
  );
}
