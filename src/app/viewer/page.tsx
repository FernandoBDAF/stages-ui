'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText } from 'lucide-react';

// Components
import { ProgressBar } from '@/components/viewer/progress-bar';
import { SearchBar } from '@/components/viewer/search-bar';
import { SourceSelector } from '@/components/viewer/source-selector';
import { TextDisplay } from '@/components/viewer/text-display';
import { TypographyControls } from '@/components/viewer/typography-controls';
import { ViewerToolbar } from '@/components/viewer/viewer-toolbar';
import { EntityLegend } from '@/components/viewer/entity-highlighter';

// Hooks
import { useViewerSettings } from '@/hooks/use-viewer-settings';
import { useTextSearch } from '@/hooks/use-text-search';
import { useEntityDetection } from '@/hooks/use-entity-detection';
import { useReadingProgress } from '@/hooks/use-reading-progress';

// Mock data
import { fetchDocumentPair, getUniqueDocuments } from '@/lib/mock-data/viewer-documents';

// Types
import type { DocumentContent } from '@/types/viewer';

// Theme classes
const THEME_CLASSES = {
  light: 'bg-neutral-50 text-neutral-900',
  dark: 'bg-neutral-950 text-neutral-100',
  sepia: 'bg-[#F4ECD8] text-[#433422]',
};

