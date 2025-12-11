# Viewer Module Implementation Guide

**Project**: StagesUI Frontend  
**Target**: `src/`  
**Date**: December 11, 2025  
**Status**: Ready for Implementation  
**Version**: 2.0 (Updated based on implementation review)

---

## Executive Summary

This guide details the implementation of the extended Viewer module for StagesUI. The module extends the existing text viewer with real MongoDB data access, multiple viewer types, and collection-specific views to support pipeline fine-tuning and debugging.

### Prerequisites

⚠️ **Backend Required**: This guide assumes the Viewer API endpoints are implemented in the GraphRAG backend. See `GraphRAG/VIEWER_API_IMPLEMENTATION_GUIDE.md` for backend setup.

Required endpoints:
- `GET /viewer/databases`
- `GET /viewer/collections/{db}`
- `GET /viewer/document/{db}/{collection}/{id}`
- `POST /viewer/query`
- `GET /viewer/schema/{db}/{collection}`

### What Exists (Keep & Extend)

The viewer already has these features that should be preserved:

| Feature | Location | Keep? |
|---------|----------|-------|
| Text display with typography | `components/viewer/text-display.tsx` | **Yes** |
| Entity highlighting | `components/viewer/entity-highlighter.tsx` | **Yes** |
| Search in text | `components/viewer/search-bar.tsx` | **Yes** |
| Typography controls | `components/viewer/typography-controls.tsx` | **Yes** |
| Reading progress | `components/viewer/progress-bar.tsx` | **Yes** |
| Viewer toolbar | `components/viewer/viewer-toolbar.tsx` | **Yes** |
| ViewMode (single/split) | `app/viewer/page.tsx` | **Yes** |
| Source selector (mock) | `components/viewer/source-selector.tsx` | **Replace** |
| Mock data | `lib/mock-data/viewer-documents.ts` | **Keep for tests** |

### What to Add

1. **API Integration** - Real MongoDB data via backend API
2. **Database/Collection Browser** - Replace mock source selector
3. **JSON Viewer** - Collapsible tree for entities, relations
4. **Table Viewer** - For tabular data like entity_mentions
5. **Collection-Specific Views** - Chunks, entities, communities
6. **Renderer Router** - Auto-select appropriate viewer
7. **Error Handling** - Consistent error states across viewers

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/viewer-api.ts` | **CREATE** | API response types (prefixed to avoid conflicts) |
| `src/lib/query-keys.ts` | **MODIFY** | Add viewer query keys |
| `src/lib/api/viewer.ts` | **CREATE** | API client |
| `src/hooks/use-viewer-data.ts` | **CREATE** | React Query hooks |
| `src/components/viewer/database-browser.tsx` | **CREATE** | DB/collection selector with keyboard nav |
| `src/components/viewer/json-viewer.tsx` | **CREATE** | JSON tree viewer |
| `src/components/viewer/table-viewer.tsx` | **CREATE** | Table viewer with loading states |
| `src/components/viewer/chunks-viewer.tsx` | **CREATE** | Chunk-specific view |
| `src/components/viewer/entity-viewer.tsx` | **CREATE** | Entity card view |
| `src/components/viewer/community-viewer.tsx` | **CREATE** | Community view |
| `src/lib/viewer/renderer-selector.ts` | **CREATE** | Viewer routing logic |
| `src/app/viewer/page.tsx` | **MODIFY** | Integrate new components, preserve viewMode |
| `.env.local` | **MODIFY** | Add `NEXT_PUBLIC_STAGES_API_URL` |

---

## Phase 1: API Integration (~2 hours)

### 1.1 Create API Types

Create `src/types/viewer-api.ts`:

**Note**: Types are prefixed with `Viewer` to avoid conflicts with existing types in `management.ts`.

```typescript
// Viewer API Response Types
// Prefixed with "Viewer" to avoid conflicts with management.ts types

export interface ViewerDatabaseInfo {
  name: string;
  collections: number;
  total_documents: number;
}

export interface ViewerDatabasesResponse {
  databases: ViewerDatabaseInfo[];
  timestamp: string;
}

export interface ViewerCollectionInfo {
  name: string;
  document_count: number;
  suggested_renderer: 'long_text' | 'json' | 'table';
  text_field: string | null;
}

export interface ViewerCollectionsResponse {
  database: string;
  collections: ViewerCollectionInfo[];
  timestamp: string;
}

export interface ViewerDocumentMetadata {
  suggested_renderer: 'long_text' | 'json' | 'table';
  text_field: string | null;
  field_count: number;
  has_nested: boolean;
}

export interface ViewerDocumentResponse {
  document: Record<string, unknown>;
  metadata: ViewerDocumentMetadata;
}

export interface ViewerQuerySort {
  field: string;
  order: 'asc' | 'desc';
}

export interface ViewerQueryRequest {
  db_name: string;
  collection: string;
  filter?: Record<string, unknown>;
  projection?: string[];
  sort?: ViewerQuerySort[];
  skip?: number;
  limit?: number;
}

