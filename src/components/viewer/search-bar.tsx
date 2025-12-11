'use client';

import { useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown, Regex } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  currentMatch: number;
  totalMatches: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isRegex: boolean;
  onToggleRegex: () => void;
}

export function SearchBar({
  isOpen,
  query,
  onQueryChange,
  currentMatch,
  totalMatches,
  onNext,
  onPrev,
  onClose,
  isRegex,
  onToggleRegex,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          onPrev();
        } else {
          onNext();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          onPrev();
        } else {
          onNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 inset-x-0 z-50 px-4 py-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="max-w-2xl mx-auto flex items-center gap-2">
        {/* Search icon */}
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search in document..."
          className={cn(
            'flex-1 bg-transparent text-sm outline-none',
            'text-neutral-900 dark:text-neutral-100',
            'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'
          )}
        />

        {/* Match count */}
        {query && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums flex-shrink-0">
            {totalMatches > 0 ? `${currentMatch + 1} of ${totalMatches}` : 'No matches'}
          </span>
        )}

        {/* Regex toggle */}
        <button
          onClick={onToggleRegex}
          className={cn(
            'p-1 rounded transition-colors',
            isRegex
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
          )}
          title="Toggle regex (.*)"
        >
          <Regex className="w-4 h-4" />
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onPrev}
            disabled={totalMatches === 0}
            className={cn(
              'p-1 rounded transition-colors',
              totalMatches > 0
                ? 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
            )}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={totalMatches === 0}
            className={cn(
              'p-1 rounded transition-colors',
              totalMatches > 0
                ? 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
            )}
            title="Next match (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

