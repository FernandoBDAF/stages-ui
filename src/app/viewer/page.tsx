'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FileText, Database, Code, Table as TableIcon, ChevronDown, 
  GitCompare, History, X 
} from 'lucide-react';

// Existing Components
import { ProgressBar } from '@/components/viewer/progress-bar';
import { SearchBar } from '@/components/viewer/search-bar';
import { TextDisplay } from '@/components/viewer/text-display';
import { TypographyControls } from '@/components/viewer/typography-controls';
import { ViewerToolbar } from '@/components/viewer/viewer-toolbar';
import { EntityLegend } from '@/components/viewer/entity-highlighter';

// New Viewer Components
import { DatabaseBrowser } from '@/components/viewer/database-browser';
import { JsonViewer } from '@/components/viewer/json-viewer';
import { TableViewer } from '@/components/viewer/table-viewer';
import { ChunksViewer } from '@/components/viewer/chunks-viewer';
import { EntityViewer } from '@/components/viewer/entity-viewer';
import { CommunityViewer } from '@/components/viewer/community-viewer';
import { TextListViewer } from '@/components/viewer/text-list-viewer';

// Iteration Components
import { ComparisonView } from '@/components/viewer/comparison-view';
import { TimelineView } from '@/components/viewer/timeline-view';
import { ComparePicker } from '@/components/viewer/compare-picker';
import { ViewerBreadcrumb } from '@/components/viewer/viewer-breadcrumb';
import { DocumentSkeleton, CollectionSkeleton } from '@/components/viewer/skeleton-loaders';
import { SelectionToolbar } from '@/components/viewer/selection-toolbar';

// UI Components
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks
import { useViewerSettings } from '@/hooks/use-viewer-settings';
import { useTextSearch } from '@/hooks/use-text-search';
import { useEntityDetection } from '@/hooks/use-entity-detection';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useCollectionQuery, useDocument } from '@/hooks/use-viewer-data';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/use-keyboard-shortcuts';

// Utils
import { selectRenderer, getAvailableRenderers, getRendererDisplayName, getSourceField } from '@/lib/viewer/renderer-selector';

// Types
import type { RendererType, SortOption } from '@/types/viewer-api';

// View modes
type ViewMode = 'browse' | 'compare' | 'timeline';

// Theme classes
const THEME_CLASSES = {
  light: 'bg-neutral-50 text-neutral-900',
  dark: 'bg-neutral-950 text-neutral-100',
  sepia: 'bg-[#F4ECD8] text-[#433422]',
};

