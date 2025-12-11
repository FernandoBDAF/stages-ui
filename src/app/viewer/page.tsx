'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { FileText, Database, Code, Table as TableIcon, ChevronDown } from 'lucide-react';

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

// Utils
import { selectRenderer, getAvailableRenderers, getRendererDisplayName } from '@/lib/viewer/renderer-selector';

// Types
import type { RendererType, SortOption } from '@/types/viewer-api';

// Theme classes
const THEME_CLASSES = {
  light: 'bg-neutral-50 text-neutral-900',
  dark: 'bg-neutral-950 text-neutral-100',
  sepia: 'bg-[#F4ECD8] text-[#433422]',
};

export default function ViewerPage() {
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
  // UI State (existing)
  // ==========================================================================
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);

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
    if (documentData?.document) {
      // Get text field based on renderer or document metadata
      const textField = documentData.metadata.text_field || 'text' || 'transcript' || 'content';
      const text = documentData.document[textField];
      if (typeof text === 'string') return text;
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
  }, [clearSearch]);

  const handleDocumentClick = useCallback((docId: string) => {
    setSelectedDocumentId(docId);
  }, []);

  const handleBackToCollection = useCallback(() => {
    setSelectedDocumentId(null);
    clearSearch();
  }, [clearSearch]);

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

      {/* Header with source info and renderer selector */}
      {hasData && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBrowserOpen(true)}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              {selectedDatabase}
              <span className="text-muted-foreground">/</span>
              {selectedCollection}
            </Button>
            {selectedDocumentId && (
              <>
                <span className="text-muted-foreground">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCollection}
                >
                  ← Back to list
                </Button>
              </>
            )}
          </div>
          
          {/* Renderer selector */}
          {availableRenderers.length > 1 && !isViewingDocument && (
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
      )}

      {/* Main content */}
      {!hasData ? (
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
        // Loading state
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
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
        <div className="flex-1 overflow-auto p-6">
          {currentRenderer === 'chunks' ? (
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
              <div className="text-sm text-muted-foreground">
                {collectionData.total} documents • Showing {collectionData.returned}
              </div>
              {collectionData.documents.map((doc, idx) => (
                <div
                  key={String(doc._id) || idx}
                  className="cursor-pointer"
                  onClick={() => doc._id && handleDocumentClick(String(doc._id))}
                >
                  <JsonViewer data={doc} defaultExpanded={1} />
                </div>
              ))}
            </div>
          )}
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
    </div>
  );
}
