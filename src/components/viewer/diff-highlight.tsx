'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TextChange } from '@/types/iteration-api';

interface DiffHighlightProps {
  text: string;
  changes: TextChange[];
  side: 'left' | 'right';
  className?: string;
}

interface DiffSegment {
  text: string;
  type: 'equal' | 'insert' | 'delete' | 'replace';
  start: number;
  end: number;
}

/**
 * Component to render text with diff highlighting
 * Shows insertions (green), deletions (red), and replacements (yellow)
 */
export function DiffHighlight({ text, changes, side, className }: DiffHighlightProps) {
  const segments = useMemo(() => {
    if (!changes || changes.length === 0) {
      return [{ text, type: 'equal' as const, start: 0, end: text.length }];
    }

    const result: DiffSegment[] = [];
    let lastEnd = 0;

    // Sort changes by position
    const sortedChanges = [...changes].sort((a, b) => {
      const posA = side === 'left' 
        ? (a.position?.[0] ?? a.left_position?.[0] ?? 0)
        : (a.position?.[0] ?? a.right_position?.[0] ?? 0);
      const posB = side === 'left'
        ? (b.position?.[0] ?? b.left_position?.[0] ?? 0)
        : (b.position?.[0] ?? b.right_position?.[0] ?? 0);
      return posA - posB;
    });

    for (const change of sortedChanges) {
      const position = side === 'left'
        ? (change.position ?? change.left_position)
        : (change.position ?? change.right_position);
      
      if (!position) continue;
      
      const [start, end] = position;

      // Add text before the change
      if (start > lastEnd) {
        result.push({
          text: text.slice(lastEnd, start),
          type: 'equal',
          start: lastEnd,
          end: start,
        });
      }

      // Determine the type for this side
      let segmentType: DiffSegment['type'];
      if (change.type === 'replace') {
        segmentType = 'replace';
      } else if (change.type === 'insert') {
        segmentType = side === 'right' ? 'insert' : 'equal';
      } else if (change.type === 'delete') {
        segmentType = side === 'left' ? 'delete' : 'equal';
      } else {
        segmentType = 'equal';
      }

      // Add the changed text
      if (segmentType !== 'equal' || end > start) {
        const changeText = side === 'left'
          ? (change.text ?? change.left_text ?? text.slice(start, end))
          : (change.text ?? change.right_text ?? text.slice(start, end));
        
        if (changeText) {
          result.push({
            text: changeText,
            type: segmentType,
            start,
            end,
          });
        }
      }

      lastEnd = end;
    }

    // Add remaining text
    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        type: 'equal',
        start: lastEnd,
        end: text.length,
      });
    }

    return result;
  }, [text, changes, side]);

  return (
    <div className={cn('font-mono text-sm whitespace-pre-wrap', className)}>
      {segments.map((segment, index) => (
        <DiffSegmentSpan key={index} segment={segment} />
      ))}
    </div>
  );
}

function DiffSegmentSpan({ segment }: { segment: DiffSegment }) {
  const baseClasses = 'px-0.5 rounded-sm';
  
  switch (segment.type) {
    case 'insert':
      return (
        <span 
          className={cn(baseClasses, 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300')}
          title="Added"
        >
          {segment.text}
        </span>
      );
    case 'delete':
      return (
        <span 
          className={cn(baseClasses, 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 line-through')}
          title="Removed"
        >
          {segment.text}
        </span>
      );
    case 'replace':
      return (
        <span 
          className={cn(baseClasses, 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300')}
          title="Changed"
        >
          {segment.text}
        </span>
      );
    default:
      return <span>{segment.text}</span>;
  }
}

/**
 * Inline diff for showing changes in a single line
 */
interface InlineDiffProps {
  leftText: string;
  rightText: string;
  className?: string;
}

export function InlineDiff({ leftText, rightText, className }: InlineDiffProps) {
  if (leftText === rightText) {
    return <span className={className}>{leftText}</span>;
  }

  return (
    <span className={cn('font-mono text-sm', className)}>
      <span className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 line-through mr-1">
        {leftText}
      </span>
      <span className="mx-1 text-neutral-400">→</span>
      <span className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 ml-1">
        {rightText}
      </span>
    </span>
  );
}

/**
 * Badge showing change statistics
 */
interface DiffStatsBadgeProps {
  addedFields: number;
  removedFields: number;
  changedFields: number;
  similarity: number;
  className?: string;
}

export function DiffStatsBadge({
  addedFields,
  removedFields,
  changedFields,
  similarity,
  className,
}: DiffStatsBadgeProps) {
  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <span className="flex items-center gap-1">
        <span className="font-medium">{Math.round(similarity * 100)}%</span>
        <span className="text-muted-foreground">similar</span>
      </span>
      
      {addedFields > 0 && (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <span className="font-medium">+{addedFields}</span>
          <span className="text-muted-foreground">fields</span>
        </span>
      )}
      
      {removedFields > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <span className="font-medium">-{removedFields}</span>
          <span className="text-muted-foreground">fields</span>
        </span>
      )}
      
      {changedFields > 0 && (
        <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <span className="font-medium">~{changedFields}</span>
          <span className="text-muted-foreground">changed</span>
        </span>
      )}
    </div>
  );
}


