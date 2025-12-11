'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Command, FileText, X, Calendar, Hash, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  source?: string;
}

interface SourceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  selectedId: string | null;
  onSelect: (docId: string) => void;
  isLoading?: boolean;
}

export function SourceSelector({
  isOpen,
  onClose,
  documents,
  selectedId,
  onSelect,
  isLoading = false,
}: SourceSelectorProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!query) return documents;
    const lowerQuery = query.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.source?.toLowerCase().includes(lowerQuery)
    );
  }, [documents, query]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredDocuments.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredDocuments.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredDocuments.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredDocuments.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredDocuments[selectedIndex]) {
            onSelect(filteredDocuments[selectedIndex].id);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredDocuments, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command palette */}
      <div
        className={cn(
          'relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl',
          'border border-neutral-200 dark:border-neutral-800',
          'animate-in fade-in zoom-in-95 duration-150'
        )}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <Command className="w-4 h-4 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className={cn(
              'flex-1 bg-transparent text-sm outline-none',
              'text-neutral-900 dark:text-neutral-100',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'
            )}
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="sm:hidden p-1 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              {query ? 'No documents found' : 'No documents available'}
            </div>
          ) : (
            filteredDocuments.map((doc, index) => (
              <button
                key={doc.id}
                onClick={() => {
                  onSelect(doc.id);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                  doc.id === selectedId && 'ring-1 ring-inset ring-blue-200 dark:ring-blue-800'
                )}
              >
                <FileText
                  className={cn(
                    'w-5 h-5 flex-shrink-0',
                    index === selectedIndex
                      ? 'text-blue-500'
                      : 'text-neutral-400'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      index === selectedIndex
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-neutral-900 dark:text-neutral-100'
                    )}
                  >
                    {doc.title.replace(' (Cleaned)', '').replace('_raw', '')}
                  </p>
                  {doc.source && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {doc.source}
                    </p>
                  )}
                </div>
                {doc.id === selectedId && (
                  <span className="text-xs text-blue-500 font-medium">
                    Current
                  </span>
                )}
                {index === selectedIndex && (
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredDocuments.length} documents</span>
        </div>
      </div>
    </div>
  );
}

