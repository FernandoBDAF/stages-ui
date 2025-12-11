'use client';

import { useMemo } from 'react';
import type { DetectedEntity, EntityType, SearchMatch } from '@/types/viewer';
import { cn } from '@/lib/utils';

interface HighlightedTextProps {
  text: string;
  entities: DetectedEntity[];
  searchMatches: SearchMatch[];
  currentMatchIndex: number;
  entitySpotlightEnabled: boolean;
  className?: string;
}

type HighlightType = 'search-current' | 'search' | EntityType;

interface TextSegment {
  text: string;
  type: HighlightType | null;
  isCurrentMatch: boolean;
}

const ENTITY_COLORS: Record<EntityType, { bg: string; text: string }> = {
  person: {
    bg: 'bg-blue-100/70 dark:bg-blue-900/40',
    text: 'text-blue-800 dark:text-blue-200',
  },
  place: {
    bg: 'bg-emerald-100/70 dark:bg-emerald-900/40',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  concept: {
    bg: 'bg-violet-100/70 dark:bg-violet-900/40',
    text: 'text-violet-800 dark:text-violet-200',
  },
  date: {
    bg: 'bg-amber-100/70 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
  },
};

export function HighlightedText({
  text,
  entities,
  searchMatches,
  currentMatchIndex,
  entitySpotlightEnabled,
  className,
}: HighlightedTextProps) {
  const segments = useMemo(() => {
    if (!text) return [];

    // Collect all highlight ranges
    const highlights: { start: number; end: number; type: HighlightType; priority: number }[] = [];

    // Add search matches (higher priority)
    searchMatches.forEach((match, index) => {
      highlights.push({
        start: match.startIndex,
        end: match.endIndex,
        type: index === currentMatchIndex ? 'search-current' : 'search',
        priority: index === currentMatchIndex ? 2 : 1,
      });
    });

    // Add entities (lower priority)
    if (entitySpotlightEnabled) {
      entities.forEach((entity) => {
        highlights.push({
          start: entity.startIndex,
          end: entity.endIndex,
          type: entity.type,
          priority: 0,
        });
      });
    }

    // Sort by start position, then by priority (higher priority wins on overlap)
    highlights.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.priority - a.priority;
    });

    // Build segments
    const result: TextSegment[] = [];
    let currentIndex = 0;

    for (const highlight of highlights) {
      // Skip if this highlight starts before current position (overlap)
      if (highlight.start < currentIndex) continue;

      // Add plain text before this highlight
      if (highlight.start > currentIndex) {
        result.push({
          text: text.slice(currentIndex, highlight.start),
          type: null,
          isCurrentMatch: false,
        });
      }

      // Add highlighted text
      result.push({
        text: text.slice(highlight.start, highlight.end),
        type: highlight.type,
        isCurrentMatch: highlight.type === 'search-current',
      });

      currentIndex = highlight.end;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      result.push({
        text: text.slice(currentIndex),
        type: null,
        isCurrentMatch: false,
      });
    }

    return result;
  }, [text, entities, searchMatches, currentMatchIndex, entitySpotlightEnabled]);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (!segment.type) {
          return <span key={index}>{segment.text}</span>;
        }

        if (segment.type === 'search-current') {
          return (
            <mark
              key={index}
              className="bg-yellow-400 dark:bg-yellow-500 text-neutral-900 rounded-sm px-0.5 ring-2 ring-yellow-500"
            >
              {segment.text}
            </mark>
          );
        }

        if (segment.type === 'search') {
          return (
            <mark
              key={index}
              className="bg-yellow-200/80 dark:bg-yellow-700/50 text-inherit rounded-sm px-0.5"
            >
              {segment.text}
            </mark>
          );
        }

        // Entity highlight
        const colors = ENTITY_COLORS[segment.type as EntityType];
        return (
          <span
            key={index}
            className={cn(
              'rounded-sm px-0.5 py-0.5 transition-colors cursor-default',
              colors.bg,
              colors.text
            )}
            title={`${segment.type.charAt(0).toUpperCase() + segment.type.slice(1)}: ${segment.text}`}
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}

// Entity legend component
export function EntityLegend({ counts }: { counts: Record<EntityType, number> }) {
  const items: { type: EntityType; label: string }[] = [
    { type: 'person', label: 'People' },
    { type: 'place', label: 'Places' },
    { type: 'concept', label: 'Concepts' },
    { type: 'date', label: 'Dates' },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-3 h-3 rounded-sm',
              ENTITY_COLORS[type].bg
            )}
          />
          <span className="text-neutral-600 dark:text-neutral-400">
            {label}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500">
            ({counts[type]})
          </span>
        </div>
      ))}
    </div>
  );
}