export default function ViewerPage() {
  // State
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<DocumentContent | null>(null);
  const [cleanedContent, setCleanedContent] = useState<DocumentContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [documents] = useState(getUniqueDocuments);

  // Refs
  const rawContentRef = useRef<HTMLDivElement>(null);
  const cleanedContentRef = useRef<HTMLDivElement>(null);

  // Settings
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

  // Get the content to use for search (use cleaned if available, else raw)
  const activeContent = settings.viewMode === 'split'
    ? (cleanedContent?.content || rawContent?.content || '')
    : (cleanedContent?.content || rawContent?.content || '');

  // Search
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
  } = useTextSearch(activeContent);

  // Entity detection - run on both contents
  const { entities: rawEntities, entityCounts: rawEntityCounts } = useEntityDetection(
    rawContent?.content || '',
    settings.entitySpotlightEnabled
  );
  const { entities: cleanedEntities, entityCounts: cleanedEntityCounts } = useEntityDetection(
    cleanedContent?.content || '',
    settings.entitySpotlightEnabled
  );

  // Reading progress (use the main/single content ref)
  const wordCount = settings.viewMode === 'split'
    ? (cleanedContent?.metadata.word_count || rawContent?.metadata.word_count || 0)
    : (cleanedContent?.metadata.word_count || rawContent?.metadata.word_count || 0);
  
  const progress = useReadingProgress(
    settings.viewMode === 'split' ? cleanedContentRef : rawContentRef,
    wordCount
  );

  // Load document pair when selected
  useEffect(() => {
    if (!selectedDocId) return;

    setIsLoading(true);
    fetchDocumentPair(selectedDocId)
      .then(({ raw, cleaned }) => {
        setRawContent(raw);
        setCleanedContent(cleaned);
      })
      .finally(() => setIsLoading(false));
  }, [selectedDocId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K - Open source selector
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSourceSelectorOpen(true);
      }
      // ⌘F / Ctrl+F - Open search
      else if ((e.metaKey || e.ctrlKey) && e.key === 'f' && (rawContent || cleanedContent)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // ⌘E / Ctrl+E - Toggle entity spotlight
      else if ((e.metaKey || e.ctrlKey) && e.key === 'e' && (rawContent || cleanedContent)) {
        e.preventDefault();
        toggleEntitySpotlight();
      }
      // ⌘D / Ctrl+D - Toggle dark mode
      else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setTheme(settings.theme === 'dark' ? 'light' : 'dark');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rawContent, cleanedContent, toggleEntitySpotlight, setTheme, settings.theme]);

  // Handle document selection
  const handleSelectDocument = useCallback((docId: string) => {
    setSelectedDocId(docId);
    clearSearch();
  }, [clearSearch]);

  // Handle search close
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  // Calculate total entity count
  const totalEntityCount = settings.viewMode === 'split'
    ? Object.values(cleanedEntityCounts).reduce((a, b) => a + b, 0) +
      Object.values(rawEntityCounts).reduce((a, b) => a + b, 0)
    : Object.values(cleanedEntityCounts).reduce((a, b) => a + b, 0) ||
      Object.values(rawEntityCounts).reduce((a, b) => a + b, 0);

  // Don't render until settings are loaded
  if (!settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasDocument = !!(rawContent || cleanedContent);
  const showSplitView = settings.viewMode === 'split' && rawContent && cleanedContent;

  return (
    <div className={`min-h-screen flex flex-col ${THEME_CLASSES[settings.theme]} transition-colors duration-300`}>
      {/* Progress bar - only show when document loaded */}
      {hasDocument && (
        <ProgressBar
          percentage={progress.percentage}
          estimatedTime={progress.estimatedReadingTime}
        />
      )}

      {/* Search bar */}
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

      {/* Main content */}
      {!hasDocument ? (
        // Empty state
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Select a document
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-center mb-6 max-w-sm">
            Press <kbd className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-sm">⌘K</kbd> to browse
            available transcripts and texts
          </p>
          <button
            onClick={() => setIsSourceSelectorOpen(true)}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Browse Documents
          </button>
        </div>
      ) : isLoading ? (
        // Loading state
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      ) : showSplitView ? (
        // Split view
        <div className="flex-1 flex">
          {/* Raw content */}
          <TextDisplay
            ref={rawContentRef}
            content={rawContent?.content || null}
            title={rawContent?.title}
            metadata={rawContent?.metadata}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            lineWidth="wide"
            entities={rawEntities}
            searchMatches={searchMatches}
            currentMatchIndex={currentMatchIndex}
            entitySpotlightEnabled={settings.entitySpotlightEnabled}
            label="Raw Transcript"
            className="flex-1 border-r border-neutral-200 dark:border-neutral-800"
          />
          {/* Cleaned content */}
          <TextDisplay
            ref={cleanedContentRef}
            content={cleanedContent?.content || null}
            title={cleanedContent?.title}
            metadata={cleanedContent?.metadata}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            lineWidth="wide"
            entities={cleanedEntities}
            searchMatches={searchMatches}
            currentMatchIndex={currentMatchIndex}
            entitySpotlightEnabled={settings.entitySpotlightEnabled}
            label="Cleaned Text"
            className="flex-1"
          />
        </div>
      ) : (
        // Single view
        <TextDisplay
          ref={cleanedContent ? cleanedContentRef : rawContentRef}
          content={cleanedContent?.content || rawContent?.content || null}
          title={cleanedContent?.title || rawContent?.title}
          metadata={cleanedContent?.metadata || rawContent?.metadata}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
          lineWidth={settings.lineWidth}
          entities={cleanedContent ? cleanedEntities : rawEntities}
          searchMatches={searchMatches}
          currentMatchIndex={currentMatchIndex}
          entitySpotlightEnabled={settings.entitySpotlightEnabled}
          className="flex-1"
        />
      )}

      {/* Entity legend - show when spotlight is enabled */}
      {hasDocument && settings.entitySpotlightEnabled && (
        <div className="fixed bottom-20 left-6 z-30 p-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-lg">
          <EntityLegend counts={cleanedContent ? cleanedEntityCounts : rawEntityCounts} />
        </div>
      )}

      {/* Typography controls */}
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

      {/* Toolbar */}
      <ViewerToolbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSourceSelector={() => setIsSourceSelectorOpen(true)}
        onToggleEntitySpotlight={toggleEntitySpotlight}
        entitySpotlightEnabled={settings.entitySpotlightEnabled}
        entityCount={totalEntityCount}
        content={cleanedContent?.content || rawContent?.content || null}
        hasDocument={hasDocument}
      />

      {/* Source selector */}
      <SourceSelector
        isOpen={isSourceSelectorOpen}
        onClose={() => setIsSourceSelectorOpen(false)}
        documents={documents}
        selectedId={selectedDocId}
        onSelect={handleSelectDocument}
      />
    </div>
  );
}

