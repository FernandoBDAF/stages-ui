'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, GitCompare, History, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { TimelineSkeleton } from './skeleton-loaders';
import { cn } from '@/lib/utils';
import { useDocumentTimeline } from '@/hooks/use-iteration';
import { HorizontalTimelineEntry } from './timeline-entry';
import { Button } from '@/components/ui/button';
import type { TimelineEntry } from '@/types/iteration-api';

/**
 * Group timeline entries by date
 */
interface DateGroup {
  date: string;
  dateLabel: string;
  entries: TimelineEntry[];
}

function groupEntriesByDate(entries: TimelineEntry[]): DateGroup[] {
  const groups = new Map<string, TimelineEntry[]>();
  
  for (const entry of entries) {
    const dateKey = getDateKey(entry.timestamp);
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, entry]);
  }
  
  // Convert to array and sort by date (newest first in each group, groups ordered oldest to newest)
  return Array.from(groups.entries())
    .map(([date, entries]) => ({
      date,
      dateLabel: formatDateLabel(date),
      entries: entries.sort((a, b) => (a.version || 0) - (b.version || 0)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getDateKey(timestamp: string | null | undefined): string {
  if (!timestamp || timestamp === 'unknown' || timestamp === '') {
    return 'unknown';
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return 'unknown';
  }
  
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateLabel(dateKey: string): string {
  if (dateKey === 'unknown') {
    return 'Unknown Date';
  }
  
  const date = new Date(dateKey + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

interface TimelineViewProps {
  dbName: string;
  collection: string;
  sourceId: string;
  sourceField?: string;
  onCompare: (id1: string, id2: string) => void;
  onSelectVersion?: (docId: string) => void;
  onClose: () => void;
  className?: string;
}

/**
 * Document version timeline view
 * Features:
 * - Visual timeline with connected markers
 * - Multi-select for comparison (select 2 versions)
 * - Stage status indicators
 * - "Compare Selected" button
 */
export function TimelineView({
  dbName,
  collection,
  sourceId,
  sourceField,
  onCompare,
  onSelectVersion,
  onClose,
  className,
}: TimelineViewProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  
  const { data, isLoading, error } = useDocumentTimeline(
    dbName,
    collection,
    sourceId,
    sourceField
  );

  const handleVersionSelect = (docId: string) => {
    setSelectedVersions(prev => {
      // If already selected, deselect
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      }
      // If we already have 2, replace the first
      if (prev.length >= 2) {
        return [prev[1], docId];
      }
      // Add to selection
      return [...prev, docId];
    });
    
    // Also call the select callback
    onSelectVersion?.(docId);
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      onCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  // Get selected entries for display
  const selectedEntries = useMemo(() => {
    if (!data?.timeline) return [];
    return selectedVersions
      .map(id => data.timeline.find((e: TimelineEntry) => e.doc_id === id))
      .filter(Boolean) as TimelineEntry[];
  }, [data, selectedVersions]);

  // Group entries by date
  const dateGroups = useMemo(() => {
    if (!data?.timeline) return [];
    return groupEntriesByDate(data.timeline);
  }, [data]);

  // Timeline scroll ref and navigation
  const timelineRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  useEffect(() => {
    const checkScroll = () => {
      if (timelineRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };
    
    checkScroll();
    const ref = timelineRef.current;
    ref?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    return () => {
      ref?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [data]);

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (timelineRef.current) {
      const scrollAmount = timelineRef.current.clientWidth * 0.6;
      timelineRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error || !data) {
    return (
      <div className={cn('p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Document Timeline
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error instanceof Error ? error.message : 'Failed to load timeline'}
        </div>
      </div>
    );
  }

  if (data.timeline.length === 0) {
    return (
      <div className={cn('p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Document Timeline
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-muted-foreground text-center py-8">
          No version history found for this document
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Timeline
          </h2>
          <span className="text-sm px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
            {data.total_versions} version{data.total_versions !== 1 ? 's' : ''}
          </span>
          {data.source_field && (
            <span className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono">
              {data.source_field}: {data.source_id.slice(0, 12)}...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Compare button */}
          <Button
            variant="default"
            size="sm"
            disabled={selectedVersions.length !== 2}
            onClick={handleCompare}
            className="gap-2 transition-all"
          >
            <GitCompare className="h-4 w-4" />
            Compare
          </Button>
          
          {/* Close button */}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection info bar */}
      {selectedVersions.length > 0 && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/20">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground font-medium">Selected:</span>
            <div className="flex items-center gap-1">
              {selectedEntries.map((entry, idx) => (
                <span key={entry.doc_id} className="flex items-center">
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-xs font-bold">
                    v{entry.version}
                  </span>
                  {idx === 0 && selectedEntries.length === 2 && (
                    <span className="text-primary mx-2 font-bold">→</span>
                  )}
                </span>
              ))}
            </div>
            {selectedVersions.length === 1 && (
              <span className="text-muted-foreground italic text-xs">
                Select another version to compare
              </span>
            )}
            <button
              onClick={() => setSelectedVersions([])}
              className="ml-auto text-xs px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Timeline with date groups */}
      <div className="relative flex-1">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTimeline('left')}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-20',
              'w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-lg',
              'flex items-center justify-center',
              'hover:bg-neutral-50 dark:hover:bg-neutral-700',
              'border border-neutral-200 dark:border-neutral-700',
              'transition-all hover:scale-105'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollTimeline('right')}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-20',
              'w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-lg',
              'flex items-center justify-center',
              'hover:bg-neutral-50 dark:hover:bg-neutral-700',
              'border border-neutral-200 dark:border-neutral-700',
              'transition-all hover:scale-105'
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Gradient overlays for scroll indication */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-neutral-950 to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-neutral-950 to-transparent z-10 pointer-events-none" />
        )}

        {/* Scrollable timeline area */}
        <div
          ref={timelineRef}
          className="overflow-x-auto overflow-y-hidden py-8 px-12 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex gap-8 min-w-max">
            {dateGroups.map((group, groupIdx) => (
              <div key={group.date} className="flex flex-col">
                {/* Date label */}
                <div className="mb-4 pb-2 border-b-2 border-neutral-200 dark:border-neutral-700">
                  <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    {group.dateLabel}
                  </h3>
                </div>

                {/* Entries for this date */}
                <div className="flex items-start">
                  {group.entries.map((entry, entryIdx) => {
                    // Calculate global index for first/last determination
                    const isGlobalFirst = groupIdx === 0 && entryIdx === 0;
                    const isGlobalLast = groupIdx === dateGroups.length - 1 && entryIdx === group.entries.length - 1;
                    const isGroupFirst = entryIdx === 0;
                    const isGroupLast = entryIdx === group.entries.length - 1;

                    return (
                      <HorizontalTimelineEntry
                        key={entry.doc_id}
                        entry={entry}
                        isSelected={selectedVersions.includes(entry.doc_id)}
                        isFirst={isGroupFirst}
                        isLast={isGroupLast}
                        onSelect={() => handleVersionSelect(entry.doc_id)}
                        showConnector={!isGlobalFirst || !isGroupFirst}
                        similarity={entry.changes_from_previous?.similarity}
                      />
                    );
                  })}
                  
                  {/* Connector to next group */}
                  {groupIdx < dateGroups.length - 1 && (
                    <div className="flex items-center self-center ml-4">
                      <div className="h-1 w-8 rounded-full bg-gradient-to-r from-neutral-300 via-primary/30 to-neutral-300 dark:from-neutral-600 dark:via-primary/30 dark:to-neutral-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with instructions */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <p className="text-xs text-muted-foreground text-center">
          <span className="font-medium">Tip:</span> Click any two versions to compare them. 
          {data.total_versions > 1 && (
            <span> Older versions appear on the left.</span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact timeline for inline display
 */
interface CompactTimelineProps {
  dbName: string;
  collection: string;
  sourceId: string;
  onVersionClick?: (docId: string) => void;
  className?: string;
}

export function CompactTimeline({
  dbName,
  collection,
  sourceId,
  onVersionClick,
  className,
}: CompactTimelineProps) {
  const { data, isLoading } = useDocumentTimeline(dbName, collection, sourceId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!data || data.timeline.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <History className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center">
        {data.timeline.slice(0, 5).map((entry: TimelineEntry, idx: number) => (
          <button
            key={entry.doc_id}
            onClick={() => onVersionClick?.(entry.doc_id)}
            className={cn(
              'w-6 h-6 rounded-full text-xs font-medium',
              'bg-neutral-100 dark:bg-neutral-800',
              'hover:bg-neutral-200 dark:hover:bg-neutral-700',
              'flex items-center justify-center',
              idx > 0 && '-ml-1'
            )}
            title={`Version ${entry.version}`}
          >
            {entry.version}
          </button>
        ))}
        {data.total_versions > 5 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{data.total_versions - 5}
          </span>
        )}
      </div>
    </div>
  );
}


