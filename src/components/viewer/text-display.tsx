'use client';

import { useRef, forwardRef } from 'react';
import type { DocumentContent, FontSize, FontFamily, LineWidth, DetectedEntity, SearchMatch } from '@/types/viewer';
import { HighlightedText } from './entity-highlighter';
import { cn } from '@/lib/utils';

interface TextDisplayProps {
  content: string | null;
  title?: string;
  metadata?: DocumentContent['metadata'];
  fontSize: FontSize;
  fontFamily: FontFamily;
  lineWidth: LineWidth;
  entities: DetectedEntity[];
  searchMatches: SearchMatch[];
  currentMatchIndex: number;
  entitySpotlightEnabled: boolean;
  label?: string;
  className?: string;
}

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  sm: 'text-sm leading-relaxed',
  md: 'text-base leading-relaxed',
  lg: 'text-lg leading-loose',
  xl: 'text-xl leading-loose',
};

const FONT_FAMILY_CLASSES: Record<FontFamily, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

const LINE_WIDTH_CLASSES: Record<LineWidth, string> = {
  narrow: 'max-w-xl',
  normal: 'max-w-2xl',
  wide: 'max-w-4xl',
};

export const TextDisplay = forwardRef<HTMLDivElement, TextDisplayProps>(
  function TextDisplay(
    {
      content,
      title,
      metadata,
      fontSize,
      fontFamily,
      lineWidth,
      entities,
      searchMatches,
      currentMatchIndex,
      entitySpotlightEnabled,
      label,
      className,
    },
    ref
  ) {
    if (!content) {
      return (
        <div
          className={cn(
            'flex-1 flex items-center justify-center text-neutral-400 dark:text-neutral-500',
            className
          )}
        >
          <p className="text-sm">No content available</p>
        </div>
      );
    }

    // Split content into paragraphs
    const paragraphs = content.split(/\n\n+/).filter(Boolean);

    return (
      <div
        ref={ref}
        className={cn(
          'flex-1 overflow-y-auto scroll-smooth',
          className
        )}
      >
        <div className={cn('mx-auto px-6 py-8', LINE_WIDTH_CLASSES[lineWidth])}>
          {/* Label for split view */}
          {label && (
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {label}
              </span>
            </div>
          )}

          {/* Title */}
          {title && (
            <h1
              className={cn(
                'font-semibold text-neutral-900 dark:text-neutral-100 mb-2',
                fontSize === 'sm' && 'text-lg',
                fontSize === 'md' && 'text-xl',
                fontSize === 'lg' && 'text-2xl',
                fontSize === 'xl' && 'text-3xl',
                FONT_FAMILY_CLASSES[fontFamily]
              )}
            >
              {title.replace(' (Cleaned)', '')}
            </h1>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              {metadata.source && (
                <span className="flex items-center gap-1">
                  {metadata.source}
                </span>
              )}
              <span>·</span>
              <span>{metadata.word_count.toLocaleString()} words</span>
              <span>·</span>
              <span>
                {new Date(metadata.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Divider */}
          {(title || metadata) && (
            <hr className="border-neutral-200 dark:border-neutral-800 mb-8" />
          )}

          {/* Content */}
          <div
            className={cn(
              'text-neutral-800 dark:text-neutral-200',
              FONT_SIZE_CLASSES[fontSize],
              FONT_FAMILY_CLASSES[fontFamily]
            )}
          >
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="paragraph mb-6 last:mb-0">
                <HighlightedText
                  text={paragraph}
                  entities={entities.filter(
                    (e) =>
                      // Adjust entity positions relative to paragraph
                      // This is a simplified approach - for accurate highlighting,
                      // we'd need to track global positions
                      paragraph.includes(e.text)
                  ).map((e) => ({
                    ...e,
                    startIndex: paragraph.indexOf(e.text),
                    endIndex: paragraph.indexOf(e.text) + e.text.length,
                  }))}
                  searchMatches={searchMatches.filter((m) => {
                    // Check if match is within this paragraph
                    const paragraphText = paragraph;
                    const matchText = content.slice(m.startIndex, m.endIndex);
                    return paragraphText.includes(matchText);
                  }).map((m) => {
                    const matchText = content.slice(m.startIndex, m.endIndex);
                    const localStart = paragraph.indexOf(matchText);
                    return {
                      ...m,
                      startIndex: localStart,
                      endIndex: localStart + matchText.length,
                    };
                  })}
                  currentMatchIndex={currentMatchIndex}
                  entitySpotlightEnabled={entitySpotlightEnabled}
                />
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