export default function ViewerPage() {
  // ==========================================================================
  // URL Params & Router
  // ==========================================================================
  const searchParams = useSearchParams();
  const router = useRouter();

  // ==========================================================================
  // Data Selection State
  // ==========================================================================
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [currentRenderer, setCurrentRenderer] = useState<RendererType>('json');

  // Query state
  const [querySkip, setQuerySkip] = useState(0);
  const [queryLimit] = useState(20);
  const [querySort, setQuerySort] = useState<SortOption[]>([]);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ==========================================================================
  // View Mode State (compare/timeline)
  // ==========================================================================
  const [pageViewMode, setPageViewMode] = useState<ViewMode>('browse');
  const [compareDocIds, setCompareDocIds] = useState<[string, string] | null>(null);
  const [timelineSourceId, setTimelineSourceId] = useState<string | null>(null);

  // ==========================================================================
  // UI State (existing)
  // ==========================================================================
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isComparePickerOpen, setIsComparePickerOpen] = useState(false);

  // ==========================================================================
  // Multi-Select State
  // ==========================================================================
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // URL Param Effects - Single source of truth for view mode state
  // ==========================================================================
  useEffect(() => {
    const db = searchParams.get('db');
    const collection = searchParams.get('collection');
    const compare = searchParams.get('compare');
    const timeline = searchParams.get('timeline');
    const doc = searchParams.get('doc');

    // Update data selection state
    setSelectedDatabase(db);
    setSelectedCollection(collection);
    
    // Only set document ID if we have the required db and collection context
    // This prevents showing empty state when URL has doc but missing db/collection
    if (db && collection && doc) {
      setSelectedDocumentId(doc);
    } else if (!doc) {
      setSelectedDocumentId(null);
    }
    // If doc exists but db/collection missing, clear doc to show proper empty state
    else if (doc && (!db || !collection)) {
      setSelectedDocumentId(null);
    }

    // Determine view mode from URL - URL is the single source of truth
    if (compare && db && collection) {
      const ids = compare.split(',');
      if (ids.length === 2) {
        setCompareDocIds([ids[0], ids[1]]);
        setPageViewMode('compare');
      }
    } else if (timeline && db && collection) {
      setTimelineSourceId(timeline);
      setPageViewMode('timeline');
    } else {
      // Reset to browse mode when no compare/timeline params
      setCompareDocIds(null);
      setTimelineSourceId(null);
      setPageViewMode('browse');
    }
  }, [searchParams]);

  // ==========================================================================
  // Data Fetching
  // ==========================================================================
  
  // Fetch collection data
  const {
    data: collectionData,
    isLoading: isLoadingCollection,
    isFetching: isFetchingCollection,
  } = useCollectionQuery(selectedDatabase, selectedCollection, {
    skip: querySkip,
    limit: queryLimit,
    sort: querySort,
    enabled: !!selectedDatabase && !!selectedCollection && !selectedDocumentId,
  });
  
  // Convenience alias for collection documents
  const documents = collectionData?.documents;

  // Fetch single document when selected
  const {
    data: documentData,
    isLoading: isLoadingDocument,
  } = useDocument(selectedDatabase, selectedCollection, selectedDocumentId);

  // ==========================================================================
  // Settings (existing)
  // ==========================================================================
  const {
    settings,
    isLoaded: settingsLoaded,
    setFontSize,
    setFontFamily,
    setTheme,
    setLineWidth,
    setViewMode,
    toggleEntitySpotlight,
  } = useViewerSettings();

  // ==========================================================================
  // Content for Text View
  // ==========================================================================
  const textContent = useMemo(() => {
    if (!documentData?.document) return '';
    const doc = documentData.document;
    const metadata = documentData.metadata;
    
    // Priority 1: Use metadata-suggested field
    if (metadata?.text_field && doc[metadata.text_field]) {
      const value = doc[metadata.text_field];
      if (typeof value === 'string') return value;
    }
    
    // Priority 2: Try common text fields in order of preference
    const TEXT_FIELDS = ['cleaned_text', 'transcript', 'transcript_raw', 'content', 'text', 'description', 'summary'];
    for (const field of TEXT_FIELDS) {
      const value = doc[field];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    
    return '';
  }, [documentData]);

  // ==========================================================================
  // Search & Entity Detection (existing)
  // ==========================================================================
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    matches: searchMatches,
    currentMatchIndex,
    totalMatches,
    nextMatch,
    prevMatch,
    clearSearch,
    isRegex,
    toggleRegex,
  } = useTextSearch(textContent);

  const { entities, entityCounts } = useEntityDetection(
    textContent,
    settings.entitySpotlightEnabled
  );

  // Reading progress
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const progress = useReadingProgress(contentRef, wordCount);

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const availableRenderers = useMemo(() => {
    if (!selectedCollection) return ['json' as RendererType];
    return getAvailableRenderers(selectedCollection);
  }, [selectedCollection]);

  const totalEntityCount = Object.values(entityCounts).reduce((a, b) => a + b, 0);

  const hasData = !!selectedDatabase && !!selectedCollection;
  const isViewingDocument = !!selectedDocumentId && !!documentData;
  const isLoading = isLoadingCollection || isLoadingDocument;

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleSelectSource = useCallback((dbName: string, collectionName: string, renderer: RendererType) => {
    setSelectedDatabase(dbName);
    setSelectedCollection(collectionName);
    setSelectedDocumentId(null);
    setCurrentRenderer(selectRenderer(collectionName, renderer));
    setQuerySkip(0);
    clearSearch();
    
    // Update URL to include db and collection - ensures URL is always the source of truth
    const params = new URLSearchParams();
    params.set('db', dbName);
    params.set('collection', collectionName);
    router.push(`/viewer?${params.toString()}`);
  }, [clearSearch, router]);

  const handleDocumentClick = useCallback((docId: string) => {
    setSelectedDocumentId(docId);
    
    // Update URL to include doc - ensures URL is always the source of truth
    const params = new URLSearchParams(window.location.search);
    params.set('doc', docId);
    router.push(`/viewer?${params.toString()}`);
  }, [router]);

  const handleBackToCollection = useCallback(() => {
    setSelectedDocumentId(null);
    clearSearch();
    
    // Update URL to remove doc param - ensures URL is always the source of truth
    const params = new URLSearchParams(window.location.search);
    params.delete('doc');
    params.delete('compare');
    params.delete('timeline');
    router.push(`/viewer?${params.toString()}`);
  }, [clearSearch, router]);

  const handlePageChange = useCallback((skip: number) => {
    setQuerySkip(skip);
  }, []);

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    setQuerySort([{ field, order }]);
  }, []);

  const handleRendererChange = useCallback((renderer: RendererType) => {
    setCurrentRenderer(renderer);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  // ==========================================================================
  // Compare & Timeline Handlers - URL is single source of truth
  // State is updated via useEffect when URL changes
  // ==========================================================================
  const handleOpenCompare = useCallback((docId1: string, docId2: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('compare', `${docId1},${docId2}`);
    params.delete('timeline');
    params.delete('doc');
    router.push(`/viewer?${params.toString()}`);
  }, [router]);

  const handleOpenTimeline = useCallback(() => {
    if (!documentData?.document || !selectedCollection) return;
    
    // Get the source field for this collection (e.g., video_id for video_chunks)
    const sourceField = getSourceField(selectedCollection);
    const sourceId = sourceField 
      ? documentData.document[sourceField] 
      : selectedDocumentId;
    
    if (!sourceId) return;
    
    const params = new URLSearchParams(window.location.search);
    params.set('timeline', String(sourceId));
    params.delete('compare');
    params.delete('doc');
    router.push(`/viewer?${params.toString()}`);
  }, [documentData, selectedCollection, selectedDocumentId, router]);

  const handleCloseCompareTimeline = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('compare');
    params.delete('timeline');
    router.push(`/viewer?${params.toString()}`);
  }, [router]);

  const handleCompareFromTimeline = useCallback((id1: string, id2: string) => {
    handleOpenCompare(id1, id2);
  }, [handleOpenCompare]);

  const handleSelectVersionFromTimeline = useCallback((docId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('doc', docId);
    params.delete('timeline');
    params.delete('compare');
    router.push(`/viewer?${params.toString()}`);
  }, [router]);

  // ==========================================================================
  // Multi-Select Handlers
  // ==========================================================================
  const handleToggleSelect = useCallback((docId: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      // Auto-enable multi-select mode when first selection is made
      if (next.size > 0 && !isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
      return next;
    });
  }, [isMultiSelectMode]);

  const handleSelectAll = useCallback(() => {
    if (documents && documents.length > 0) {
      setSelectedDocIds(new Set(documents.map((d: any) => d._id)));
      setIsMultiSelectMode(true);
    }
  }, [documents]);

  const handleClearSelection = useCallback(() => {
    setSelectedDocIds(new Set());
    setIsMultiSelectMode(false);
  }, []);

  const handleCompareSelected = useCallback(() => {
    const ids = Array.from(selectedDocIds);
    if (ids.length >= 2) {
      handleOpenCompare(ids[0], ids[1]);
      handleClearSelection();
    }
  }, [selectedDocIds, handleOpenCompare, handleClearSelection]);

  const handleExportSelected = useCallback(() => {
    if (!documents || selectedDocIds.size === 0) return;
    
    const selectedDocs = documents.filter((d: any) => selectedDocIds.has(d._id));
    const blob = new Blob([JSON.stringify(selectedDocs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection || 'documents'}_export_${selectedDocIds.size}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [documents, selectedDocIds, selectedCollection]);

  // Clear selection when collection changes
  useEffect(() => {
    handleClearSelection();
  }, [selectedCollection, handleClearSelection]);

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================
  const keyboardShortcuts: ShortcutConfig[] = useMemo(() => [
    // Global shortcuts
    {
      key: 'k',
      modifiers: ['meta'],
      action: () => setIsBrowserOpen(true),
      description: 'Open database browser',
      context: 'global' as const,
    },
    {
      key: 'Escape',
      action: () => {
        if (isBrowserOpen) {
          setIsBrowserOpen(false);
        } else if (isComparePickerOpen) {
          setIsComparePickerOpen(false);
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (pageViewMode !== 'browse') {
          handleCloseCompareTimeline();
        } else if (isViewingDocument) {
          handleBackToCollection();
        }
      },
      description: 'Close modal / Go back',
      context: 'global' as const,
    },
    // Document view shortcuts
    {
      key: 'f',
      modifiers: ['meta'],
      action: () => {
        if (currentRenderer === 'long_text') {
          setIsSearchOpen(true);
        }
      },
      description: 'Open search',
      context: 'document' as const,
    },
    {
      key: 'h',
      modifiers: ['meta'],
      action: () => {
        if (documentData?.document && selectedCollection) {
          handleOpenTimeline();
        }
      },
      description: 'Open history/timeline',
      context: 'document' as const,
    },
    {
      key: 'e',
      modifiers: ['meta'],
      action: () => {
        // Toggle entity spotlight
        toggleEntitySpotlight();
      },
      description: 'Toggle entity spotlight',
      context: 'document' as const,
    },
    // Collection view shortcuts
    {
      key: 'ArrowUp',
      action: () => {
        // Navigate to previous document in collection
        if (documents && documents.length > 0 && selectedDocumentId) {
          const currentIndex = documents.findIndex((d) => d._id === selectedDocumentId);
          if (currentIndex > 0) {
            handleDocumentClick(documents[currentIndex - 1]._id as string);
          }
        }
      },
      description: 'Previous document',
      context: 'collection' as const,
    },
    {
      key: 'ArrowDown',
      action: () => {
        // Navigate to next document in collection
        if (documents && documents.length > 0 && selectedDocumentId) {
          const currentIndex = documents.findIndex((d) => d._id === selectedDocumentId);
          if (currentIndex < documents.length - 1) {
            handleDocumentClick(documents[currentIndex + 1]._id as string);
          }
        }
      },
      description: 'Next document',
      context: 'collection' as const,
    },
    // Multi-select shortcuts
    {
      key: 'a',
      modifiers: ['meta'],
      action: () => {
        if (selectedCollection && !isViewingDocument) {
          handleSelectAll();
        }
      },
      description: 'Select all documents',
      context: 'collection' as const,
    },
    {
      key: 'a',
      modifiers: ['meta', 'shift'],
      action: () => {
        if (selectedCollection && !isViewingDocument) {
          handleClearSelection();
        }
      },
      description: 'Deselect all',
      context: 'collection' as const,
    },
    {
      key: 'Enter',
      modifiers: ['meta'],
      action: () => {
        if (selectedDocIds.size >= 2) {
          handleCompareSelected();
        }
      },
      description: 'Compare selected documents',
      context: 'collection' as const,
    },
  ], [
    isBrowserOpen,
    isComparePickerOpen,
    isSearchOpen,
    pageViewMode,
    isViewingDocument,
    handleCloseCompareTimeline,
    handleBackToCollection,
    currentRenderer,
    documentData,
    selectedCollection,
    handleOpenTimeline,
    toggleEntitySpotlight,
    documents,
    selectedDocumentId,
    handleDocumentClick,
    handleSelectAll,
    handleClearSelection,
    selectedDocIds.size,
    handleCompareSelected,
  ]);

  // Determine current context for shortcuts
  const shortcutContext = useMemo(() => {
    if (pageViewMode === 'compare') return 'compare' as const;
    if (pageViewMode === 'timeline') return 'timeline' as const;
    if (isViewingDocument) return 'document' as const;
    if (selectedCollection) return 'collection' as const;
    return 'global' as const;
  }, [pageViewMode, isViewingDocument, selectedCollection]);

  // Register keyboard shortcuts
  useKeyboardShortcuts(keyboardShortcuts, shortcutContext, settingsLoaded);

  // ==========================================================================
  // Render
  // ==========================================================================
  if (!settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${THEME_CLASSES[settings.theme]} transition-colors duration-300`}>
      {/* Progress bar - only for text view */}
      {isViewingDocument && currentRenderer === 'long_text' && (
        <ProgressBar
          percentage={progress.percentage}
          estimatedTime={progress.estimatedReadingTime}
        />
      )}

      {/* Search bar - only for text view */}
      {currentRenderer === 'long_text' && (
        <SearchBar
          isOpen={isSearchOpen}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          currentMatch={currentMatchIndex}
          totalMatches={totalMatches}
          onNext={nextMatch}
          onPrev={prevMatch}
          onClose={handleCloseSearch}
          isRegex={isRegex}
          onToggleRegex={toggleRegex}
        />
      )}

      {/* Header with breadcrumb and actions */}
      {hasData && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-between">
          <ViewerBreadcrumb
            database={selectedDatabase}
            collection={selectedCollection}
            documentId={selectedDocumentId}
            viewMode={pageViewMode}
            onNavigate={(level) => {
              const params = new URLSearchParams();
              if (level === 'home') {
                setIsBrowserOpen(true);
              } else if (level === 'database' && selectedDatabase) {
                params.set('db', selectedDatabase);
                router.push(`/viewer?${params.toString()}`);
              } else if (level === 'collection' && selectedDatabase && selectedCollection) {
                params.set('db', selectedDatabase);
                params.set('collection', selectedCollection);
                router.push(`/viewer?${params.toString()}`);
              } else if (level === 'document' && selectedDocumentId) {
                params.set('db', selectedDatabase!);
                params.set('collection', selectedCollection!);
                params.set('doc', selectedDocumentId);
                router.push(`/viewer?${params.toString()}`);
              }
            }}
          />
          
          <div className="flex items-center gap-2">
            {/* Compare and Timeline buttons - show when viewing a document */}
            {isViewingDocument && pageViewMode === 'browse' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsComparePickerOpen(true)}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare with...
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenTimeline}
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
              </>
            )}
            
            {/* Close compare/timeline mode */}
            {pageViewMode !== 'browse' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseCompareTimeline}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Close {pageViewMode === 'compare' ? 'Compare' : 'Timeline'}
              </Button>
            )}
            
            {/* Renderer selector */}
            {availableRenderers.length > 1 && !isViewingDocument && pageViewMode === 'browse' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {currentRenderer === 'long_text' && <FileText className="h-4 w-4" />}
                    {currentRenderer === 'json' && <Code className="h-4 w-4" />}
                    {currentRenderer === 'table' && <TableIcon className="h-4 w-4" />}
                    {getRendererDisplayName(currentRenderer)}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableRenderers.map((renderer) => (
                    <DropdownMenuItem
                      key={renderer}
                      onClick={() => handleRendererChange(renderer)}
                    >
                      {getRendererDisplayName(renderer)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      {pageViewMode === 'compare' && compareDocIds && selectedDatabase && selectedCollection ? (
        // Compare view
        <ComparisonView
          dbName={selectedDatabase}
          collection={selectedCollection}
          leftDocId={compareDocIds[0]}
          rightDocId={compareDocIds[1]}
          onClose={handleCloseCompareTimeline}
          className="flex-1"
        />
      ) : pageViewMode === 'timeline' && timelineSourceId && selectedDatabase && selectedCollection ? (
        // Timeline view
        <TimelineView
          dbName={selectedDatabase}
          collection={selectedCollection}
          sourceId={timelineSourceId}
          onCompare={handleCompareFromTimeline}
          onSelectVersion={handleSelectVersionFromTimeline}
          onClose={handleCloseCompareTimeline}
          className="flex-1"
        />
      ) : !hasData ? (
        // Empty state
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
            <Database className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Select a data source
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-center mb-6 max-w-sm">
            Browse databases and collections to view documents, entities, and graph data
          </p>
          <Button onClick={() => setIsBrowserOpen(true)}>
            Browse Databases
          </Button>
        </div>
      ) : isLoading ? (
        // Loading state with content-aware skeleton
        <div className="flex-1 overflow-auto p-6">
          {isViewingDocument || selectedDocumentId ? (
            <DocumentSkeleton />
          ) : (
            <CollectionSkeleton count={Math.min(queryLimit, 5)} />
          )}
        </div>
      ) : isViewingDocument && documentData ? (
        // Single document view
        <div className="flex-1 overflow-auto p-6">
          {currentRenderer === 'long_text' ? (
            <TextDisplay
              ref={contentRef}
              content={textContent || null}
              title={String(documentData.document.title || documentData.document._id)}
              fontSize={settings.fontSize}
              fontFamily={settings.fontFamily}
              lineWidth={settings.lineWidth}
              entities={entities}
              searchMatches={searchMatches}
              currentMatchIndex={currentMatchIndex}
              entitySpotlightEnabled={settings.entitySpotlightEnabled}
            />
          ) : (
            <JsonViewer data={documentData.document} defaultExpanded={3} />
          )}
        </div>
      ) : collectionData ? (
        // Collection view
        <div className="flex-1 overflow-auto">
          {/* Selection toolbar */}
          {isMultiSelectMode && selectedDocIds.size > 0 && (
            <div className="px-6 pt-4">
              <SelectionToolbar
                selectedIds={selectedDocIds}
                totalCount={collectionData?.total || 0}
                onClear={handleClearSelection}
                onSelectAll={handleSelectAll}
                onCompare={(id1, id2) => {
                  handleOpenCompare(id1, id2);
                  handleClearSelection();
                }}
                onExport={(ids) => {
                  if (!documents) return;
                  const selectedDocs = documents.filter((d: any) => ids.includes(d._id));
                  const blob = new Blob([JSON.stringify(selectedDocs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedCollection || 'documents'}_export_${ids.length}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              />
            </div>
          )}
          <div className="p-6">
          {currentRenderer === 'long_text' ? (
            <TextListViewer
              documents={collectionData.documents}
              total={collectionData.total}
              skip={querySkip}
              limit={queryLimit}
              hasMore={collectionData.has_more}
              onPageChange={handlePageChange}
              onDocumentClick={handleDocumentClick}
              isLoading={isFetchingCollection}
            />
          ) : currentRenderer === 'chunks' ? (
            <ChunksViewer
              documents={collectionData.documents as never[]}
              total={collectionData.total}
              skip={querySkip}
              limit={queryLimit}
              hasMore={collectionData.has_more}
              onPageChange={handlePageChange}
              onDocumentClick={handleDocumentClick}
              isLoading={isFetchingCollection}
            />
          ) : currentRenderer === 'entity' ? (
            <EntityViewer
              documents={collectionData.documents as never[]}
              total={collectionData.total}
              skip={querySkip}
              limit={queryLimit}
              hasMore={collectionData.has_more}
              onPageChange={handlePageChange}
              onDocumentClick={handleDocumentClick}
              isLoading={isFetchingCollection}
            />
          ) : currentRenderer === 'community' ? (
            <CommunityViewer
              documents={collectionData.documents as never[]}
              total={collectionData.total}
              skip={querySkip}
              limit={queryLimit}
              hasMore={collectionData.has_more}
              onPageChange={handlePageChange}
              onDocumentClick={handleDocumentClick}
              isLoading={isFetchingCollection}
            />
          ) : currentRenderer === 'table' ? (
            <TableViewer
              documents={collectionData.documents}
              total={collectionData.total}
              skip={querySkip}
              limit={queryLimit}
              hasMore={collectionData.has_more}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onDocumentClick={handleDocumentClick}
              sortField={sortField}
              sortOrder={sortOrder}
              isLoading={isFetchingCollection}
            />
          ) : (
            // Default JSON view for collection
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {collectionData.total} documents • Showing {collectionData.returned}
                </div>
                {!isMultiSelectMode && collectionData.documents.length > 1 && (
                  <button
                    onClick={() => setIsMultiSelectMode(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    Select multiple
                  </button>
                )}
              </div>
              {collectionData.documents.map((doc, idx) => {
                const docId = String(doc._id);
                const isSelected = selectedDocIds.has(docId);
                return (
                  <div
                    key={docId || idx}
                    className={`border rounded-lg overflow-hidden transition-colors ${
                      isSelected 
                        ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    {/* Clickable header for document navigation */}
                    <div className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                      {isMultiSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(docId);
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-neutral-300 dark:border-neutral-600 hover:border-blue-400'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => doc._id && handleDocumentClick(docId)}
                        className="flex-1 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left -mx-2 px-2 py-1 rounded"
                      >
                        <span className="font-mono text-sm text-neutral-600 dark:text-neutral-300 truncate">
                          {docId}
                        </span>
                        <span className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                          Open →
                        </span>
                      </button>
                    </div>
                    <JsonViewer data={doc} defaultExpanded={1} />
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      ) : null}

      {/* Entity legend - show when spotlight is enabled in text view */}
      {isViewingDocument && currentRenderer === 'long_text' && settings.entitySpotlightEnabled && (
        <div className="fixed bottom-20 left-6 z-30 p-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-lg">
          <EntityLegend counts={entityCounts} />
        </div>
      )}

      {/* Typography controls - show for text view */}
      {currentRenderer === 'long_text' && (
        <TypographyControls
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
          theme={settings.theme}
          lineWidth={settings.lineWidth}
          viewMode={settings.viewMode}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onThemeChange={setTheme}
          onLineWidthChange={setLineWidth}
          onViewModeChange={setViewMode}
        />
      )}

      {/* Toolbar */}
      <ViewerToolbar
        onOpenSearch={() => currentRenderer === 'long_text' && setIsSearchOpen(true)}
        onOpenSourceSelector={() => setIsBrowserOpen(true)}
        onToggleEntitySpotlight={toggleEntitySpotlight}
        entitySpotlightEnabled={settings.entitySpotlightEnabled}
        entityCount={totalEntityCount}
        content={textContent || null}
        hasDocument={isViewingDocument}
      />

      {/* Database browser */}
      <DatabaseBrowser
        open={isBrowserOpen}
        onOpenChange={setIsBrowserOpen}
        onSelect={handleSelectSource}
        currentDatabase={selectedDatabase}
        currentCollection={selectedCollection}
      />

      {/* Compare picker */}
      {isViewingDocument && selectedDatabase && selectedCollection && (
        <ComparePicker
          isOpen={isComparePickerOpen}
          onClose={() => setIsComparePickerOpen(false)}
          currentDocId={selectedDocumentId!}
          dbName={selectedDatabase}
          collection={selectedCollection}
          currentDocument={documentData?.document}
          onSelect={(targetDocId) => {
            handleOpenCompare(selectedDocumentId!, targetDocId);
            setIsComparePickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
