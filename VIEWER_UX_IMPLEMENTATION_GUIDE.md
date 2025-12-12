# Viewer Module UX Enhancement - Implementation Guide

**Project**: StagesUI - Viewer Module  
**Scope**: Phase 1 (Critical Fixes) + Phase 2 (Core UX Enhancements)  
**Date**: December 11, 2024  
**Estimated Effort**: 5-7 days

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Phase 1: Critical Fixes](#2-phase-1-critical-fixes)
3. [Phase 2: Core UX Enhancements](#3-phase-2-core-ux-enhancements)
4. [File Structure & Dependencies](#4-file-structure--dependencies)
5. [Implementation Order](#5-implementation-order)
6. [Testing Strategy](#6-testing-strategy)

---

## 1. Current State Analysis

### 1.1 Working Components

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `DatabaseBrowser` | `components/viewer/database-browser.tsx` | ✅ Working | Modal with keyboard nav |
| `JsonViewer` | `components/viewer/json-viewer.tsx` | ✅ Working | Collapsible tree |
| `TableViewer` | `components/viewer/table-viewer.tsx` | ✅ Working | Pagination, sorting |
| `ChunksViewer` | `components/viewer/chunks-viewer.tsx` | ✅ Working | Status badges |
| `EntityViewer` | `components/viewer/entity-viewer.tsx` | ✅ Working | Type filtering |
| `CommunityViewer` | `components/viewer/community-viewer.tsx` | ✅ Working | Level indicators |
| `TextDisplay` | `components/viewer/text-display.tsx` | ✅ Working | Entity highlight |

### 1.2 Identified Issues

**Issue 1: Text Viewer Not Rendering for Collections**

Location: `src/app/viewer/page.tsx` lines 339-407

```typescript
// CURRENT: Only single document view uses TextDisplay (line 322-337)
} else if isViewingDocument && documentData ? (
  // Single document - works
  <TextDisplay ... />
)

// PROBLEM: Collection view has NO long_text renderer option
// Line 339-407 only handles: chunks, entity, community, table, json
// Missing: long_text renderer for collection list!
```

**Root Cause**: The `textContent` extraction logic (lines 115-123) has a bug:

```typescript
// BUGGY CODE:
const textField = documentData.metadata.text_field || 'text' || 'transcript' || 'content';
// This always returns 'text' because || is wrong - it evaluates left-to-right

// CORRECT:
const textField = documentData.metadata.text_field || 'text';
const text = documentData.document[textField] || 
             documentData.document.transcript || 
             documentData.document.transcript_raw ||
             documentData.document.content;
```

**Issue 2: No Collection Filtering**

- `useCollectionQuery` accepts filters but the UI never passes any
- No filter panel component exists
- No filter state management

**Issue 3: Navigation Requires Modal**

- Users must click "Browse Databases" or press ⌘K
- No persistent database/collection selectors visible
- No breadcrumb trail

---

## 2. Phase 1: Critical Fixes

### Task 1.1: Fix Text Viewer Rendering (4h)

**Goal**: Allow viewing long text content from collections like `cleaned_transcripts`, `raw_videos`

#### Step 1: Fix Text Content Extraction

**File**: `src/app/viewer/page.tsx`

Replace lines 115-123:

```typescript
// ==========================================================================
// Content for Text View
// ==========================================================================

/**
 * Extract text content from document based on collection type
 */
const textContent = useMemo(() => {
  if (!documentData?.document) return '';
  
  const doc = documentData.document;
  const metadata = documentData.metadata;
  
  // Priority 1: Use metadata-suggested text field
  if (metadata?.text_field && doc[metadata.text_field]) {
    const value = doc[metadata.text_field];
    if (typeof value === 'string') return value;
  }
  
  // Priority 2: Try common text field names
  const TEXT_FIELDS = [
    'transcript',        // raw_videos
    'transcript_raw',    // raw_videos alternate
    'content',           // cleaned_transcripts
    'text',              // video_chunks
    'description',       // generic
    'summary',           // communities
  ];
  
  for (const field of TEXT_FIELDS) {
    const value = doc[field];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  
  // Priority 3: If document has only one large text field, use it
  for (const [key, value] of Object.entries(doc)) {
    if (typeof value === 'string' && value.length > 500) {
      return value;
    }
  }
  
  return '';
}, [documentData]);

/**
 * Extract document title for display
 */
const documentTitle = useMemo(() => {
  if (!documentData?.document) return '';
  const doc = documentData.document;
  return String(
    doc.title || 
    doc.name || 
    doc.video_title ||
    doc.video_id || 
    doc._id || 
    'Untitled'
  );
}, [documentData]);
```

#### Step 2: Add Collection-Level Text List View

The issue is that when viewing a collection with `long_text` renderer, we show JSON cards. We need a text-preview list.

**Create new file**: `src/components/viewer/text-list-viewer.tsx`

```typescript
'use client';

import { useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface TextListViewerProps {
  documents: Record<string, unknown>[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (skip: number) => void;
  onDocumentClick: (docId: string) => void;
  textField?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Extract text preview from document
 */
function getTextPreview(doc: Record<string, unknown>, textField?: string): string {
  // Try specific field first
  if (textField && doc[textField]) {
    const value = doc[textField];
    if (typeof value === 'string') return value;
  }
  
  // Try common fields
  const fields = ['transcript', 'transcript_raw', 'content', 'text', 'description', 'summary'];
  for (const field of fields) {
    if (doc[field] && typeof doc[field] === 'string') {
      return doc[field] as string;
    }
  }
  
  return '';
}

/**
 * Extract title from document
 */
function getTitle(doc: Record<string, unknown>): string {
  return String(doc.title || doc.name || doc.video_title || doc.video_id || doc._id || 'Untitled');
}

/**
 * Truncate text to max characters with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function TextListViewer({
  documents,
  total,
  skip,
  limit,
  hasMore,
  onPageChange,
  onDocumentClick,
  textField,
  isLoading = false,
  className,
}: TextListViewerProps) {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-neutral-300 mb-4" />
        <p className="text-neutral-500">No documents found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total.toLocaleString()} documents • Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const docId = String(doc._id);
          const title = getTitle(doc);
          const preview = getTextPreview(doc, textField);
          const wordCount = preview.split(/\s+/).filter(Boolean).length;

          return (
            <Card
              key={docId}
              className="cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              onClick={() => onDocumentClick(docId)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate mb-1">
                      {title}
                    </h3>
                    
                    {/* Preview text */}
                    {preview ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {truncate(preview, 200)}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">No text content</p>
                    )}
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      {wordCount > 0 && (
                        <span>{wordCount.toLocaleString()} words</span>
                      )}
                      {doc.channel_title && (
                        <>
                          <span>•</span>
                          <span>{String(doc.channel_title)}</span>
                        </>
                      )}
                      {doc.published_at && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(String(doc.published_at)).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <ChevronRight className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(0, skip - limit))}
          disabled={skip === 0}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(skip + limit)}
          disabled={!hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

#### Step 3: Integrate TextListViewer into Page

**File**: `src/app/viewer/page.tsx`

Add import at the top:

```typescript
import { TextListViewer } from '@/components/viewer/text-list-viewer';
```

In the collection view section (around line 340), add the `long_text` case:

```typescript
// Collection view
<div className="flex-1 overflow-auto p-6">
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
    // ... rest of renderers
```

---

### Task 1.2: Add Collection Filtering (6h)

**Goal**: Enable filtering documents within a collection

#### Step 1: Create Filter Types

**File**: `src/types/viewer-filter.ts` (NEW)

```typescript
/**
 * Viewer Collection Filter Types
 */

// Base filter interface
export interface ViewerFilter {
  // Text search across fields
  search?: string;
  
  // Generic field filters
  fieldFilters?: FieldFilter[];
}

// Single field filter
export interface FieldFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[];
}

// Available operators
export type FilterOperator =
  | 'equals'      // field === value
  | 'not_equals'  // field !== value
  | 'contains'    // field includes value (string)
  | 'starts_with' // field starts with value (string)
  | 'gt'          // field > value (number)
  | 'gte'         // field >= value (number)
  | 'lt'          // field < value (number)
  | 'lte'         // field <= value (number)
  | 'in'          // field in [values]
  | 'exists'      // field exists (boolean)
  | 'regex';      // field matches regex

// Entity collection specific filters
export interface EntityFilter extends ViewerFilter {
  types?: string[];           // Entity types: PERSON, ORG, etc.
  minTrustScore?: number;     // Minimum trust/confidence
  minMentions?: number;       // Minimum mention count
  hasDescription?: boolean;   // Has description field
}

// Chunk collection specific filters
export interface ChunkFilter extends ViewerFilter {
  processingStatus?: ('completed' | 'failed' | 'pending' | 'warning')[];
  stages?: ('extraction' | 'resolution' | 'construction' | 'communities')[];
  hasErrors?: boolean;
  videoId?: string;
}

// Raw videos / transcripts filters
export interface VideoFilter extends ViewerFilter {
  channelIds?: string[];
  minViews?: number;
  maxViews?: number;
  hasTranscript?: boolean;
  dateRange?: {
    start?: string;  // ISO date
    end?: string;
  };
}

// Union type for all filter variations
export type CollectionFilter = ViewerFilter | EntityFilter | ChunkFilter | VideoFilter;

// Saved filter preset
export interface SavedFilter {
  id: string;
  name: string;
  collection: string;
  filter: CollectionFilter;
  createdAt: string;
}

// Convert UI filter to MongoDB query
export function filterToMongoQuery(filter: CollectionFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  
  // Text search
  if (filter.search) {
    query.$or = [
      { title: { $regex: filter.search, $options: 'i' } },
      { name: { $regex: filter.search, $options: 'i' } },
      { content: { $regex: filter.search, $options: 'i' } },
      { text: { $regex: filter.search, $options: 'i' } },
      { description: { $regex: filter.search, $options: 'i' } },
    ];
  }
  
  // Entity-specific filters
  if ('types' in filter && filter.types && filter.types.length > 0) {
    query.type = { $in: filter.types };
  }
  
  if ('minTrustScore' in filter && filter.minTrustScore !== undefined) {
    query.$or = [
      { trust_score: { $gte: filter.minTrustScore } },
      { confidence: { $gte: filter.minTrustScore } },
    ];
  }
  
  if ('minMentions' in filter && filter.minMentions !== undefined) {
    query.mention_count = { $gte: filter.minMentions };
  }
  
  if ('hasDescription' in filter && filter.hasDescription !== undefined) {
    query.description = filter.hasDescription 
      ? { $exists: true, $ne: '' } 
      : { $in: [null, '', { $exists: false }] };
  }
  
  // Chunk-specific filters
  if ('processingStatus' in filter && filter.processingStatus && filter.processingStatus.length > 0) {
    query['graphrag_extraction.status'] = { $in: filter.processingStatus };
  }
  
  if ('hasErrors' in filter && filter.hasErrors === true) {
    query['graphrag_extraction.error'] = { $exists: true, $ne: null };
  }
  
  if ('videoId' in filter && filter.videoId) {
    query.video_id = filter.videoId;
  }
  
  // Video-specific filters
  if ('channelIds' in filter && filter.channelIds && filter.channelIds.length > 0) {
    query.channel_id = { $in: filter.channelIds };
  }
  
  if ('minViews' in filter && filter.minViews !== undefined) {
    query['stats.viewCount'] = { $gte: filter.minViews };
  }
  
  if ('hasTranscript' in filter && filter.hasTranscript !== undefined) {
    if (filter.hasTranscript) {
      query.$or = [
        { transcript: { $exists: true, $ne: null, $ne: '' } },
        { transcript_raw: { $exists: true, $ne: null, $ne: '' } },
      ];
    } else {
      query.transcript = { $in: [null, ''] };
      query.transcript_raw = { $in: [null, ''] };
    }
  }
  
  if ('dateRange' in filter && filter.dateRange) {
    const dateQuery: Record<string, string> = {};
    if (filter.dateRange.start) dateQuery.$gte = filter.dateRange.start;
    if (filter.dateRange.end) dateQuery.$lte = filter.dateRange.end;
    if (Object.keys(dateQuery).length > 0) {
      query.published_at = dateQuery;
    }
  }
  
  return query;
}
```

#### Step 2: Create Filter Panel Component

**File**: `src/components/viewer/collection-filter-panel.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { CollectionFilter, EntityFilter, ChunkFilter, VideoFilter } from '@/types/viewer-filter';

interface CollectionFilterPanelProps {
  collection: string;
  currentFilter: CollectionFilter;
  onFilterChange: (filter: CollectionFilter) => void;
  onClear: () => void;
  className?: string;
}

// Entity types available for filtering
const ENTITY_TYPES = ['PERSON', 'ORGANIZATION', 'LOCATION', 'TECHNOLOGY', 'EVENT', 'CONCEPT'];

// Processing statuses for chunks
const PROCESSING_STATUSES = ['completed', 'failed', 'pending', 'warning'] as const;

// Stages for chunk filtering
const PROCESSING_STAGES = ['extraction', 'resolution', 'construction', 'communities'] as const;

/**
 * Count active filters
 */
function countActiveFilters(filter: CollectionFilter): number {
  let count = 0;
  
  if (filter.search) count++;
  if ('types' in filter && filter.types?.length) count++;
  if ('minTrustScore' in filter && filter.minTrustScore) count++;
  if ('minMentions' in filter && filter.minMentions) count++;
  if ('hasDescription' in filter && filter.hasDescription !== undefined) count++;
  if ('processingStatus' in filter && filter.processingStatus?.length) count++;
  if ('hasErrors' in filter && filter.hasErrors) count++;
  if ('videoId' in filter && filter.videoId) count++;
  if ('channelIds' in filter && filter.channelIds?.length) count++;
  if ('minViews' in filter && filter.minViews) count++;
  if ('hasTranscript' in filter && filter.hasTranscript !== undefined) count++;
  if ('dateRange' in filter && (filter.dateRange?.start || filter.dateRange?.end)) count++;
  
  return count;
}

/**
 * Determine filter type based on collection name
 */
function getFilterType(collection: string): 'entity' | 'chunk' | 'video' | 'generic' {
  if (collection === 'entities') return 'entity';
  if (collection === 'video_chunks') return 'chunk';
  if (['raw_videos', 'cleaned_transcripts', 'enriched_transcripts'].includes(collection)) return 'video';
  return 'generic';
}

export function CollectionFilterPanel({
  collection,
  currentFilter,
  onFilterChange,
  onClear,
  className,
}: CollectionFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const filterType = getFilterType(collection);
  const activeCount = countActiveFilters(currentFilter);

  // Local state for controlled inputs
  const [searchInput, setSearchInput] = useState(currentFilter.search || '');
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentFilter.search) {
        onFilterChange({ ...currentFilter, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update local search when filter changes externally
  useEffect(() => {
    setSearchInput(currentFilter.search || '');
  }, [currentFilter.search]);

  return (
    <div className={cn('border-b border-neutral-200 dark:border-neutral-800', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 px-6 py-3">
          {/* Search input - always visible */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search documents..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter toggle */}
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Clear filters */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                onClear();
              }}
              className="text-neutral-500"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <Card className="mx-6 mb-4 rounded-lg">
            <CardContent className="pt-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Entity-specific filters */}
                {filterType === 'entity' && (
                  <EntityFilters
                    filter={currentFilter as EntityFilter}
                    onChange={(updates) => onFilterChange({ ...currentFilter, ...updates })}
                  />
                )}

                {/* Chunk-specific filters */}
                {filterType === 'chunk' && (
                  <ChunkFilters
                    filter={currentFilter as ChunkFilter}
                    onChange={(updates) => onFilterChange({ ...currentFilter, ...updates })}
                  />
                )}

                {/* Video/transcript-specific filters */}
                {filterType === 'video' && (
                  <VideoFilters
                    filter={currentFilter as VideoFilter}
                    onChange={(updates) => onFilterChange({ ...currentFilter, ...updates })}
                  />
                )}

                {/* Generic filters for unknown collections */}
                {filterType === 'generic' && (
                  <div className="col-span-full text-sm text-neutral-500">
                    Use the search box above to filter documents by text content.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// =============================================================================
// Entity Filters
// =============================================================================

interface EntityFiltersProps {
  filter: EntityFilter;
  onChange: (updates: Partial<EntityFilter>) => void;
}

function EntityFilters({ filter, onChange }: EntityFiltersProps) {
  return (
    <>
      {/* Entity Type Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Entity Types</Label>
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filter.types?.includes(type) || false}
                onCheckedChange={(checked) => {
                  const current = filter.types || [];
                  const updated = checked
                    ? [...current, type]
                    : current.filter((t) => t !== type);
                  onChange({ types: updated.length > 0 ? updated : undefined });
                }}
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Trust Score Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min Trust Score</Label>
          <span className="text-sm font-mono text-neutral-500">
            {(filter.minTrustScore || 0).toFixed(1)}
          </span>
        </div>
        <Slider
          value={[(filter.minTrustScore || 0) * 100]}
          onValueChange={([value]) => 
            onChange({ minTrustScore: value > 0 ? value / 100 : undefined })
          }
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Mention Count */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min Mentions</Label>
          <span className="text-sm font-mono text-neutral-500">
            {filter.minMentions || 0}
          </span>
        </div>
        <Slider
          value={[filter.minMentions || 0]}
          onValueChange={([value]) => 
            onChange({ minMentions: value > 0 ? value : undefined })
          }
          max={50}
          step={1}
          className="w-full"
        />
      </div>

      {/* Has Description */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={filter.hasDescription === true}
          onCheckedChange={(checked) => 
            onChange({ hasDescription: checked ? true : undefined })
          }
        />
        <span className="text-sm">Has description</span>
      </label>
    </>
  );
}

// =============================================================================
// Chunk Filters
// =============================================================================

interface ChunkFiltersProps {
  filter: ChunkFilter;
  onChange: (updates: Partial<ChunkFilter>) => void;
}

function ChunkFilters({ filter, onChange }: ChunkFiltersProps) {
  return (
    <>
      {/* Processing Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Processing Status</Label>
        <div className="space-y-1">
          {PROCESSING_STATUSES.map((status) => (
            <label key={status} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filter.processingStatus?.includes(status) || false}
                onCheckedChange={(checked) => {
                  const current = filter.processingStatus || [];
                  const updated = checked
                    ? [...current, status]
                    : current.filter((s) => s !== status);
                  onChange({ processingStatus: updated.length > 0 ? updated : undefined });
                }}
              />
              <span className="text-sm capitalize">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Has Errors Toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Error Filter</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={filter.hasErrors === true}
            onCheckedChange={(checked) => 
              onChange({ hasErrors: checked ? true : undefined })
            }
          />
          <span className="text-sm">Show only chunks with errors</span>
        </label>
      </div>

      {/* Video ID Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Video ID</Label>
        <Input
          placeholder="Filter by video_id..."
          value={filter.videoId || ''}
          onChange={(e) => 
            onChange({ videoId: e.target.value || undefined })
          }
        />
      </div>
    </>
  );
}

// =============================================================================
// Video Filters
// =============================================================================

interface VideoFiltersProps {
  filter: VideoFilter;
  onChange: (updates: Partial<VideoFilter>) => void;
}

function VideoFilters({ filter, onChange }: VideoFiltersProps) {
  return (
    <>
      {/* Min Views */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min Views</Label>
          <span className="text-sm font-mono text-neutral-500">
            {(filter.minViews || 0).toLocaleString()}
          </span>
        </div>
        <Slider
          value={[filter.minViews || 0]}
          onValueChange={([value]) => 
            onChange({ minViews: value > 0 ? value : undefined })
          }
          max={100000}
          step={1000}
          className="w-full"
        />
      </div>

      {/* Has Transcript */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Transcript</Label>
        <Select
          value={filter.hasTranscript === undefined ? 'any' : filter.hasTranscript ? 'yes' : 'no'}
          onValueChange={(value) => {
            onChange({
              hasTranscript: value === 'any' ? undefined : value === 'yes',
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="yes">Has transcript</SelectItem>
            <SelectItem value="no">No transcript</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range - Start */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Published After</Label>
        <Input
          type="date"
          value={filter.dateRange?.start || ''}
          onChange={(e) => 
            onChange({
              dateRange: {
                ...filter.dateRange,
                start: e.target.value || undefined,
              },
            })
          }
        />
      </div>

      {/* Date Range - End */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Published Before</Label>
        <Input
          type="date"
          value={filter.dateRange?.end || ''}
          onChange={(e) => 
            onChange({
              dateRange: {
                ...filter.dateRange,
                end: e.target.value || undefined,
              },
            })
          }
        />
      </div>
    </>
  );
}
```

#### Step 3: Update Hooks to Support Filtering

**File**: `src/hooks/use-viewer-data.ts`

Update `useCollectionQuery` to accept filter:

```typescript
import type { CollectionFilter, filterToMongoQuery } from '@/types/viewer-filter';

/**
 * Options for collection query
 */
interface CollectionQueryOptions {
  skip?: number;
  limit?: number;
  sort?: SortOption[];
  filter?: CollectionFilter;  // NEW
  enabled?: boolean;
}

/**
 * Query collection with pagination and filtering
 */
export function useCollectionQuery(
  db: string | null,
  collection: string | null,
  options: CollectionQueryOptions = {}
) {
  const { skip = 0, limit = 20, sort, filter, enabled = true } = options;

  // Convert UI filter to MongoDB query
  const mongoFilter = useMemo(() => {
    if (!filter) return undefined;
    const query = filterToMongoQuery(filter);
    return Object.keys(query).length > 0 ? query : undefined;
  }, [filter]);

  // Create stable query key including filter
  const filterKey = useMemo(() => {
    if (!mongoFilter) return '';
    return JSON.stringify(mongoFilter);
  }, [mongoFilter]);

  return useQuery({
    queryKey: queryKeys.viewer.query(db || '', collection || '', filterKey),
    queryFn: () =>
      viewerApi.queryCollection({
        db_name: db!,
        collection_name: collection!,
        filter: mongoFilter,
        skip,
        limit,
        sort,
      }),
    enabled: enabled && !!db && !!collection,
  });
}
```

**File**: `src/lib/query-keys.ts`

Update query key to include filter:

```typescript
viewer: {
  // ... existing keys
  query: (db: string, collection: string, filter?: string) => 
    ['viewer', 'query', db, collection, filter || ''] as const,
}
```

#### Step 4: Integrate Filter Panel into Viewer Page

**File**: `src/app/viewer/page.tsx`

Add filter state and integrate component:

```typescript
// Add imports
import { CollectionFilterPanel } from '@/components/viewer/collection-filter-panel';
import type { CollectionFilter } from '@/types/viewer-filter';

// Add state after other state declarations (around line 65)
const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>({});

// Reset filter when collection changes
useEffect(() => {
  setCollectionFilter({});
  setQuerySkip(0);
}, [selectedCollection]);

// Update useCollectionQuery call to include filter
const {
  data: collectionData,
  isLoading: isLoadingCollection,
  isFetching: isFetchingCollection,
} = useCollectionQuery(selectedDatabase, selectedCollection, {
  skip: querySkip,
  limit: queryLimit,
  sort: querySort,
  filter: collectionFilter,  // ADD THIS
  enabled: !!selectedDatabase && !!selectedCollection && !selectedDocumentId,
});

// Handler for filter changes
const handleFilterChange = useCallback((filter: CollectionFilter) => {
  setCollectionFilter(filter);
  setQuerySkip(0); // Reset to first page when filter changes
}, []);

const handleFilterClear = useCallback(() => {
  setCollectionFilter({});
  setQuerySkip(0);
}, []);

// In the render, add filter panel after the header (around line 295):
{hasData && !selectedDocumentId && selectedCollection && (
  <CollectionFilterPanel
    collection={selectedCollection}
    currentFilter={collectionFilter}
    onFilterChange={handleFilterChange}
    onClear={handleFilterClear}
  />
)}
```

---

### Task 1.3: Add Document Search (3h)

The CollectionFilterPanel already includes search functionality. This task is about making it more prominent and adding keyboard shortcuts.

#### Step 1: Add Global Search Keyboard Shortcut

**File**: `src/app/viewer/page.tsx`

Add keyboard handler in a `useEffect`:

```typescript
// Add keyboard shortcut for search focus
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ⌘/ or Ctrl+/ to focus search
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      const searchInput = document.querySelector('[data-viewer-search]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

Update the search input in `collection-filter-panel.tsx` to add the data attribute:

```typescript
<Input
  data-viewer-search  // ADD THIS
  placeholder="Search documents... (⌘/)"
  // ... rest of props
/>
```

---

### Task 1.4: Improve Navigation UX (6h)

**Goal**: Add persistent database/collection selectors visible at all times

#### Step 1: Create Viewer Navigation Header Component

**File**: `src/components/viewer/viewer-nav-header.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Database, ChevronRight, FolderOpen, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useViewerDatabases, useViewerCollections } from '@/hooks/use-viewer-data';
import type { RendererType } from '@/types/viewer-api';

interface ViewerNavHeaderProps {
  selectedDatabase: string | null;
  selectedCollection: string | null;
  selectedDocumentId: string | null;
  currentRenderer: RendererType;
  availableRenderers: RendererType[];
  totalDocuments?: number;
  onDatabaseChange: (db: string) => void;
  onCollectionChange: (collection: string, renderer: RendererType) => void;
  onRendererChange: (renderer: RendererType) => void;
  onBackToCollection: () => void;
  onOpenBrowser: () => void;
  className?: string;
}

export function ViewerNavHeader({
  selectedDatabase,
  selectedCollection,
  selectedDocumentId,
  currentRenderer,
  availableRenderers,
  totalDocuments,
  onDatabaseChange,
  onCollectionChange,
  onRendererChange,
  onBackToCollection,
  onOpenBrowser,
  className,
}: ViewerNavHeaderProps) {
  const { data: databasesData, isLoading: dbLoading } = useViewerDatabases();
  const { data: collectionsData, isLoading: collLoading } = useViewerCollections(selectedDatabase);

  const databases = databasesData?.databases || [];
  const collections = collectionsData?.collections || [];

  return (
    <div className={cn(
      'border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950',
      className
    )}>
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Database selector */}
        <Select
          value={selectedDatabase || undefined}
          onValueChange={onDatabaseChange}
        >
          <SelectTrigger className="w-[180px] h-9">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-neutral-500" />
              <SelectValue placeholder="Select database..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {databases.map((db) => (
              <SelectItem key={db.name} value={db.name}>
                <div className="flex items-center justify-between w-full">
                  <span>{db.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {db.collections}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ChevronRight className="h-4 w-4 text-neutral-400" />

        {/* Collection selector */}
        <Select
          value={selectedCollection || undefined}
          onValueChange={(value) => {
            const coll = collections.find((c) => c.name === value);
            onCollectionChange(value, coll?.suggested_renderer || 'json');
          }}
          disabled={!selectedDatabase}
        >
          <SelectTrigger className="w-[200px] h-9">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-neutral-500" />
              <SelectValue placeholder="Select collection..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {collections.map((coll) => (
              <SelectItem key={coll.name} value={coll.name}>
                <div className="flex items-center justify-between w-full">
                  <span>{coll.name}</span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {coll.document_count.toLocaleString()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Document indicator */}
        {selectedDocumentId && (
          <>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToCollection}
              className="h-9 text-sm gap-2"
            >
              <span className="font-mono text-xs">
                {selectedDocumentId.substring(0, 8)}...
              </span>
              <Badge variant="outline" className="text-xs">
                ← Back
              </Badge>
            </Button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Document count */}
        {totalDocuments !== undefined && !selectedDocumentId && (
          <span className="text-sm text-neutral-500">
            {totalDocuments.toLocaleString()} documents
          </span>
        )}

        {/* Renderer selector */}
        {!selectedDocumentId && availableRenderers.length > 1 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Select
              value={currentRenderer}
              onValueChange={(value) => onRendererChange(value as RendererType)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRenderers.map((renderer) => (
                  <SelectItem key={renderer} value={renderer}>
                    {renderer === 'long_text' && 'Text Viewer'}
                    {renderer === 'json' && 'JSON Tree'}
                    {renderer === 'table' && 'Table View'}
                    {renderer === 'chunks' && 'Chunks'}
                    {renderer === 'entity' && 'Entity Cards'}
                    {renderer === 'community' && 'Communities'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Quick browser button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenBrowser}
          className="h-9 gap-1.5"
        >
          <Command className="h-3.5 w-3.5" />
          <span>K</span>
        </Button>
      </div>
    </div>
  );
}
```

#### Step 2: Integrate New Header into Page

**File**: `src/app/viewer/page.tsx`

Replace the existing header section (around lines 241-295) with the new component:

```typescript
// Add import
import { ViewerNavHeader } from '@/components/viewer/viewer-nav-header';

// Replace the header section
{/* Navigation Header - always visible when data selected */}
<ViewerNavHeader
  selectedDatabase={selectedDatabase}
  selectedCollection={selectedCollection}
  selectedDocumentId={selectedDocumentId}
  currentRenderer={currentRenderer}
  availableRenderers={availableRenderers}
  totalDocuments={collectionData?.total}
  onDatabaseChange={(db) => {
    setSelectedDatabase(db);
    setSelectedCollection(null);
    setSelectedDocumentId(null);
    setCollectionFilter({});
  }}
  onCollectionChange={(collection, renderer) => {
    setSelectedCollection(collection);
    setSelectedDocumentId(null);
    setCurrentRenderer(renderer);
    setCollectionFilter({});
    setQuerySkip(0);
  }}
  onRendererChange={handleRendererChange}
  onBackToCollection={handleBackToCollection}
  onOpenBrowser={() => setIsBrowserOpen(true)}
/>
```

---

### Task 1.5: Add Breadcrumb Trail (2h)

This is now integrated into the `ViewerNavHeader` component above. The selectors serve as the breadcrumb, with clear visual separation and the ability to click back to any level.

---

## 3. Phase 2: Core UX Enhancements

### Task 2.1: Add Comparison View (8h)

**Goal**: Side-by-side document comparison with diff highlighting

#### Step 1: Create Backend Endpoint

This uses the existing `/viewer/compare` endpoint from the Iteration API. If not implemented, add to `GraphRAG/app/stages_api/api.py`:

```python
# Route: GET /viewer/compare/{db}/{collection}/{id1}/{id2}
if method == "GET" and path.startswith("viewer/compare/"):
    parts = path.replace("viewer/compare/", "").split("/")
    if len(parts) == 4:
        db_name, collection_name, doc_id_1, doc_id_2 = parts
        from .iteration import compare_documents
        return compare_documents(db_name, collection_name, doc_id_1, doc_id_2)
```

#### Step 2: Create Comparison View Component

**File**: `src/components/viewer/comparison-view.tsx` (NEW)

```typescript
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, ArrowLeftRight, Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ComparisonViewProps {
  leftDoc: Record<string, unknown>;
  rightDoc: Record<string, unknown>;
  leftLabel?: string;
  rightLabel?: string;
  onClose: () => void;
  className?: string;
}

interface TextDiff {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  text: string;
  leftText?: string;
  rightText?: string;
}

/**
 * Calculate text differences using simple word-by-word comparison
 */
function calculateTextDiff(left: string, right: string): TextDiff[] {
  const leftWords = left.split(/(\s+)/);
  const rightWords = right.split(/(\s+)/);
  
  const diffs: TextDiff[] = [];
  const maxLen = Math.max(leftWords.length, rightWords.length);
  
  for (let i = 0; i < maxLen; i++) {
    const leftWord = leftWords[i] || '';
    const rightWord = rightWords[i] || '';
    
    if (leftWord === rightWord) {
      if (leftWord) {
        diffs.push({ type: 'equal', text: leftWord });
      }
    } else if (!leftWord) {
      diffs.push({ type: 'insert', text: rightWord });
    } else if (!rightWord) {
      diffs.push({ type: 'delete', text: leftWord });
    } else {
      diffs.push({ type: 'replace', text: rightWord, leftText: leftWord, rightText: rightWord });
    }
  }
  
  return diffs;
}

/**
 * Calculate similarity percentage
 */
function calculateSimilarity(left: string, right: string): number {
  if (!left && !right) return 100;
  if (!left || !right) return 0;
  
  const leftWords = new Set(left.toLowerCase().split(/\s+/));
  const rightWords = new Set(right.toLowerCase().split(/\s+/));
  
  let matches = 0;
  leftWords.forEach(word => {
    if (rightWords.has(word)) matches++;
  });
  
  const total = leftWords.size + rightWords.size;
  return Math.round((2 * matches / total) * 100);
}

export function ComparisonView({
  leftDoc,
  rightDoc,
  leftLabel = 'Version A',
  rightLabel = 'Version B',
  onClose,
  className,
}: ComparisonViewProps) {
  const [syncScroll, setSyncScroll] = useState(true);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  // Get all fields from both documents
  const allFields = useMemo(() => {
    const fields = new Set([
      ...Object.keys(leftDoc),
      ...Object.keys(rightDoc),
    ]);
    return Array.from(fields).filter(f => f !== '_id');
  }, [leftDoc, rightDoc]);

  // Find text field for detailed comparison
  const textField = useMemo(() => {
    const candidates = ['text', 'transcript', 'content', 'description', 'summary'];
    return candidates.find(f => leftDoc[f] || rightDoc[f]) || null;
  }, [leftDoc, rightDoc]);

  // Calculate diffs for text field
  const textDiffs = useMemo(() => {
    if (!textField) return null;
    const leftText = String(leftDoc[textField] || '');
    const rightText = String(rightDoc[textField] || '');
    return {
      diffs: calculateTextDiff(leftText, rightText),
      similarity: calculateSimilarity(leftText, rightText),
      leftLength: leftText.length,
      rightLength: rightText.length,
    };
  }, [leftDoc, rightDoc, textField]);

  // Sync scroll
  useEffect(() => {
    if (!syncScroll) return;

    const handleLeftScroll = () => {
      if (rightRef.current && leftRef.current) {
        rightRef.current.scrollTop = leftRef.current.scrollTop;
      }
    };

    const handleRightScroll = () => {
      if (leftRef.current && rightRef.current) {
        leftRef.current.scrollTop = rightRef.current.scrollTop;
      }
    };

    const leftEl = leftRef.current;
    const rightEl = rightRef.current;

    leftEl?.addEventListener('scroll', handleLeftScroll);
    rightEl?.addEventListener('scroll', handleRightScroll);

    return () => {
      leftEl?.removeEventListener('scroll', handleLeftScroll);
      rightEl?.removeEventListener('scroll', handleRightScroll);
    };
  }, [syncScroll]);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Compare Documents</h2>
          <Badge variant="outline">
            {textDiffs ? `${textDiffs.similarity}% similar` : 'Comparing...'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Sync scroll toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="sync-scroll"
              checked={syncScroll}
              onCheckedChange={setSyncScroll}
            />
            <Label htmlFor="sync-scroll" className="text-sm cursor-pointer">
              Sync scroll
            </Label>
          </div>
          
          {/* Field selector */}
          <Select
            value={selectedField || textField || 'all'}
            onValueChange={(value) => setSelectedField(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {allFields.map((field) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {textDiffs && (
        <div className="px-6 py-2 bg-neutral-50 dark:bg-neutral-900 border-b text-sm">
          <div className="flex items-center gap-6">
            <span>
              <strong>Left:</strong> {textDiffs.leftLength.toLocaleString()} chars
            </span>
            <span>
              <strong>Right:</strong> {textDiffs.rightLength.toLocaleString()} chars
            </span>
            <span>
              <strong>Difference:</strong>{' '}
              {textDiffs.rightLength - textDiffs.leftLength > 0 ? '+' : ''}
              {(textDiffs.rightLength - textDiffs.leftLength).toLocaleString()} chars
            </span>
          </div>
        </div>
      )}

      {/* Comparison panels */}
      <div className="flex-1 grid grid-cols-2 divide-x overflow-hidden">
        {/* Left panel */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-b">
            <span className="font-medium text-sm">{leftLabel}</span>
          </div>
          <ScrollArea ref={leftRef} className="flex-1 p-4">
            {selectedField ? (
              <FieldComparison
                field={selectedField}
                value={leftDoc[selectedField]}
                otherValue={rightDoc[selectedField]}
                side="left"
                onCopy={(text) => handleCopy(text, `left-${selectedField}`)}
                isCopied={copiedField === `left-${selectedField}`}
              />
            ) : (
              <div className="space-y-4">
                {allFields.map((field) => (
                  <FieldComparison
                    key={field}
                    field={field}
                    value={leftDoc[field]}
                    otherValue={rightDoc[field]}
                    side="left"
                    onCopy={(text) => handleCopy(text, `left-${field}`)}
                    isCopied={copiedField === `left-${field}`}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-b">
            <span className="font-medium text-sm">{rightLabel}</span>
          </div>
          <ScrollArea ref={rightRef} className="flex-1 p-4">
            {selectedField ? (
              <FieldComparison
                field={selectedField}
                value={rightDoc[selectedField]}
                otherValue={leftDoc[selectedField]}
                side="right"
                onCopy={(text) => handleCopy(text, `right-${selectedField}`)}
                isCopied={copiedField === `right-${selectedField}`}
              />
            ) : (
              <div className="space-y-4">
                {allFields.map((field) => (
                  <FieldComparison
                    key={field}
                    field={field}
                    value={rightDoc[field]}
                    otherValue={leftDoc[field]}
                    side="right"
                    onCopy={(text) => handleCopy(text, `right-${field}`)}
                    isCopied={copiedField === `right-${field}`}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Field Comparison Component
// =============================================================================

interface FieldComparisonProps {
  field: string;
  value: unknown;
  otherValue: unknown;
  side: 'left' | 'right';
  onCopy: (text: string) => void;
  isCopied: boolean;
}

function FieldComparison({ field, value, otherValue, side, onCopy, isCopied }: FieldComparisonProps) {
  const isEqual = JSON.stringify(value) === JSON.stringify(otherValue);
  const isAdded = value !== undefined && otherValue === undefined && side === 'right';
  const isRemoved = value !== undefined && otherValue === undefined && side === 'left';
  const isMissing = value === undefined;

  const stringValue = value === undefined ? '' : 
    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

  return (
    <Card className={cn(
      'relative',
      isEqual && 'border-neutral-200 dark:border-neutral-800',
      !isEqual && !isMissing && 'border-amber-300 dark:border-amber-700',
      isAdded && 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20',
      isRemoved && 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20',
      isMissing && 'border-dashed opacity-50',
    )}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-neutral-500">
            {field}
          </CardTitle>
          <div className="flex items-center gap-1">
            {!isEqual && !isMissing && (
              <Badge variant="secondary" className="text-xs">
                Changed
              </Badge>
            )}
            {isAdded && (
              <Badge className="text-xs bg-green-500">Added</Badge>
            )}
            {isRemoved && (
              <Badge className="text-xs bg-red-500">Removed</Badge>
            )}
            {stringValue && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onCopy(stringValue)}
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-3">
        {isMissing ? (
          <span className="text-sm text-neutral-400 italic">Field not present</span>
        ) : typeof value === 'string' && value.length > 100 ? (
          <pre className="text-sm whitespace-pre-wrap font-mono text-neutral-700 dark:text-neutral-300 max-h-64 overflow-auto">
            {stringValue}
          </pre>
        ) : (
          <span className="text-sm">
            {typeof value === 'object' ? (
              <pre className="font-mono text-xs">{stringValue}</pre>
            ) : (
              stringValue
            )}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 2.2: Add Collection Insights Panel (4h)

**File**: `src/components/viewer/collection-insights.tsx` (NEW)

```typescript
'use client';

import { useMemo } from 'react';
import { BarChart3, FileText, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useViewerCollectionSchema } from '@/hooks/use-viewer-data';

interface CollectionInsightsProps {
  dbName: string;
  collection: string;
  totalDocs: number;
  documents: Record<string, unknown>[];
  className?: string;
}

export function CollectionInsights({
  dbName,
  collection,
  totalDocs,
  documents,
  className,
}: CollectionInsightsProps) {
  const { data: schema } = useViewerCollectionSchema(dbName, collection);

  // Calculate insights based on collection type
  const insights = useMemo(() => {
    if (!documents.length) return null;

    // For entities collection
    if (collection === 'entities') {
      const typeCounts: Record<string, number> = {};
      let lowTrustCount = 0;
      let noDescCount = 0;
      
      documents.forEach((doc) => {
        const type = String(doc.type || 'unknown');
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        
        const trust = Number(doc.trust_score || doc.confidence || 1);
        if (trust < 0.7) lowTrustCount++;
        if (!doc.description) noDescCount++;
      });
      
      return {
        type: 'entities',
        typeCounts,
        lowTrustCount,
        lowTrustPct: Math.round((lowTrustCount / documents.length) * 100),
        noDescCount,
        noDescPct: Math.round((noDescCount / documents.length) * 100),
      };
    }

    // For video_chunks collection
    if (collection === 'video_chunks') {
      const statusCounts: Record<string, number> = { completed: 0, failed: 0, pending: 0, warning: 0 };
      let hasErrorCount = 0;
      
      documents.forEach((doc) => {
        const extraction = doc.graphrag_extraction as { status?: string; error?: string } | undefined;
        const status = extraction?.status || 'pending';
        if (status in statusCounts) {
          statusCounts[status]++;
        }
        if (extraction?.error) hasErrorCount++;
      });
      
      return {
        type: 'chunks',
        statusCounts,
        completedPct: Math.round((statusCounts.completed / documents.length) * 100),
        failedPct: Math.round((statusCounts.failed / documents.length) * 100),
        hasErrorCount,
      };
    }

    // For raw_videos / transcripts
    if (['raw_videos', 'cleaned_transcripts', 'enriched_transcripts'].includes(collection)) {
      let hasTranscript = 0;
      let totalViews = 0;
      const channels: Record<string, number> = {};
      
      documents.forEach((doc) => {
        if (doc.transcript || doc.transcript_raw || doc.content) hasTranscript++;
        totalViews += Number(doc.stats?.viewCount || 0);
        
        const channel = String(doc.channel_title || 'unknown');
        channels[channel] = (channels[channel] || 0) + 1;
      });
      
      return {
        type: 'videos',
        hasTranscriptCount: hasTranscript,
        hasTranscriptPct: Math.round((hasTranscript / documents.length) * 100),
        totalViews,
        avgViews: Math.round(totalViews / documents.length),
        channelCount: Object.keys(channels).length,
        topChannels: Object.entries(channels)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, count]) => ({ name, count })),
      };
    }

    return null;
  }, [collection, documents]);

  if (!insights) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Entity insights */}
      {insights.type === 'entities' && (
        <>
          {/* Type distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(insights.typeCounts).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs w-24 truncate">{type}</span>
                    <Progress
                      value={(count / documents.length) * 100}
                      className="flex-1 h-2"
                    />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality indicators */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Quality Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Low trust score (&lt;0.7)</span>
                <Badge variant={insights.lowTrustPct > 20 ? 'destructive' : 'secondary'}>
                  {insights.lowTrustCount} ({insights.lowTrustPct}%)
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Missing description</span>
                <Badge variant={insights.noDescPct > 30 ? 'destructive' : 'secondary'}>
                  {insights.noDescCount} ({insights.noDescPct}%)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Chunk insights */}
      {insights.type === 'chunks' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Completed: {insights.statusCounts.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Failed: {insights.statusCounts.failed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Pending: {insights.statusCounts.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">Warning: {insights.statusCounts.warning}</span>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <Progress value={insights.completedPct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {insights.completedPct}% processing complete
              </p>
            </div>

            {insights.hasErrorCount > 0 && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{insights.hasErrorCount} chunks have errors</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video insights */}
      {insights.type === 'videos' && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Has transcript</span>
                <Badge variant={insights.hasTranscriptPct < 80 ? 'secondary' : 'default'}>
                  {insights.hasTranscriptCount} ({insights.hasTranscriptPct}%)
                </Badge>
              </div>
              <Progress value={insights.hasTranscriptPct} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.topChannels.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{name}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                {insights.channelCount} channels • {insights.avgViews.toLocaleString()} avg views
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

---

### Task 2.3: Add Document Detail View (6h)

See the `DocumentDetailPanel` implementation in the UX Enhancement Review document. This component should be created at `src/components/viewer/document-detail-panel.tsx` and integrated into the viewer page as a slide-out panel when viewing a single document.

---

### Task 2.4: Add Bulk Operations UI (6h)

**File**: `src/components/viewer/bulk-actions-bar.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import { Trash2, Download, RefreshCw, Copy, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onExport?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onReprocess?: (ids: string[]) => void;
  className?: string;
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  onExport,
  onDelete,
  onReprocess,
  className,
}: BulkActionsBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  return (
    <>
      <div className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3',
        'bg-white dark:bg-neutral-900 rounded-lg shadow-lg border',
        className
      )}>
        <Badge variant="secondary" className="text-sm">
          {count} selected
        </Badge>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExport(selectedIds)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}

        {onReprocess && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReprocess(selectedIds)}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reprocess
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(selectedIds.join('\n'));
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copy IDs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} documents?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete?.(selectedIds);
                setDeleteDialogOpen(false);
                onClearSelection();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### Task 2.5: Add Saved Filter Sets (4h)

This will require:
1. Local storage persistence for saved filters
2. A dropdown to load saved filters
3. A dialog to name and save current filter

**File**: `src/hooks/use-saved-filters.ts` (NEW)

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CollectionFilter, SavedFilter } from '@/types/viewer-filter';

const STORAGE_KEY = 'viewer-saved-filters';

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load saved filters:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when filters change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters));
    }
  }, [savedFilters, isLoaded]);

  const saveFilter = useCallback((name: string, collection: string, filter: CollectionFilter) => {
    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name,
      collection,
      filter,
      createdAt: new Date().toISOString(),
    };
    setSavedFilters((prev) => [...prev, newFilter]);
    return newFilter;
  }, []);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const getFiltersForCollection = useCallback((collection: string) => {
    return savedFilters.filter((f) => f.collection === collection);
  }, [savedFilters]);

  return {
    savedFilters,
    isLoaded,
    saveFilter,
    deleteFilter,
    getFiltersForCollection,
  };
}
```

---

## 4. File Structure & Dependencies

### New Files to Create

```
StagesUI/src/
├── types/
│   └── viewer-filter.ts           # NEW - Filter type definitions
├── components/viewer/
│   ├── text-list-viewer.tsx       # NEW - Text collection list
│   ├── collection-filter-panel.tsx # NEW - Filter panel
│   ├── viewer-nav-header.tsx      # NEW - Persistent nav
│   ├── comparison-view.tsx        # NEW - Side-by-side diff
│   ├── collection-insights.tsx    # NEW - Quick stats
│   ├── document-detail-panel.tsx  # NEW - Detail view
│   └── bulk-actions-bar.tsx       # NEW - Multi-select actions
├── hooks/
│   └── use-saved-filters.ts       # NEW - Saved filter persistence
└── lib/
    └── query-keys.ts              # UPDATE - Add filter to query key
```

### Files to Modify

```
StagesUI/src/
├── app/viewer/page.tsx            # MAJOR - Integrate all new components
├── hooks/use-viewer-data.ts       # UPDATE - Add filter support
└── types/viewer-api.ts            # UPDATE - Export types needed
```

### Dependencies (already installed)

All required UI components already exist in `src/components/ui/`:
- Card, Button, Input, Label, Slider, Checkbox, Badge
- Select, Collapsible, ScrollArea, Separator, Switch
- AlertDialog, DropdownMenu, Tabs, Skeleton, Progress

---

## 5. Implementation Order

### Day 1-2: Phase 1 Critical Fixes

1. **Morning Day 1**: Fix text viewer (Task 1.1)
   - Fix text extraction logic
   - Create TextListViewer component
   - Test with cleaned_transcripts, raw_videos

2. **Afternoon Day 1**: Add filtering (Task 1.2)
   - Create filter types
   - Create CollectionFilterPanel
   - Update hooks for filter support

3. **Morning Day 2**: Finish filtering + navigation (Tasks 1.3, 1.4)
   - Add keyboard shortcuts
   - Create ViewerNavHeader
   - Integrate into page

4. **Afternoon Day 2**: Testing + Polish
   - Test all Phase 1 features
   - Fix bugs
   - Optimize performance

### Day 3-4: Phase 2 Core Enhancements

5. **Day 3**: Comparison + Insights (Tasks 2.1, 2.2)
   - Create ComparisonView
   - Create CollectionInsights
   - Add comparison trigger in UI

6. **Day 4**: Detail View + Bulk Ops (Tasks 2.3, 2.4)
   - Create DocumentDetailPanel
   - Create BulkActionsBar
   - Add selection state management

### Day 5: Saved Filters + Final Testing

7. **Morning Day 5**: Saved filters (Task 2.5)
   - Create useSavedFilters hook
   - Add UI for save/load

8. **Afternoon Day 5**: Integration Testing
   - Full workflow testing
   - Performance testing
   - Bug fixes

---

## 6. Testing Strategy

### Unit Tests

For each new component, test:
- Renders correctly with props
- Handles empty state
- Handles loading state
- Callback functions called correctly

### Integration Tests

Test complete workflows:
1. Database → Collection → Document navigation
2. Apply filter → See results → Clear filter
3. Select documents → Bulk action → Confirm
4. Save filter → Reload page → Load filter

### Manual Testing Checklist

- [ ] Can browse databases and collections
- [ ] Can filter entities by type and trust
- [ ] Can filter chunks by status
- [ ] Can filter videos by transcript and views
- [ ] Search works and highlights results
- [ ] Can view text content from cleaned_transcripts
- [ ] Can compare two documents
- [ ] Collection insights show accurate stats
- [ ] Bulk selection and actions work
- [ ] Saved filters persist across sessions
- [ ] Keyboard shortcuts work (⌘K, ⌘/)
- [ ] Loading states appear appropriately
- [ ] Error states show helpful messages

---

## 7. Success Criteria

### Phase 1 Complete When:

- [ ] Text content from `cleaned_transcripts` displays correctly
- [ ] Entity filtering by type/trust works
- [ ] Chunk filtering by status works
- [ ] Video filtering by transcript/views works
- [ ] Document search finds results
- [ ] Database/collection can be changed without modal
- [ ] ⌘K shortcut opens browser

### Phase 2 Complete When:

- [ ] Can compare two documents side-by-side
- [ ] Collection insights show stats
- [ ] Document detail panel shows all info
- [ ] Can select multiple documents
- [ ] Bulk export works
- [ ] Can save and load filter presets

---

**Document Owner**: System Architect  
**Last Updated**: December 11, 2024  
**Ready for Implementation**: ✅

