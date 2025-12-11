'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Database, FolderOpen, FileText, Search, X, Table, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewerDatabases, useViewerCollections } from '@/hooks/use-viewer-data';
import type { ViewerCollectionInfo, RendererType } from '@/types/viewer-api';

interface DatabaseBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (db: string, collection: string, renderer: RendererType) => void;
  currentDatabase: string | null;
  currentCollection: string | null;
}

const RENDERER_ICONS = {
  long_text: FileText,
  json: FolderOpen,
  table: Table,
};

const RENDERER_COLORS = {
  long_text: 'text-blue-500',
  json: 'text-purple-500',
  table: 'text-green-500',
};

export function DatabaseBrowser({
  open,
  onOpenChange,
  onSelect,
  currentDatabase,
  currentCollection,
}: DatabaseBrowserProps) {
  const [expandedDb, setExpandedDb] = useState<string | null>(currentDatabase || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: databasesData, isLoading: dbLoading, error: dbError } = useViewerDatabases();
  const { data: collectionsData, isLoading: collLoading, error: collError } = useViewerCollections(expandedDb);

  // Filter databases by search
  const filteredDatabases = useMemo(() => {
    if (!databasesData?.databases) return [];
    if (!searchQuery) return databasesData.databases;
    
    const query = searchQuery.toLowerCase();
    return databasesData.databases.filter(
      db => db.name.toLowerCase().includes(query)
    );
  }, [databasesData, searchQuery]);

  // Filter collections by search
  const filteredCollections = useMemo(() => {
    if (!collectionsData?.collections) return [];
    if (!searchQuery) return collectionsData.collections;
    
    const query = searchQuery.toLowerCase();
    return collectionsData.collections.filter(
      coll => coll.name.toLowerCase().includes(query)
    );
  }, [collectionsData, searchQuery]);

  // Build flat list for keyboard navigation
  const navigationItems = useMemo(() => {
    const items: Array<{ type: 'db'; db: string } | { type: 'coll'; db: string; coll: ViewerCollectionInfo }> = [];
    
    filteredDatabases.forEach(db => {
      items.push({ type: 'db', db: db.name });
      if (expandedDb === db.name) {
        filteredCollections.forEach(coll => {
          items.push({ type: 'coll', db: db.name, coll });
        });
      }
    });
    
    return items;
  }, [filteredDatabases, filteredCollections, expandedDb]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [navigationItems.length, searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && navigationItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, navigationItems.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onOpenChange(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < navigationItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          const item = navigationItems[selectedIndex];
          if (item) {
            if (item.type === 'db') {
              setExpandedDb(expandedDb === item.db ? null : item.db);
            } else {
              onSelect(item.db, item.coll.name, item.coll.suggested_renderer);
              onOpenChange(false);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, navigationItems, selectedIndex, expandedDb, onSelect, onOpenChange]);

  if (!open) return null;

  const error = dbError || collError;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search header */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search databases and collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
            autoFocus
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded">
            ESC
          </kbd>
          <button
            onClick={() => onOpenChange(false)}
            className="sm:hidden p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error instanceof Error ? error.message : 'Failed to load data'}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {dbLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          ) : filteredDatabases.length === 0 ? (
            <div className="text-center p-8 text-neutral-500">
              {searchQuery ? 'No databases found' : 'No databases available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDatabases.map((db) => {
                const dbIndex = navigationItems.findIndex(
                  item => item.type === 'db' && item.db === db.name
                );
                
                return (
                  <div key={db.name}>
                    {/* Database row */}
                    <button
                      data-index={dbIndex}
                      onClick={() => setExpandedDb(expandedDb === db.name ? null : db.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        expandedDb === db.name && 'bg-neutral-100 dark:bg-neutral-800',
                        selectedIndex === dbIndex && 'ring-2 ring-blue-500 ring-inset'
                      )}
                    >
                      <Database className="w-4 h-4 text-neutral-500" />
                      <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                        {db.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {db.collections} collections · {db.total_documents.toLocaleString()} docs
                      </span>
                    </button>

                    {/* Collections (when expanded) */}
                    {expandedDb === db.name && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {collLoading ? (
                          <div className="p-2 text-sm text-neutral-500 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                            Loading collections...
                          </div>
                        ) : filteredCollections.length === 0 ? (
                          <div className="p-2 text-sm text-neutral-500">No collections</div>
                        ) : (
                          filteredCollections.map((coll) => {
                            const collIndex = navigationItems.findIndex(
                              item => item.type === 'coll' && item.db === db.name && item.coll.name === coll.name
                            );
                            const Icon = RENDERER_ICONS[coll.suggested_renderer];
                            const colorClass = RENDERER_COLORS[coll.suggested_renderer];
                            const isSelected = currentDatabase === db.name && currentCollection === coll.name;
                            
                            return (
                              <button
                                key={coll.name}
                                data-index={collIndex}
                                onClick={() => {
                                  onSelect(db.name, coll.name, coll.suggested_renderer);
                                  onOpenChange(false);
                                }}
                                className={cn(
                                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                                  isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                                  selectedIndex === collIndex && 'ring-2 ring-blue-500 ring-inset'
                                )}
                              >
                                <Icon className={cn('w-4 h-4', colorClass)} />
                                <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">
                                  {coll.name}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  {coll.document_count.toLocaleString()}
                                </span>
                                {isSelected && (
                                  <span className="text-xs text-blue-500 font-medium">Current</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
          <span>{filteredDatabases.length} databases</span>
        </div>
      </div>
    </div>
  );
}
