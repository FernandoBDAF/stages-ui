'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertCircle, Circle, CheckCircle2 } from 'lucide-react';
import type { TimelineEntry as TimelineEntryType } from '@/types/iteration-api';

interface TimelineEntryProps {
  entry: TimelineEntryType;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onCompareWith?: (docId: string) => void;
}

/**
 * Individual timeline entry showing a document version
 * Features:
 * - Version badge with timestamp
 * - Stage status indicators
 * - Selection state for comparison
 */
export function TimelineEntry({
  entry,
  isSelected,
  isFirst,
  isLast,
  onSelect,
}: TimelineEntryProps) {
  const formatTimestamp = (ts: string | null | undefined): string => {
    // Handle missing or invalid timestamp
    if (!ts || ts === 'unknown' || ts === '') {
      return 'No date';
    }
    
    const date = new Date(ts);
    
    // Check if date is valid (Invalid Date returns NaN for getTime())
    if (isNaN(date.getTime())) {
      return ts; // Return original string as fallback
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col items-center">
      {/* Connection line to previous */}
      {!isFirst && (
        <div className="w-0.5 h-4 bg-neutral-200 dark:bg-neutral-700" />
      )}
      
      {/* Entry card */}
      <button
        onClick={onSelect}
        className={cn(
          'relative flex flex-col items-center p-3 rounded-lg border-2 transition-all',
          'hover:bg-neutral-50 dark:hover:bg-neutral-800',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-neutral-200 dark:border-neutral-700'
        )}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}

        {/* Version badge */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        )}>
          v{entry.version}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground mt-2 whitespace-nowrap">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Stage status indicators */}
        {entry.stage_status && Object.keys(entry.stage_status).length > 0 && (
          <div className="flex gap-1 mt-2">
            {Object.entries(entry.stage_status).map(([stage, status]) => (
              <StageStatusDot key={stage} stage={stage} status={status} />
            ))}
          </div>
        )}

        {/* Changes from previous */}
        {entry.changes_from_previous && (
          <div className="text-[10px] text-muted-foreground mt-1">
            {Math.round(entry.changes_from_previous.similarity * 100)}% similar
          </div>
        )}
      </button>

      {/* Connection line to next */}
      {!isLast && (
        <div className="w-0.5 h-4 bg-neutral-200 dark:bg-neutral-700" />
      )}
    </div>
  );
}

/**
 * Stage status indicator dot
 */
function StageStatusDot({ stage, status }: { stage: string; status: string }) {
  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'success':
        return 'text-green-500';
      case 'pending':
      case 'waiting':
        return 'text-yellow-500';
      case 'failed':
      case 'error':
        return 'text-red-500';
      case 'running':
      case 'in_progress':
        return 'text-blue-500';
      default:
        return 'text-neutral-400';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'success':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'pending':
      case 'waiting':
        return <Clock className="w-3 h-3" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div
      className={cn('transition-colors', getStatusColor(status))}
      title={`${stage}: ${status}`}
    >
      {getStatusIcon(status)}
    </div>
  );
}

/**
 * Horizontal timeline entry for wide layouts - Enhanced version
 * Features:
 * - Larger clickable areas with smooth hover states
 * - Animated selection ring with pulse effect
 * - Rich tooltip on hover
 * - Progress indicator between versions
 */
interface HorizontalTimelineEntryProps {
  entry: TimelineEntryType;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  showConnector?: boolean;
  similarity?: number; // Similarity to next version (0-1)
}