export interface ViewerQueryResponse {
  documents: Record<string, unknown>[];
  total: number;
  returned: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface ViewerSchemaField {
  types: string[];
  nullable: boolean;
  max_length: number;
}

export interface ViewerSchemaResponse {
  database: string;
  collection: string;
  document_count: number;
  fields: Record<string, ViewerSchemaField>;
  sample_size: number;
  suggested_renderer: 'long_text' | 'json' | 'table';
  text_field: string | null;
  timestamp: string;
}

// Renderer types for viewer routing
export type ViewerRendererType = 'long_text' | 'json' | 'table' | 'chunks' | 'entity' | 'community';

export interface ViewerState {
  database: string | null;
  collection: string | null;
  documentId: string | null;
  renderer: ViewerRendererType;
}

// Document interfaces for collection-specific viewers
// (Moved from inline definitions for reusability)

export interface ChunkDocument {
  _id: string;
  video_id?: string;
  chunk_index?: number;
  text?: string;
  graphrag_extraction?: { status?: string; timestamp?: string };
  graphrag_resolution?: { status?: string };
  graphrag_construction?: { status?: string };
  graphrag_communities?: { status?: string };
  [key: string]: unknown;
}

export interface EntityDocument {
  _id: string;
  name: string;
  type?: string;
  description?: string;
  aliases?: string[];
  mention_count?: number;
  [key: string]: unknown;
}

export interface CommunityDocument {
  _id: string;
  title?: string;
  summary?: string;
  level?: number;
  member_ids?: string[];
  member_count?: number;
  [key: string]: unknown;
}
```

### 1.2 Update Centralized Query Keys

**Modify** `src/lib/query-keys.ts` to add viewer section:

```typescript
// Add this section to the existing queryKeys object:

export const queryKeys = {
  // ... existing keys (stages, management, etc.) ...
  
  // Viewer module keys
  viewer: {
    all: ['viewer'] as const,
    databases: () => [...queryKeys.viewer.all, 'databases'] as const,
    collections: (db: string) => [...queryKeys.viewer.all, 'collections', db] as const,
    document: (db: string, coll: string, id: string) =>
      [...queryKeys.viewer.all, 'document', db, coll, id] as const,
    query: (db: string, coll: string, filter?: Record<string, unknown>) =>
      [...queryKeys.viewer.all, 'query', db, coll, filter] as const,
    schema: (db: string, coll: string) =>
      [...queryKeys.viewer.all, 'schema', db, coll] as const,
  },
};
```

### 1.3 Create API Client

Create `src/lib/api/viewer.ts`:

```typescript
import { api } from './client';
import type {
  ViewerDatabasesResponse,
  ViewerCollectionsResponse,
  ViewerDocumentResponse,
  ViewerQueryRequest,
  ViewerQueryResponse,
  ViewerSchemaResponse,
} from '@/types/viewer-api';

export const viewerApi = {
  /**
   * List all available databases
   */
  listDatabases: () =>
    api.get<ViewerDatabasesResponse>('/viewer/databases'),

  /**
   * List collections in a database
   */
  listCollections: (dbName: string) =>
    api.get<ViewerCollectionsResponse>(`/viewer/collections/${encodeURIComponent(dbName)}`),

  /**
   * Get a single document by ID
   */
  getDocument: (dbName: string, collection: string, documentId: string) =>
    api.get<ViewerDocumentResponse>(
      `/viewer/document/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`
    ),

  /**
   * Query collection with filters and pagination
   */
  queryCollection: (request: ViewerQueryRequest) =>
    api.post<ViewerQueryResponse>('/viewer/query', request),

  /**
   * Get collection schema
   */
  getSchema: (dbName: string, collection: string) =>
    api.get<ViewerSchemaResponse>(
      `/viewer/schema/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}`
    ),
};
```

### 1.4 Create React Query Hooks

Create `src/hooks/use-viewer-data.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { viewerApi } from '@/lib/api/viewer';
import { queryKeys } from '@/lib/query-keys';
import type { ViewerQueryRequest } from '@/types/viewer-api';

/**
 * Fetch list of databases
 */
export function useDatabases() {
  return useQuery({
    queryKey: queryKeys.viewer.databases(),
    queryFn: () => viewerApi.listDatabases(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch collections for a database
 */
export function useCollections(dbName: string | null) {
  return useQuery({
    queryKey: queryKeys.viewer.collections(dbName || ''),
    queryFn: () => viewerApi.listCollections(dbName!),
    enabled: !!dbName,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch a single document
 */
export function useDocument(
  dbName: string | null,
  collection: string | null,
  documentId: string | null
) {
  return useQuery({
    queryKey: queryKeys.viewer.document(dbName || '', collection || '', documentId || ''),
    queryFn: () => viewerApi.getDocument(dbName!, collection!, documentId!),
    enabled: !!dbName && !!collection && !!documentId,
  });
}

/**
 * Query collection with pagination
 */
export function useCollectionQuery(request: ViewerQueryRequest | null) {
  return useQuery({
    queryKey: queryKeys.viewer.query(
      request?.db_name || '',
      request?.collection || '',
      request?.filter
    ),
    queryFn: () => viewerApi.queryCollection(request!),
    enabled: !!request?.db_name && !!request?.collection,
  });
}

/**
 * Fetch collection schema
 */
export function useCollectionSchema(dbName: string | null, collection: string | null) {
  return useQuery({
    queryKey: queryKeys.viewer.schema(dbName || '', collection || ''),
    queryFn: () => viewerApi.getSchema(dbName!, collection!),
    enabled: !!dbName && !!collection,
    staleTime: 5 * 60 * 1000, // 5 minutes (schema rarely changes)
  });
}
```

---

## Phase 2: Database Browser (~1.5 hours)

### 2.1 Create Database Browser Component

Create `src/components/viewer/database-browser.tsx`:

**Features**: Search, keyboard navigation (↑↓ Enter Esc), error handling, loading states.

```typescript
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Database, FolderOpen, FileText, Search, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDatabases, useCollections } from '@/hooks/use-viewer-data';
import type { ViewerCollectionInfo } from '@/types/viewer-api';

interface DatabaseBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCollection: (db: string, collection: string, info: ViewerCollectionInfo) => void;
  selectedDb?: string;
  selectedCollection?: string;
}

const RENDERER_ICONS = {
  long_text: FileText,
  json: FolderOpen,
  table: Database,
};

const RENDERER_COLORS = {
  long_text: 'text-blue-500',
  json: 'text-purple-500',
  table: 'text-green-500',
};

export function DatabaseBrowser({
  isOpen,
  onClose,
  onSelectCollection,
  selectedDb,
  selectedCollection,
}: DatabaseBrowserProps) {
  const [expandedDb, setExpandedDb] = useState<string | null>(selectedDb || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: databasesData, isLoading: dbLoading, error: dbError } = useDatabases();
  const { data: collectionsData, isLoading: collLoading, error: collError } = useCollections(expandedDb);

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
  const flatItems = useMemo(() => {
    const items: { type: 'db' | 'coll'; db: string; coll?: ViewerCollectionInfo }[] = [];
    
    filteredDatabases.forEach(db => {
      items.push({ type: 'db', db: db.name });
      if (expandedDb === db.name && filteredCollections.length > 0) {
        filteredCollections.forEach(coll => {
          items.push({ type: 'coll', db: db.name, coll });
        });
      }
    });
    
    return items;
  }, [filteredDatabases, filteredCollections, expandedDb]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const item = flatItems[focusedIndex];
        if (item) {
          if (item.type === 'db') {
            setExpandedDb(expandedDb === item.db ? null : item.db);
          } else if (item.coll) {
            onSelectCollection(item.db, item.coll.name, item.coll);
            onClose();
          }
        }
        break;
    }
  }, [isOpen, flatItems, focusedIndex, expandedDb, onClose, onSelectCollection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused item into view
  useEffect(() => {
    const element = listRef.current?.querySelector(`[data-index="${focusedIndex}"]`);
    element?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  if (!isOpen) return null;

  const error = dbError || collError;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Search header */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search databases and collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {error instanceof Error ? error.message : 'Failed to load data'}
              </span>
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
              No databases found
            </div>
          ) : (
            <div className="space-y-1">
              {flatItems.map((item, index) => {
                if (item.type === 'db') {
                  const db = filteredDatabases.find(d => d.name === item.db)!;
                  return (
                    <button
                      key={`db-${item.db}`}
                      data-index={index}
                      onClick={() => setExpandedDb(expandedDb === db.name ? null : db.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                        'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
                        expandedDb === db.name && 'bg-neutral-100 dark:bg-neutral-800',
                        focusedIndex === index && 'ring-2 ring-blue-500'
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
                  );
                } else {
                  const coll = item.coll!;
                  const Icon = RENDERER_ICONS[coll.suggested_renderer];
                  const colorClass = RENDERER_COLORS[coll.suggested_renderer];
                  const isSelected = selectedDb === item.db && selectedCollection === coll.name;
                  
                  return (
                    <button
                      key={`coll-${item.db}-${coll.name}`}
                      data-index={index}
                      onClick={() => {
                        onSelectCollection(item.db, coll.name, coll);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 ml-6 rounded-lg text-left',
                        'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
                        isSelected && 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500',
                        focusedIndex === index && 'ring-2 ring-blue-500'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', colorClass)} />
                      <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">
                        {coll.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {coll.document_count.toLocaleString()}
                      </span>
                    </button>
                  );
                }
              })}
              
              {/* Loading collections */}
              {expandedDb && collLoading && (
                <div className="ml-6 p-2 text-sm text-neutral-500">Loading collections...</div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">↑↓</kbd> Navigate
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">Enter</kbd> Select
          <span className="mx-2">·</span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">Esc</kbd> Close
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3: JSON Viewer (~2 hours)

### 3.1 Create JSON Viewer Component

Create `src/components/viewer/json-viewer.tsx`:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  initialExpanded?: boolean;
  maxDepth?: number;
  className?: string;
}

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  maxDepth: number;
  initialExpanded: boolean;
}

// Type colors - consider moving to CSS variables for theming
const TYPE_COLORS = {
  string: 'text-green-600 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  null: 'text-gray-500',
  key: 'text-red-600 dark:text-red-400',
};

function JsonNode({ keyName, value, depth, maxDepth, initialExpanded }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(
    initialExpanded && depth < 2 // Auto-expand first 2 levels
  );

  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);
  const canExpand = isObject && depth < maxDepth;

  // Render primitive value
  const renderValue = () => {
    if (value === null) {
      return <span className={TYPE_COLORS.null}>null</span>;
    }
    if (typeof value === 'string') {
      // Truncate long strings
      const displayValue = value.length > 100 
        ? `"${value.slice(0, 100)}..."` 
        : `"${value}"`;
      return <span className={TYPE_COLORS.string}>{displayValue}</span>;
    }
    if (typeof value === 'number') {
      return <span className={TYPE_COLORS.number}>{value}</span>;
    }
    if (typeof value === 'boolean') {
      return <span className={TYPE_COLORS.boolean}>{value.toString()}</span>;
    }
    return <span>{String(value)}</span>;
  };

  // Count children
  const childCount = isObject 
    ? (isArray ? (value as unknown[]).length : Object.keys(value as object).length)
    : 0;

  // Preview for collapsed objects
  const preview = useMemo(() => {
    if (!isObject || isExpanded) return null;
    
    if (isArray) {
      return `Array(${childCount})`;
    }
    
    const keys = Object.keys(value as object).slice(0, 3);
    return `{${keys.join(', ')}${childCount > 3 ? ', ...' : ''}}`;
  }, [isObject, isArray, isExpanded, childCount, value]);

  return (
    <div className="font-mono text-sm">
      <div 
        className={cn(
          'flex items-start gap-1',
          canExpand && 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded'
        )}
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse toggle */}
        {canExpand && (
          <span className="w-4 h-4 flex items-center justify-center text-neutral-400">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!canExpand && <span className="w-4" />}

        {/* Key name */}
        {keyName !== undefined && (
          <>
            <span className={TYPE_COLORS.key}>&quot;{keyName}&quot;</span>
            <span className="text-neutral-500">: </span>
          </>
        )}

        {/* Value or preview */}
        {!isObject ? (
          renderValue()
        ) : !isExpanded ? (
          <span className="text-neutral-500">{preview}</span>
        ) : (
          <span className="text-neutral-500">{isArray ? '[' : '{'}</span>
        )}
      </div>

      {/* Children */}
      {isObject && isExpanded && (
        <div className="ml-4 border-l border-neutral-200 dark:border-neutral-700 pl-2">
          {isArray
            ? (value as unknown[]).map((item, index) => (
                <JsonNode
                  key={index}
                  keyName={String(index)}
                  value={item}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  initialExpanded={initialExpanded}
                />
              ))
            : Object.entries(value as object).map(([key, val]) => (
                <JsonNode
                  key={key}
                  keyName={key}
                  value={val}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  initialExpanded={initialExpanded}
                />
              ))}
          <span className="text-neutral-500">{isArray ? ']' : '}'}</span>
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ 
  data, 
  initialExpanded = true, 
  maxDepth = 10,
  className 
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        title="Copy JSON"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-neutral-500" />
        )}
      </button>

      {/* JSON tree */}
      <div className="p-4 overflow-x-auto">
        <JsonNode
          value={data}
          depth={0}
          maxDepth={maxDepth}
          initialExpanded={initialExpanded}
        />
      </div>
    </div>
  );
}
```

---

## Phase 4: Table Viewer (~1.5 hours)

### 4.1 Create Table Viewer Component

Create `src/components/viewer/table-viewer.tsx`:

**Features**: Loading states, sorting, pagination, row click.

```typescript
'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableViewerProps {
  documents: Record<string, unknown>[];
  total: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onRowClick?: (doc: Record<string, unknown>) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function TableViewer({
  documents,
  total,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onRowClick,
  className,
}: TableViewerProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });

  // Infer columns from documents
  const columns = useMemo(() => {
    if (documents.length === 0) return [];
    
    const allKeys = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    
    // Prioritize _id, then sort alphabetically
    const keys = Array.from(allKeys);
    keys.sort((a, b) => {
      if (a === '_id') return -1;
      if (b === '_id') return 1;
      return a.localeCompare(b);
    });
    
    return keys;
  }, [documents]);

  // Sort documents locally
  const sortedDocuments = useMemo(() => {
    if (!sortState.column || !sortState.direction) return documents;
    
    return [...documents].sort((a, b) => {
      const aVal = a[sortState.column!];
      const bVal = b[sortState.column!];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [documents, sortState]);

  // Handle column sort
  const handleSort = (column: string) => {
    setSortState(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  };

  // Format cell value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 50) + '...';
    if (typeof value === 'string' && value.length > 100) return value.slice(0, 100) + '...';
    return String(value);
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
            <tr>
              {columns.map(column => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400',
                    'border-b border-neutral-200 dark:border-neutral-700',
                    'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 select-none'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{column}</span>
                    {sortState.column === column ? (
                      sortState.direction === 'asc' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDocuments.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral-500">
                  No documents found
                </td>
              </tr>
            ) : (
              sortedDocuments.map((doc, rowIndex) => (
                <tr
                  key={doc._id as string || rowIndex}
                  onClick={() => onRowClick?.(doc)}
                  className={cn(
                    'border-b border-neutral-100 dark:border-neutral-800',
                    'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map(column => (
                    <td
                      key={column}
                      className="px-4 py-3 text-neutral-700 dark:text-neutral-300"
                    >
                      <span className="truncate block max-w-[300px]" title={String(doc[column])}>
                        {formatValue(doc[column])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
        <div className="text-sm text-neutral-500">
          {total > 0 
            ? `Showing ${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, total)} of ${total.toLocaleString()}`
            : 'No results'
          }
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev || isLoading}
            className={cn(
              'p-2 rounded-lg',
              canGoPrev && !isLoading
                ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext || isLoading}
            className={cn(
              'p-2 rounded-lg',
              canGoNext && !isLoading
                ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 5: Collection-Specific Views (~3 hours)

### 5.1 Chunks Viewer

Create `src/components/viewer/chunks-viewer.tsx`:

**Features**: Uses `TextDisplay` with full interface including `forwardRef`, `label`, `className`.

```typescript
'use client';

import { useState, useRef, forwardRef } from 'react';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextDisplay } from './text-display';
import { useViewerSettings } from '@/hooks/use-viewer-settings';
import type { ChunkDocument } from '@/types/viewer-api';

interface ChunksViewerProps {
  chunks: ChunkDocument[];
  isLoading?: boolean;
  onChunkSelect?: (chunk: ChunkDocument) => void;
  className?: string;
}

const STATUS_ICONS = {
  completed: CheckCircle,
  failed: XCircle,
  pending: Clock,
};

const STATUS_COLORS = {
  completed: 'text-green-500',
  failed: 'text-red-500',
  pending: 'text-amber-500',
};

function getStageStatus(chunk: ChunkDocument, stage: string): string {
  const stageData = chunk[`graphrag_${stage}`] as { status?: string } | undefined;
  return stageData?.status || 'pending';
}

export function ChunksViewer({ chunks, isLoading = false, onChunkSelect, className }: ChunksViewerProps) {
  const [selectedChunk, setSelectedChunk] = useState<ChunkDocument | null>(null);
  const { settings } = useViewerSettings();
  const contentRef = useRef<HTMLDivElement>(null);

  const stages = ['extraction', 'resolution', 'construction', 'communities'];

  const handleSelect = (chunk: ChunkDocument) => {
    setSelectedChunk(chunk);
    onChunkSelect?.(chunk);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Chunk list */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
            Chunks ({chunks.length})
          </h3>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && chunks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            No chunks found
          </div>
        )}
        
        {!isLoading && (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {chunks.map((chunk) => (
              <button
                key={chunk._id}
                onClick={() => handleSelect(chunk)}
                className={cn(
                  'w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                  selectedChunk?._id === chunk._id && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                {/* Chunk header */}
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {chunk.video_id || 'Unknown'} #{chunk.chunk_index ?? '?'}
                  </span>
                </div>

                {/* Stage status badges */}
                <div className="flex gap-1">
                  {stages.map((stage) => {
                    const status = getStageStatus(chunk, stage) as keyof typeof STATUS_ICONS;
                    const Icon = STATUS_ICONS[status] || Clock;
                    const color = STATUS_COLORS[status] || 'text-neutral-400';
                    
                    return (
                      <div
                        key={stage}
                        className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs"
                        title={`${stage}: ${status}`}
                      >
                        <Icon className={cn('w-3 h-3', color)} />
                        <span className="text-neutral-600 dark:text-neutral-400 capitalize">
                          {stage.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Preview text */}
                {chunk.text && (
                  <p className="mt-2 text-xs text-neutral-500 line-clamp-2">
                    {chunk.text.slice(0, 150)}...
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chunk detail */}
      <div className="flex-1 overflow-hidden">
        {selectedChunk ? (
          <TextDisplay
            ref={contentRef}
            content={selectedChunk.text || null}
            title={`${selectedChunk.video_id || 'Chunk'} #${selectedChunk.chunk_index ?? ''}`}
            label="Chunk Content"
            className="h-full"
            metadata={{
              source: selectedChunk.video_id as string,
              created_at: new Date().toISOString(),
              word_count: selectedChunk.text?.split(/\s+/).length || 0,
              char_count: selectedChunk.text?.length || 0,
            }}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            lineWidth={settings.lineWidth}
            entities={[]}
            searchMatches={[]}
            currentMatchIndex={0}
            entitySpotlightEnabled={settings.entitySpotlightEnabled}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            Select a chunk to view its content
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.2 Entity Viewer

Create `src/components/viewer/entity-viewer.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { User, MapPin, Building, Tag, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JsonViewer } from './json-viewer';
import type { EntityDocument } from '@/types/viewer-api';

interface EntityViewerProps {
  entities: EntityDocument[];
  isLoading?: boolean;
  onEntitySelect?: (entity: EntityDocument) => void;
  className?: string;
}

const TYPE_ICONS: Record<string, typeof User> = {
  person: User,
  location: MapPin,
  organization: Building,
  concept: Tag,
  default: Hash,
};

const TYPE_COLORS: Record<string, string> = {
  person: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  location: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  organization: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  concept: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
};

export function EntityViewer({ entities, isLoading = false, onEntitySelect, className }: EntityViewerProps) {
  const [selectedEntity, setSelectedEntity] = useState<EntityDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Get unique types
  const types = [...new Set(entities.map(e => e.type || 'unknown'))];

  // Filter entities
  const filteredEntities = entities.filter(entity => {
    if (typeFilter && entity.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSelect = (entity: EntityDocument) => {
    setSelectedEntity(entity);
    onEntitySelect?.(entity);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Entity list */}
      <div className="w-96 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Search & filters */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter(null)}
              className={cn(
                'px-2 py-1 text-xs rounded-full transition-colors',
                !typeFilter 
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              )}
            >
              All ({entities.length})
            </button>
            {types.map(type => {
              const count = entities.filter(e => e.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-full capitalize transition-colors',
                    typeFilter === type
                      ? TYPE_COLORS[type] || TYPE_COLORS.default
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  )}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Entity list */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto">
            {filteredEntities.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-neutral-500">
                No entities found
              </div>
            ) : (
              filteredEntities.map((entity) => {
                const Icon = TYPE_ICONS[entity.type || ''] || TYPE_ICONS.default;
                
                return (
                  <button
                    key={entity._id}
                    onClick={() => handleSelect(entity)}
                    className={cn(
                      'w-full p-4 text-left border-b border-neutral-100 dark:border-neutral-800',
                      'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                      selectedEntity?._id === entity._id && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        TYPE_COLORS[entity.type || ''] || TYPE_COLORS.default
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {entity.name}
                        </div>
                        {entity.description && (
                          <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
                            {entity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                          {entity.type && (
                            <span className="capitalize">{entity.type}</span>
                          )}
                          {entity.mention_count && (
                            <>
                              <span>·</span>
                              <span>{entity.mention_count} mentions</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Entity detail */}
      <div className="flex-1 overflow-auto p-6">
        {selectedEntity ? (
          <div className="max-w-2xl">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                TYPE_COLORS[selectedEntity.type || ''] || TYPE_COLORS.default
              )}>
                {(() => {
                  const Icon = TYPE_ICONS[selectedEntity.type || ''] || TYPE_ICONS.default;
                  return <Icon className="w-6 h-6" />;
                })()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedEntity.name}
                </h2>
                <p className="text-neutral-500 capitalize">{selectedEntity.type || 'Unknown type'}</p>
              </div>
            </div>

            {/* Description */}
            {selectedEntity.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {selectedEntity.description}
                </p>
              </div>
            )}

            {/* Aliases */}
            {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Also known as
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedEntity.aliases.map((alias, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-sm"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full JSON */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Raw Data
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden">
                <JsonViewer data={selectedEntity} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            Select an entity to view details
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.3 Community Viewer

Create `src/components/viewer/community-viewer.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JsonViewer } from './json-viewer';
import type { CommunityDocument } from '@/types/viewer-api';

interface CommunityViewerProps {
  communities: CommunityDocument[];
  isLoading?: boolean;
  onCommunitySelect?: (community: CommunityDocument) => void;
  className?: string;
}

// Colors for different community levels
const LEVEL_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-red-500',
];

export function CommunityViewer({ communities, isLoading = false, onCommunitySelect, className }: CommunityViewerProps) {
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityDocument | null>(null);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  // Get unique levels
  const levels = [...new Set(communities.map(c => c.level ?? 0))].sort((a, b) => a - b);

  // Filter communities
  const filteredCommunities = levelFilter !== null
    ? communities.filter(c => c.level === levelFilter)
    : communities;

  // Sort by level then by member count
  const sortedCommunities = [...filteredCommunities].sort((a, b) => {
    const levelDiff = (a.level ?? 0) - (b.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return (b.member_count ?? 0) - (a.member_count ?? 0);
  });

  const handleSelect = (community: CommunityDocument) => {
    setSelectedCommunity(community);
    onCommunitySelect?.(community);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Community list */}
      <div className="w-96 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Level filter */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLevelFilter(null)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                levelFilter === null
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800'
              )}
            >
              All Levels
            </button>
            {levels.map(level => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  levelFilter === level
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800'
                )}
              >
                Level {level}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Community list */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto">
            {sortedCommunities.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-neutral-500">
                No communities found
              </div>
            ) : (
              sortedCommunities.map((community) => {
                const levelColor = LEVEL_COLORS[(community.level ?? 0) % LEVEL_COLORS.length];
                
                return (
                  <button
                    key={community._id}
                    onClick={() => handleSelect(community)}
                    className={cn(
                      'w-full p-4 text-left border-b border-neutral-100 dark:border-neutral-800',
                      'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                      selectedCommunity?._id === community._id && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Level indicator */}
                      <div className="flex flex-col items-center">
                        <div className={cn('w-2 h-2 rounded-full', levelColor)} />
                        <div className="w-px h-full bg-neutral-200 dark:bg-neutral-700 mt-1" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-neutral-400" />
                          <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {community.title || `Community ${community._id.slice(-6)}`}
                          </span>
                        </div>
                        
                        {community.summary && (
                          <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
                            {community.summary}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                          <span>Level {community.level ?? 0}</span>
                          <span>·</span>
                          <span>{community.member_count ?? community.member_ids?.length ?? 0} members</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Community detail */}
      <div className="flex-1 overflow-auto p-6">
        {selectedCommunity ? (
          <div className="max-w-2xl">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  LEVEL_COLORS[(selectedCommunity.level ?? 0) % LEVEL_COLORS.length]
                )} />
                <span>Level {selectedCommunity.level ?? 0}</span>
                <span>·</span>
                <span>{selectedCommunity.member_count ?? selectedCommunity.member_ids?.length ?? 0} members</span>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {selectedCommunity.title || `Community ${selectedCommunity._id.slice(-6)}`}
              </h2>
            </div>

            {/* Summary */}
            {selectedCommunity.summary && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Summary
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {selectedCommunity.summary}
                </p>
              </div>
            )}

            {/* Members preview */}
            {selectedCommunity.member_ids && selectedCommunity.member_ids.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Members ({selectedCommunity.member_ids.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCommunity.member_ids.slice(0, 20).map((id, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono"
                    >
                      {id.slice(-8)}
                    </span>
                  ))}
                  {selectedCommunity.member_ids.length > 20 && (
                    <span className="px-2 py-1 text-neutral-500 text-xs">
                      +{selectedCommunity.member_ids.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Full JSON */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Raw Data
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden">
                <JsonViewer data={selectedCommunity} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            Select a community to view details
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 6: Renderer Router (~1 hour)

### 6.1 Create Renderer Selection Logic

Create `src/lib/viewer/renderer-selector.ts`:

```typescript
import type { ViewerRendererType, ViewerCollectionInfo } from '@/types/viewer-api';

// Collection-specific renderer overrides
const COLLECTION_RENDERERS: Record<string, ViewerRendererType> = {
  video_chunks: 'chunks',
  entities: 'entity',
  communities: 'community',
  // Others use their suggested_renderer from the API
};

/**
 * Select appropriate renderer based on collection info
 */
export function selectRenderer(collectionInfo: ViewerCollectionInfo): ViewerRendererType {
  // Check for collection-specific renderer first
  if (collectionInfo.name in COLLECTION_RENDERERS) {
    return COLLECTION_RENDERERS[collectionInfo.name];
  }

  // Use API-suggested renderer
  return collectionInfo.suggested_renderer;
}

/**
 * Get renderer display name
 */
export function getRendererDisplayName(renderer: ViewerRendererType): string {
  const names: Record<ViewerRendererType, string> = {
    long_text: 'Text Viewer',
    json: 'JSON Tree',
    table: 'Table View',
    chunks: 'Chunks Browser',
    entity: 'Entity Cards',
    community: 'Community View',
  };
  return names[renderer] || renderer;
}

/**
 * Check if renderer supports search
 */
export function rendererSupportsSearch(renderer: ViewerRendererType): boolean {
  return renderer === 'long_text' || renderer === 'entity';
}

/**
 * Check if renderer supports entity highlighting
 */
export function rendererSupportsEntityHighlight(renderer: ViewerRendererType): boolean {
  return renderer === 'long_text' || renderer === 'chunks';
}

/**
 * Check if renderer supports split view mode
 */
export function rendererSupportsSplitView(renderer: ViewerRendererType): boolean {
  return renderer === 'long_text';
}
```

---

## Phase 7: Update Main Viewer Page

### 7.1 Key Integration Points

Update `src/app/viewer/page.tsx` to integrate the new components. Key changes:

1. **Replace mock data with API hooks**
2. **Add database browser instead of source selector**
3. **Route to appropriate viewer based on collection**
4. **Preserve existing features**: search, typography, entity highlight, **viewMode (single/split)**
5. **Add error handling**

```typescript
// Import new components
import { DatabaseBrowser } from '@/components/viewer/database-browser';
import { JsonViewer } from '@/components/viewer/json-viewer';
import { TableViewer } from '@/components/viewer/table-viewer';
import { ChunksViewer } from '@/components/viewer/chunks-viewer';
import { EntityViewer } from '@/components/viewer/entity-viewer';
import { CommunityViewer } from '@/components/viewer/community-viewer';

// Import hooks and utilities
import { useCollectionQuery, useDocument } from '@/hooks/use-viewer-data';
import { selectRenderer, rendererSupportsSplitView } from '@/lib/viewer/renderer-selector';
import type { ViewerState, ViewerCollectionInfo, ChunkDocument, EntityDocument, CommunityDocument } from '@/types/viewer-api';

// State for viewer
const [viewerState, setViewerState] = useState<ViewerState>({
  database: null,
  collection: null,
  documentId: null,
  renderer: 'long_text',
});

// Collection query for list-based viewers
const { data: queryData, isLoading: queryLoading, error: queryError } = useCollectionQuery(
  viewerState.database && viewerState.collection
    ? {
        db_name: viewerState.database,
        collection: viewerState.collection,
        limit: 100,
      }
    : null
);

// Handle collection selection from DatabaseBrowser
const handleSelectCollection = (db: string, collection: string, info: ViewerCollectionInfo) => {
  const renderer = selectRenderer(info);
  setViewerState({
    database: db,
    collection,
    documentId: null,
    renderer,
  });
};

// Check if split view is supported for current renderer
const splitViewSupported = rendererSupportsSplitView(viewerState.renderer);
const showSplitView = settings.viewMode === 'split' && splitViewSupported;

// Render appropriate viewer
const renderViewer = () => {
  // Error state
  if (queryError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-neutral-500">Failed to load data</p>
          <p className="text-sm text-neutral-400">{queryError.message}</p>
        </div>
      </div>
    );
  }

  switch (viewerState.renderer) {
    case 'long_text':
      return <TextDisplay {...textDisplayProps} />;
    case 'json':
      return <JsonViewer data={queryData?.documents || []} />;
    case 'table':
      return (
        <TableViewer
          documents={queryData?.documents || []}
          total={queryData?.total || 0}
          currentPage={currentPage}
          pageSize={pageSize}
          isLoading={queryLoading}
          onPageChange={setCurrentPage}
          onRowClick={(doc) => setSelectedDocument(doc)}
        />
      );
    case 'chunks':
      return (
        <ChunksViewer
          chunks={(queryData?.documents || []) as ChunkDocument[]}
          isLoading={queryLoading}
        />
      );
    case 'entity':
      return (
        <EntityViewer
          entities={(queryData?.documents || []) as EntityDocument[]}
          isLoading={queryLoading}
        />
      );
    case 'community':
      return (
        <CommunityViewer
          communities={(queryData?.documents || []) as CommunityDocument[]}
          isLoading={queryLoading}
        />
      );
    default:
      return <div>Unknown renderer: {viewerState.renderer}</div>;
  }
};
```

---

## Mock Data Migration Strategy

**Approach**: Keep mock data for development and tests, use environment flag to switch.

Add to `.env.local`:
```bash
# Set to 'true' to use mock data instead of API
NEXT_PUBLIC_USE_MOCK_DATA=false

# Stages API URL (for viewer endpoints)
NEXT_PUBLIC_STAGES_API_URL=http://localhost:8080/api/v1
```

In hooks, check the flag:
```typescript
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export function useDatabases() {
  return useQuery({
    queryKey: queryKeys.viewer.databases(),
    queryFn: () => useMockData 
      ? Promise.resolve(MOCK_DATABASES_RESPONSE)
      : viewerApi.listDatabases(),
    // ...
  });
}
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Verify backend Viewer API is running
- [ ] Add `NEXT_PUBLIC_STAGES_API_URL` to `.env.local`

### Phase 1: API Integration
- [ ] Create `src/types/viewer-api.ts` with prefixed types
- [ ] Add viewer keys to `src/lib/query-keys.ts`
- [ ] Create `src/lib/api/viewer.ts`
- [ ] Create `src/hooks/use-viewer-data.ts`
- [ ] Test API calls with real backend

### Phase 2: Database Browser
- [ ] Create `src/components/viewer/database-browser.tsx`
- [ ] Implement keyboard navigation
- [ ] Implement error handling
- [ ] Test database/collection listing

### Phase 3: JSON Viewer
- [ ] Create `src/components/viewer/json-viewer.tsx`
- [ ] Test with entities collection
- [ ] Verify collapsible behavior

### Phase 4: Table Viewer
- [ ] Create `src/components/viewer/table-viewer.tsx`
- [ ] Add loading states
- [ ] Test pagination
- [ ] Test sorting

### Phase 5: Collection-Specific Views
- [ ] Create `src/components/viewer/chunks-viewer.tsx`
- [ ] Create `src/components/viewer/entity-viewer.tsx`
- [ ] Create `src/components/viewer/community-viewer.tsx`
- [ ] Add loading states to all
- [ ] Test with real data

### Phase 6: Renderer Router
- [ ] Create `src/lib/viewer/renderer-selector.ts`
- [ ] Add split view support check

### Phase 7: Integration
- [ ] Update `src/app/viewer/page.tsx`
- [ ] Preserve viewMode (single/split) feature
- [ ] Preserve all existing features
- [ ] Add error handling
- [ ] Test all viewer types

---

## Creative Extensions (Optional)

These are optional enhancements the implementing session can explore:

1. **Full-Text Search**: Add text search within JSON documents
2. **Export Buttons**: Download document as JSON/CSV
3. **Comparison Mode**: View two documents side-by-side
4. **Graph Preview**: Mini-graph visualization for entities/relations
5. **Keyboard Navigation**: Arrow keys to navigate documents
6. **Saved Queries**: Save and reuse filter queries
7. **Dark Mode JSON**: Syntax highlighting theme variants
8. **Virtual Scrolling**: For large table datasets (consider `@tanstack/virtual`)
9. **Field Pinning**: Pin important columns in table view
10. **Query Builder**: Visual filter builder UI
11. **CSS Variables for Colors**: Extract hardcoded colors to theme variables

---

## Changelog

### Version 2.0 (December 11, 2025)
Based on implementation review feedback:

- **Type Naming**: Prefixed all types with `Viewer` to avoid conflicts with `management.ts`
- **Query Keys**: Now adds to centralized `src/lib/query-keys.ts` instead of standalone keys
- **TextDisplay Interface**: Updated ChunksViewer to use full interface (`forwardRef`, `label`, `className`)
- **ViewMode Preservation**: Added section on maintaining split view functionality
- **Import Paths**: Standardized on `@/lib/utils` throughout
- **Error Handling**: Added error states to all components
- **Keyboard Navigation**: Full implementation in DatabaseBrowser
- **Settings Integration**: All settings now propagate to viewers
- **Document Types**: Moved inline interfaces to types file
- **Loading States**: Added to all specialized viewers
- **Mock Data Strategy**: Defined approach using environment flag
- **Split View Support**: Added `rendererSupportsSplitView()` function
