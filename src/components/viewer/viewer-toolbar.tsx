'use client';

import { Search, Command, Sparkles, Copy, Download, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ViewerToolbarProps {
  onOpenSearch: () => void;
  onOpenSourceSelector: () => void;
  onToggleEntitySpotlight: () => void;
  entitySpotlightEnabled: boolean;
  entityCount: number;
  content: string | null;
  hasDocument: boolean;
}

export function ViewerToolbar({
  onOpenSearch,
  onOpenSourceSelector,
  onToggleEntitySpotlight,
  entitySpotlightEnabled,
  entityCount,
  content,
  hasDocument,
}: ViewerToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Entity spotlight toggle */}
      {hasDocument && (
        <button
          onClick={onToggleEntitySpotlight}
          className={cn(
            'relative flex items-center gap-2 px-3 py-2 rounded-full',
            'bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700',
            'transition-all duration-200',
            entitySpotlightEnabled && 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-neutral-900'
          )}
          title="Toggle entity spotlight (⌘E)"
        >
          <Sparkles
            className={cn(
              'w-4 h-4',
              entitySpotlightEnabled
                ? 'text-violet-500'
                : 'text-neutral-400'
            )}
          />
          {entitySpotlightEnabled && entityCount > 0 && (
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
              {entityCount}
            </span>
          )}
        </button>
      )}

      {/* Copy button */}
      {hasDocument && (
        <button
          onClick={handleCopy}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700',
            'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
            'transition-all duration-200'
          )}
          title="Copy text"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Download button */}
      {hasDocument && (
        <button
          onClick={handleDownload}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700',
            'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
            'transition-all duration-200'
          )}
          title="Download as text file"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {/* Search button */}
      {hasDocument && (
        <button
          onClick={onOpenSearch}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700',
            'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
            'transition-all duration-200'
          )}
          title="Search (⌘F)"
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      {/* Source selector button */}
      <button
        onClick={onOpenSourceSelector}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full',
          'bg-neutral-900 dark:bg-white shadow-lg',
          'text-white dark:text-neutral-900',
          'hover:bg-neutral-800 dark:hover:bg-neutral-100',
          'transition-all duration-200'
        )}
        title="Browse documents (⌘K)"
      >
        <Command className="w-4 h-4" />
        <span className="text-sm font-medium">⌘K</span>
      </button>
    </div>
  );
}