export function HorizontalTimelineEntry({
  entry,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  showConnector = true,
  similarity,
}: HorizontalTimelineEntryProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && buttonRef.current) {
      buttonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isSelected]);

  const formatTimestamp = (ts: string | null | undefined): { date: string; time: string; full: string } => {
    if (!ts || ts === 'unknown' || ts === '') {
      return { date: 'No date', time: '', full: 'No timestamp available' };
    }
    
    const date = new Date(ts);
    
    if (isNaN(date.getTime())) {
      return { date: ts, time: '', full: ts };
    }
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    };
  };

  const { date, time, full } = formatTimestamp(entry.timestamp);

  // Calculate connector gradient based on similarity
  const getConnectorStyle = () => {
    if (similarity !== undefined) {
      // Green for high similarity, orange for medium, red for low
      const hue = similarity * 120; // 0 = red, 60 = yellow, 120 = green
      return {
        background: `linear-gradient(90deg, hsl(${hue}, 70%, 50%), hsl(${hue}, 70%, 60%))`,
        opacity: 0.8 + similarity * 0.2,
      };
    }
    return {};
  };

  return (
    <div className="flex items-center group">
      {/* Connection line from previous with gradient */}
      {!isFirst && showConnector && (
        <div 
          className={cn(
            'h-1 w-10 sm:w-14 rounded-full transition-all duration-300',
            'bg-gradient-to-r from-neutral-300 to-neutral-200',
            'dark:from-neutral-600 dark:to-neutral-700',
            'group-hover:from-primary/40 group-hover:to-primary/20'
          )}
          style={getConnectorStyle()}
        />
      )}
      
      {/* Entry */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={onSelect}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={cn(
            'relative flex flex-col items-center p-2 rounded-xl min-w-[90px]',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            isSelected
              ? 'scale-110 z-10'
              : 'hover:scale-105 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50'
          )}
        >
          {/* Animated selection ring */}
          {isSelected && (
            <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse" />
          )}

          {/* Dot/Version indicator */}
          <div className={cn(
            'relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
            'transition-all duration-300 ease-out',
            'shadow-sm',
            isSelected
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
            !isSelected && 'group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700'
          )}>
            {/* Pulse ring on selected */}
            {isSelected && (
              <>
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <span className="absolute -inset-1 rounded-full border-2 border-primary/30 animate-pulse" />
              </>
            )}
            <span className="relative z-10">{entry.version}</span>
          </div>

          {/* Labels below */}
          <div className="mt-2 text-center">
            <div className={cn(
              'text-xs font-medium transition-colors',
              isSelected ? 'text-primary' : 'text-neutral-700 dark:text-neutral-300'
            )}>
              {time || date}
            </div>
          </div>

          {/* Stage status indicators */}
          {entry.stage_status && Object.keys(entry.stage_status).length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {Object.entries(entry.stage_status).map(([stage, status]) => (
                <StageStatusDot key={stage} stage={stage} status={status} />
              ))}
            </div>
          )}

          {/* Similarity indicator */}
          {entry.changes_from_previous && (
            <div className={cn(
              'mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              entry.changes_from_previous.similarity >= 0.8
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : entry.changes_from_previous.similarity >= 0.5
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {Math.round(entry.changes_from_previous.similarity * 100)}%
            </div>
          )}
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
            'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900',
            'px-3 py-2 rounded-lg shadow-xl text-xs',
            'whitespace-nowrap pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}>
            <div className="font-semibold mb-1">Version {entry.version}</div>
            <div className="text-neutral-300 dark:text-neutral-600">{full}</div>
            {entry.stage_status && Object.keys(entry.stage_status).length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-neutral-700 dark:border-neutral-300">
                {Object.entries(entry.stage_status).map(([stage, status]) => (
                  <div key={stage} className="flex items-center gap-1.5">
                    <StageStatusDot stage={stage} status={status} />
                    <span className="capitalize">{stage}:</span>
                    <span className="text-neutral-400 dark:text-neutral-500">{status}</span>
                  </div>
                ))}
              </div>
            )}
            {entry.changes_from_previous && (
              <div className="mt-1.5 pt-1.5 border-t border-neutral-700 dark:border-neutral-300">
                <span className="text-neutral-400 dark:text-neutral-500">
                  {Math.round(entry.changes_from_previous.similarity * 100)}% similar to previous
                </span>
              </div>
            )}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
          </div>
        )}
      </div>

      {/* Connection line to next with gradient */}
      {!isLast && showConnector && (
        <div 
          className={cn(
            'h-1 w-10 sm:w-14 rounded-full transition-all duration-300',
            'bg-gradient-to-r from-neutral-200 to-neutral-300',
            'dark:from-neutral-700 dark:to-neutral-600',
            'group-hover:from-primary/20 group-hover:to-primary/40'
          )}
        />
      )}
    </div>
  );
}

