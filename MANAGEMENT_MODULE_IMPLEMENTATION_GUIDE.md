# Management Module Implementation Guide

**Project**: StagesUI Frontend  
**Target**: `src/`  
**Date**: December 11, 2025  
**Status**: Ready for Implementation

---

## Executive Summary

This guide details the implementation of the Management Module for the StagesUI frontend. The Management Module provides a UI for database operations, maintenance utilities, observability dashboards, and analytics - surfacing backend capabilities that currently require CLI access.

### Frontend Responsibilities

1. **Route Structure** - Create `/execution` and `/management` routes
2. **UI Components** - Build 4 utility panels for the right-half layout
3. **API Integration** - Connect to new Management API endpoints
4. **State Management** - Track operations and database selections
5. **Progress Tracking** - Real-time polling for long-running operations

### Prerequisites

Before starting implementation:

```bash
# Install the Tabs UI component (required for database-operations.tsx)
npx shadcn@latest add tabs
```

### Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_GRAPH_API_URL=http://localhost:8081
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/execution/page.tsx` | Move existing page content |
| `src/app/management/page.tsx` | New management module page |
| `src/components/layout/nav-link.tsx` | Client component for navigation |
| `src/components/management/database-operations.tsx` | Database operations panel |
| `src/components/management/observability-panel.tsx` | Health & dashboards |
| `src/components/management/maintenance-panel.tsx` | Maintenance utilities |
| `src/components/management/analytics-panel.tsx` | Graph statistics |
| `src/types/management.ts` | Type definitions |
| `src/lib/api/management.ts` | API client functions |
| `src/lib/query-keys.ts` | Centralized React Query keys |
| `src/hooks/use-management.ts` | React Query hooks |
| `src/lib/store/management-store.ts` | Zustand store |

---

## Phase 1: Route Structure (1-2 hours)

### 1.1 Create NavLink Client Component

First, create a separate client component for navigation links:

```tsx
// src/components/layout/nav-link.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + '/');
  
  return (
    <Link 
      href={href}
      className={cn(
        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {children}
    </Link>
  );
}
```

### 1.2 Update Root Layout

Modify `src/app/layout.tsx` to add navigation:

```tsx
// src/app/layout.tsx
import { NavLink } from '@/components/layout/nav-link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b">
          <nav className="container mx-auto px-4 py-3 flex items-center gap-6">
            <span className="font-bold text-lg">StagesUI</span>
            <div className="flex gap-4">
              <NavLink href="/execution">Execution</NavLink>
              <NavLink href="/management">Management</NavLink>
              <NavLink href="/viewer">Viewer</NavLink>
            </div>
          </nav>
        </header>
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
```

**Note**: The `/viewer` route already exists in the codebase.

### 1.3 Create Execution Route

Move current `src/app/page.tsx` content to `src/app/execution/page.tsx`:

```tsx
// src/app/execution/page.tsx
// Copy entire content from current page.tsx
// This keeps the existing execution functionality unchanged

export default function ExecutionPage() {
  // ... existing implementation
}
```

### 1.4 Update Root Page

Replace `src/app/page.tsx` with a redirect:

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/execution')
}
```

### 1.5 Create Management Route

Create `src/app/management/page.tsx`:

```tsx
// src/app/management/page.tsx
'use client'

import { PipelineSelector } from '@/components/pipeline/pipeline-selector'
import { StageSelector } from '@/components/pipeline/stage-selector'
import { StageConfigPanel } from '@/components/config/stage-config-panel'
import { DatabaseOperationsPanel } from '@/components/management/database-operations'
import { ObservabilityPanel } from '@/components/management/observability-panel'
import { MaintenancePanel } from '@/components/management/maintenance-panel'
import { AnalyticsPanel } from '@/components/management/analytics-panel'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'

export default function ManagementPage() {
  const [configOpen, setConfigOpen] = useState(false)
  
  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Column: Pipeline Configuration (Compact) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pipeline Configuration</h2>
        
        <PipelineSelector />
        <StageSelector />
        
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn("h-4 w-4 transition-transform", configOpen && "rotate-180")} />
            Stage Configuration
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <StageConfigPanel />
          </CollapsibleContent>
        </Collapsible>
      </div>
      
      {/* Right Column: Management Utilities */}
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-150px)]">
        <h2 className="text-xl font-semibold">Management Utilities</h2>
        
        <DatabaseOperationsPanel />
        <ObservabilityPanel />
        <MaintenancePanel />
        <AnalyticsPanel />
      </div>
    </div>
  )
}
```

---

## Phase 2: API Client (1 hour)

### 2.1 Create Management Types

Create `src/types/management.ts`:

```typescript
// src/types/management.ts

export interface DatabaseInfo {
  name: string;
  collections: Array<{
    name: string;
    count: number;
  }>;
}

export interface InspectDatabasesResponse {
  databases: DatabaseInfo[];
  timestamp: string;
}

export interface OperationProgress {
  processed: number;
  total: number;
  percent: number;
}

export interface OperationStatus {
  operation_id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: OperationProgress;
  started_at: string;
  completed_at?: string;
  error?: string;
  params: Record<string, unknown>;
}

export interface CopyCollectionParams {
  source_db: string;
  target_db: string;
  collection: string;
  max_documents?: number | null;
  clear_target?: boolean;
}

export interface CopyCollectionResponse {
  operation_id: string;
  status: string;
  documents_copied?: number;
  message?: string;
}

export interface CleanGraphRAGParams {
  db_name: string;
  drop_collections?: string[];
  clear_chunk_metadata?: boolean;
}

export interface CleanGraphRAGResponse {
  db_name: string;
  dropped_collections: Array<{
    name: string;
    documents_deleted: number;
  }>;
  chunks_updated: number;
  success: boolean;
  timestamp: string;
}

export interface CleanStageStatusParams {
  db_name: string;
  stages: string[];
}

export interface CleanStageStatusResponse {
  db_name: string;
  stages_cleaned: string[];
  chunks_modified: number;
  success: boolean;
  timestamp: string;
}

export interface SetupTestDBParams {
  source_db: string;
  target_db: string;
  chunk_count?: number;
  diversity_mode?: boolean;
}

export interface SetupTestDBResponse {
  source_db: string;
  target_db: string;
  chunks_selected: number;
  unique_videos: number;
  diversity_mode: boolean;
  success: boolean;
  timestamp: string;
}

export interface RebuildIndexesParams {
  db_name: string;
  collections?: string[];
}

export interface RebuildIndexesResponse {
  db_name: string;
  collections_indexed: Array<{
    name: string;
    indexes_created: string[];
  }>;
  success: boolean;
  timestamp: string;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'down' | 'unknown';
  services: {
    prometheus: { status: string; url: string; error?: string };
    grafana: { status: string; url: string; error?: string };
    loki: { status: string; url: string; error?: string };
  };
  timestamp: string;
}
```

### 2.2 Create Management API Client

Create `src/lib/api/management.ts`:

```typescript
// src/lib/api/management.ts
// Uses the existing api client pattern with retry logic

import { api } from './client';
import type {
  InspectDatabasesResponse,
  OperationStatus,
  CopyCollectionParams,
  CopyCollectionResponse,
  CleanGraphRAGParams,
  CleanGraphRAGResponse,
  CleanStageStatusParams,
  CleanStageStatusResponse,
  SetupTestDBParams,
  SetupTestDBResponse,
  RebuildIndexesParams,
  RebuildIndexesResponse,
  HealthStatus,
} from '@/types/management';

// Re-export types for convenience
export type {
  DatabaseInfo,
  InspectDatabasesResponse,
  OperationProgress,
  OperationStatus,
  CopyCollectionParams,
  CopyCollectionResponse,
  CleanGraphRAGParams,
  CleanGraphRAGResponse,
  CleanStageStatusParams,
  CleanStageStatusResponse,
  SetupTestDBParams,
  SetupTestDBResponse,
  RebuildIndexesParams,
  RebuildIndexesResponse,
  HealthStatus,
} from '@/types/management';

/**
 * Management API client
 * Uses the existing api client with retry logic
 */
export const managementApi = {
  /** Inspect all databases and their collections */
  inspectDatabases: () =>
    api.get<InspectDatabasesResponse>('/management/inspect-databases'),

  /** Get status of a long-running operation */
  getOperationStatus: (operationId: string) =>
    api.get<OperationStatus>(`/management/operations/${operationId}`),

  /** Copy a collection from one database to another */
  copyCollection: (params: CopyCollectionParams) =>
    api.post<CopyCollectionResponse>('/management/copy-collection', params),

  /** Clean GraphRAG data from a database */
  cleanGraphRAGData: (params: CleanGraphRAGParams) =>
    api.post<CleanGraphRAGResponse>('/management/clean-graphrag', params),

  /** Clean stage processing status from chunks */
  cleanStageStatus: (params: CleanStageStatusParams) =>
    api.post<CleanStageStatusResponse>('/management/clean-stage-status', params),

  /** Setup a test database with diverse chunks */
  setupTestDatabase: (params: SetupTestDBParams) =>
    api.post<SetupTestDBResponse>('/management/setup-test-db', params),

  /** Rebuild indexes for collections */
  rebuildIndexes: (params: RebuildIndexesParams) =>
    api.post<RebuildIndexesResponse>('/management/rebuild-indexes', params),

  /** Get observability health status */
  getObservabilityHealth: () =>
    api.get<HealthStatus>('/observability/health'),
};

// Export individual functions for backwards compatibility with hooks
export const inspectDatabases = managementApi.inspectDatabases;
export const getOperationStatus = managementApi.getOperationStatus;
export const copyCollection = managementApi.copyCollection;
export const cleanGraphRAGData = managementApi.cleanGraphRAGData;
export const cleanStageStatus = managementApi.cleanStageStatus;
export const setupTestDatabase = managementApi.setupTestDatabase;
export const rebuildIndexes = managementApi.rebuildIndexes;
export const getObservabilityHealth = managementApi.getObservabilityHealth;
```

**Note**: This uses the existing `api` client from `./client.ts` which already includes:
- Retry logic with exponential backoff
- Proper error handling via `ApiError`
- The base URL from `NEXT_PUBLIC_API_URL` (includes `/api/v1`)

---

## Phase 3: React Query Hooks (1 hour)

### 3.1 Create Centralized Query Keys

Create `src/lib/query-keys.ts`:

```typescript
// src/lib/query-keys.ts
// Centralized query keys for React Query
// Prevents typos and enables easy invalidation patterns

export const queryKeys = {
  // Pipeline execution
  pipeline: {
    all: ['pipeline'] as const,
    status: (id: string) => ['pipeline', 'status', id] as const,
    history: ['pipeline', 'history'] as const,
  },

  // Configuration
  config: {
    all: ['config'] as const,
    defaults: ['config', 'defaults'] as const,
    stage: (stage: string) => ['config', 'stage', stage] as const,
    validation: ['config', 'validation'] as const,
  },

  // Management module (new)
  management: {
    all: ['management'] as const,
    databases: ['management', 'databases'] as const,
    operation: (id: string) => ['management', 'operation', id] as const,
    health: ['management', 'health'] as const,
  },

  // Graph API / Analytics
  graph: {
    all: ['graph'] as const,
    statistics: (dbName: string) => ['graph', 'statistics', dbName] as const,
  },

  // Observability
  observability: {
    all: ['observability'] as const,
    health: ['observability', 'health'] as const,
    metrics: ['observability', 'metrics'] as const,
  },
} as const;
```

### 3.2 Create Management Hooks

Create `src/hooks/use-management.ts`:

```typescript
// src/hooks/use-management.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  inspectDatabases,
  getOperationStatus,
  copyCollection,
  cleanGraphRAGData,
  cleanStageStatus,
  setupTestDatabase,
  rebuildIndexes,
  getObservabilityHealth,
} from '@/lib/api/management'
import type {
  CopyCollectionParams,
  CleanGraphRAGParams,
  CleanStageStatusParams,
  SetupTestDBParams,
  RebuildIndexesParams,
  OperationStatus,
} from '@/types/management'
import { queryKeys } from '@/lib/query-keys'

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook for fetching database information
 */
export function useDatabaseInspector() {
  return useQuery({
    queryKey: queryKeys.management.databases,
    queryFn: inspectDatabases,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  })
}

/**
 * Hook for polling operation status
 */
export function useOperationStatus(operationId: string | null) {
  return useQuery({
    queryKey: queryKeys.management.operation(operationId || ''),
    queryFn: () => getOperationStatus(operationId!),
    enabled: !!operationId,
    refetchInterval: (query) => {
      const data = query.state.data as OperationStatus | undefined
      // Stop polling when operation completes or fails
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 1000 // Poll every second while running
    },
  })
}

/**
 * Hook for observability health status
 */
export function useObservabilityHealth() {
  return useQuery({
    queryKey: queryKeys.management.health,
    queryFn: getObservabilityHealth,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000,
  })
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for copying collections
 */
export function useCopyCollection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: CopyCollectionParams) => copyCollection(params),
    onSuccess: () => {
      // Invalidate database inspection to show new data
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases })
    },
  })
}

/**
 * Hook for cleaning GraphRAG data
 */
export function useCleanGraphRAG() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: CleanGraphRAGParams) => cleanGraphRAGData(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases })
    },
  })
}

/**
 * Hook for cleaning stage status
 */
export function useCleanStageStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: CleanStageStatusParams) => cleanStageStatus(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases })
    },
  })
}

/**
 * Hook for setting up test database
 */
export function useSetupTestDB() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: SetupTestDBParams) => setupTestDatabase(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases })
    },
  })
}

/**
 * Hook for rebuilding indexes
 */
export function useRebuildIndexes() {
  return useMutation({
    mutationFn: (params: RebuildIndexesParams) => rebuildIndexes(params),
  })
}
```

---

## Phase 4: UI Components (3-4 hours)

### 4.1 Database Operations Panel

Create `src/components/management/database-operations.tsx`:

```tsx
// src/components/management/database-operations.tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, Copy, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useDatabaseInspector, useCopyCollection, useOperationStatus, useCleanGraphRAG } from '@/hooks/use-management'

export function DatabaseOperationsPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="copy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="copy">Copy</TabsTrigger>
            <TabsTrigger value="clean">Clean</TabsTrigger>
            <TabsTrigger value="inspect">Inspect</TabsTrigger>
          </TabsList>
          
          <TabsContent value="copy" className="mt-4">
            <CopyCollectionForm />
          </TabsContent>
          
          <TabsContent value="clean" className="mt-4">
            <CleanGraphRAGForm />
          </TabsContent>
          
          <TabsContent value="inspect" className="mt-4">
            <DatabaseInspector />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Copy Collection Form
// =============================================================================

function CopyCollectionForm() {
  const { data: databases } = useDatabaseInspector()
  const { mutate: copy, isPending, error } = useCopyCollection()
  const [operationId, setOperationId] = useState<string | null>(null)
  const { data: operationStatus } = useOperationStatus(operationId)
  
  const [sourceDb, setSourceDb] = useState('')
  const [targetDb, setTargetDb] = useState('')
  const [collection, setCollection] = useState('raw_videos')
  const [maxDocs, setMaxDocs] = useState<string>('')
  const [clearTarget, setClearTarget] = useState(true)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    copy(
      {
        source_db: sourceDb,
        target_db: targetDb,
        collection,
        max_documents: maxDocs ? parseInt(maxDocs) : null,
        clear_target: clearTarget,
      },
      {
        onSuccess: (data) => {
          if (data.operation_id && data.status === 'running') {
            setOperationId(data.operation_id)
          }
        },
      }
    )
  }
  
  const isComplete = operationStatus?.status === 'completed'
  const isFailed = operationStatus?.status === 'failed'
  const isRunning = operationStatus?.status === 'running' || isPending
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source Database</Label>
          <Select value={sourceDb} onValueChange={setSourceDb}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {databases?.databases.map((db) => (
                <SelectItem key={db.name} value={db.name}>
                  {db.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Target Database</Label>
          <Input
            value={targetDb}
            onChange={(e) => setTargetDb(e.target.value)}
            placeholder="Enter target name"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Collection</Label>
          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw_videos">raw_videos</SelectItem>
              <SelectItem value="video_chunks">video_chunks</SelectItem>
              <SelectItem value="cleaned_transcripts">cleaned_transcripts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Max Documents</Label>
          <Input
            type="number"
            value={maxDocs}
            onChange={(e) => setMaxDocs(e.target.value)}
            placeholder="Leave empty for all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="clearTarget"
          checked={clearTarget}
          onCheckedChange={(checked) => setClearTarget(checked as boolean)}
        />
        <Label htmlFor="clearTarget" className="text-sm cursor-pointer">
          Clear target collection before copy
        </Label>
      </div>
      
      {/* Progress Display */}
      {operationStatus && (
        <div className="space-y-2">
          <Progress value={operationStatus.progress.percent} />
          <p className="text-sm text-muted-foreground">
            {operationStatus.progress.processed} / {operationStatus.progress.total} documents
            {isComplete && ' - Complete!'}
            {isFailed && ` - Failed: ${operationStatus.error}`}
          </p>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        disabled={!sourceDb || !targetDb || isRunning}
        className="w-full"
      >
        <Copy className="h-4 w-4 mr-2" />
        {isRunning ? 'Copying...' : 'Copy Collection'}
      </Button>
    </form>
  )
}

// =============================================================================
// Clean GraphRAG Form
// =============================================================================

function CleanGraphRAGForm() {
  const { data: databases } = useDatabaseInspector()
  const { mutate: clean, isPending, error, data: result, reset } = useCleanGraphRAG()
  
  const [dbName, setDbName] = useState('')
  const [collections, setCollections] = useState<string[]>([
    'entities', 'relations', 'communities', 'entity_mentions'
  ])
  const [clearMetadata, setClearMetadata] = useState(true)
  const [confirmation, setConfirmation] = useState('')
  
  const toggleCollection = (name: string) => {
    setCollections(prev => 
      prev.includes(name) 
        ? prev.filter(c => c !== name)
        : [...prev, name]
    )
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (confirmation !== 'CONFIRM') {
      return
    }
    
    clean({
      db_name: dbName,
      drop_collections: collections,
      clear_chunk_metadata: clearMetadata,
    })
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Database</Label>
        <Select value={dbName} onValueChange={(v) => { setDbName(v); reset(); setConfirmation('') }}>
          <SelectTrigger>
            <SelectValue placeholder="Select database" />
          </SelectTrigger>
          <SelectContent>
            {databases?.databases.map((db) => (
              <SelectItem key={db.name} value={db.name}>
                {db.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Collections to Drop</Label>
        <div className="grid grid-cols-2 gap-2">
          {['entities', 'relations', 'communities', 'entity_mentions', 'graphrag_runs'].map((coll) => (
            <div key={coll} className="flex items-center gap-2">
              <Checkbox
                id={coll}
                checked={collections.includes(coll)}
                onCheckedChange={() => toggleCollection(coll)}
              />
              <Label htmlFor={coll} className="text-sm cursor-pointer">
                {coll}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="clearMetadata"
          checked={clearMetadata}
          onCheckedChange={(checked) => setClearMetadata(checked as boolean)}
        />
        <Label htmlFor="clearMetadata" className="text-sm cursor-pointer">
          Clear chunk metadata (allows re-processing)
        </Label>
      </div>
      
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This operation is <strong>DESTRUCTIVE</strong>. Type "CONFIRM" below to proceed.
        </AlertDescription>
      </Alert>
      
      <Input
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder='Type "CONFIRM" to proceed'
      />
      
      {result?.success && (
        <Alert>
          <AlertDescription>
            Cleaned successfully! Dropped {result.dropped_collections.length} collections, 
            updated {result.chunks_updated} chunks.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        variant="destructive"
        disabled={!dbName || confirmation !== 'CONFIRM' || isPending}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isPending ? 'Cleaning...' : 'Clean GraphRAG Data'}
      </Button>
    </form>
  )
}

// =============================================================================
// Database Inspector
// =============================================================================

function DatabaseInspector() {
  const { data, isLoading, error, refetch } = useDatabaseInspector()
  
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading databases...</div>
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {data?.databases.length} databases found
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {data?.databases.map((db) => (
          <div key={db.name} className="border rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">{db.name}</h4>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {db.collections.map((coll) => (
                <div key={coll.name} className="flex justify-between">
                  <span>{coll.name}</span>
                  <span className="font-mono">{coll.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 4.2 Observability Panel

Create `src/components/management/observability-panel.tsx`:

```tsx
// src/components/management/observability-panel.tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, ExternalLink, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useObservabilityHealth } from '@/hooks/use-management'

export function ObservabilityPanel() {
  const { data: health, isLoading, refetch } = useObservabilityHealth()
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      healthy: 'default',
      down: 'destructive',
      degraded: 'secondary',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Observability
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Overall Status</span>
          {health && getStatusBadge(health.overall)}
        </div>
        
        {/* Service List */}
        <div className="space-y-2">
          {health?.services && Object.entries(health.services).map(([name, service]) => (
            <div key={name} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="text-sm capitalize">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {service.url?.replace('http://', '')}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('http://localhost:3000', '_blank')}
          >
            Grafana
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('http://localhost:9090', '_blank')}
          >
            Prometheus
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('http://localhost:3100', '_blank')}
          >
            Loki
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {isLoading && (
          <div className="text-sm text-muted-foreground text-center">
            Checking health...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 4.3 Maintenance Panel

Create `src/components/management/maintenance-panel.tsx`:

```tsx
// src/components/management/maintenance-panel.tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Wrench, ChevronDown, RefreshCw, Eraser } from 'lucide-react'
import { useDatabaseInspector, useCleanStageStatus, useRebuildIndexes } from '@/hooks/use-management'
import { cn } from '@/lib/utils/cn'

export function MaintenancePanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance
            </CardTitle>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <CleanStageStatusForm />
            <hr />
            <RebuildIndexesForm />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// =============================================================================
// Clean Stage Status Form
// =============================================================================

function CleanStageStatusForm() {
  const { data: databases } = useDatabaseInspector()
  const { mutate: clean, isPending, error, data: result, reset } = useCleanStageStatus()
  
  const [dbName, setDbName] = useState('')
  const [stages, setStages] = useState<string[]>(['extraction'])
  
  const toggleStage = (stage: string) => {
    setStages(prev => 
      prev.includes(stage) 
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    )
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clean({ db_name: dbName, stages })
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <Eraser className="h-4 w-4" />
        <span className="text-sm font-medium">Clean Stage Status</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Remove processing status from chunks to allow re-running specific stages.
      </p>
      
      <Select value={dbName} onValueChange={(v) => { setDbName(v); reset() }}>
        <SelectTrigger>
          <SelectValue placeholder="Select database" />
        </SelectTrigger>
        <SelectContent>
          {databases?.databases.map((db) => (
            <SelectItem key={db.name} value={db.name}>
              {db.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex flex-wrap gap-3">
        {['extraction', 'resolution', 'construction', 'community'].map((stage) => (
          <div key={stage} className="flex items-center gap-2">
            <Checkbox
              id={`stage-${stage}`}
              checked={stages.includes(stage)}
              onCheckedChange={() => toggleStage(stage)}
            />
            <Label htmlFor={`stage-${stage}`} className="text-xs capitalize cursor-pointer">
              {stage}
            </Label>
          </div>
        ))}
      </div>
      
      {result?.success && (
        <Alert>
          <AlertDescription className="text-xs">
            Cleaned {result.stages_cleaned.join(', ')} status from {result.chunks_modified} chunks.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error.message}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        size="sm"
        disabled={!dbName || stages.length === 0 || isPending}
        className="w-full"
      >
        {isPending ? 'Cleaning...' : 'Clean Stage Status'}
      </Button>
    </form>
  )
}

// =============================================================================
// Rebuild Indexes Form
// =============================================================================

function RebuildIndexesForm() {
  const { data: databases } = useDatabaseInspector()
  const { mutate: rebuild, isPending, error, data: result, reset } = useRebuildIndexes()
  
  const [dbName, setDbName] = useState('')
  const [collections, setCollections] = useState<string[]>(['entities', 'relations'])
  
  const toggleCollection = (coll: string) => {
    setCollections(prev => 
      prev.includes(coll) 
        ? prev.filter(c => c !== coll)
        : [...prev, coll]
    )
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    rebuild({ db_name: dbName, collections })
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        <span className="text-sm font-medium">Rebuild Indexes</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Rebuild database indexes for improved query performance.
      </p>
      
      <Select value={dbName} onValueChange={(v) => { setDbName(v); reset() }}>
        <SelectTrigger>
          <SelectValue placeholder="Select database" />
        </SelectTrigger>
        <SelectContent>
          {databases?.databases.map((db) => (
            <SelectItem key={db.name} value={db.name}>
              {db.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex flex-wrap gap-3">
        {['entities', 'relations', 'communities', 'video_chunks'].map((coll) => (
          <div key={coll} className="flex items-center gap-2">
            <Checkbox
              id={`coll-${coll}`}
              checked={collections.includes(coll)}
              onCheckedChange={() => toggleCollection(coll)}
            />
            <Label htmlFor={`coll-${coll}`} className="text-xs cursor-pointer">
              {coll}
            </Label>
          </div>
        ))}
      </div>
      
      {result?.success && (
        <Alert>
          <AlertDescription className="text-xs">
            Rebuilt indexes for {result.collections_indexed.length} collections.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error.message}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        size="sm"
        disabled={!dbName || collections.length === 0 || isPending}
        className="w-full"
      >
        {isPending ? 'Rebuilding...' : 'Rebuild Indexes'}
      </Button>
    </form>
  )
}
```

### 4.4 Analytics Panel

Create `src/components/management/analytics-panel.tsx`:

```tsx
// src/components/management/analytics-panel.tsx
'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, RefreshCw, Download } from 'lucide-react'
import { useState } from 'react'
import { useDatabaseInspector } from '@/hooks/use-management'
import { useQuery } from '@tanstack/react-query'

const GRAPH_API = process.env.NEXT_PUBLIC_GRAPH_API_URL || 'http://localhost:8081'

async function fetchGraphStatistics(dbName: string) {
  const response = await fetch(`${GRAPH_API}/api/statistics?db_name=${dbName}`)
  if (!response.ok) {
    throw new Error('Failed to fetch statistics')
  }
  return response.json()
}

export function AnalyticsPanel() {
  const { data: databases } = useDatabaseInspector()
  const [selectedDb, setSelectedDb] = useState('')
  
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['graph-statistics', selectedDb],
    queryFn: () => fetchGraphStatistics(selectedDb),
    enabled: !!selectedDb,
  })
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={!selectedDb}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedDb} onValueChange={setSelectedDb}>
          <SelectTrigger>
            <SelectValue placeholder="Select database" />
          </SelectTrigger>
          <SelectContent>
            {databases?.databases.map((db) => (
              <SelectItem key={db.name} value={db.name}>
                {db.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {isLoading && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading statistics...
          </div>
        )}
        
        {stats && (
          <div className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Entities" value={stats.entities?.total || 0} />
              <StatCard label="Relationships" value={stats.relationships?.total || 0} />
              <StatCard label="Communities" value={stats.communities?.total || 0} />
              <StatCard label="Avg Degree" value={(stats.graph?.avg_degree || 0).toFixed(1)} />
            </div>
            
            {/* Graph Metrics */}
            {stats.graph && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="text-xs font-medium">Graph Metrics</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Density</span>
                    <span className="font-mono">{(stats.graph.density || 0).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Degree</span>
                    <span className="font-mono">{stats.graph.max_degree || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Isolated</span>
                    <span className="font-mono">{stats.graph.isolated_nodes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Components</span>
                    <span className="font-mono">{stats.graph.connected_components || 1}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Export Button */}
            <Button variant="outline" size="sm" className="w-full" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export Full Report (Coming Soon)
            </Button>
          </div>
        )}
        
        {!selectedDb && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Select a database to view analytics
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
```

---

## Phase 5: State Management (30 min)

### 5.1 Create Management Store

Create `src/lib/store/management-store.ts`:

```typescript
// src/lib/store/management-store.ts
// Uses devtools(persist(...)) pattern consistent with other stores
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface ManagementState {
  // Selected database (persisted)
  selectedDatabase: string | null
  setSelectedDatabase: (db: string | null) => void
  
  // Active operations being tracked
  activeOperationIds: string[]
  addActiveOperation: (id: string) => void
  removeActiveOperation: (id: string) => void
  
  // Last used values for forms
  lastSourceDb: string
  lastTargetDb: string
  setLastDbs: (source: string, target: string) => void
}

export const useManagementStore = create<ManagementState>()(
  devtools(
    persist(
      (set) => ({
        selectedDatabase: null,
        setSelectedDatabase: (db) => set({ selectedDatabase: db }),
        
        activeOperationIds: [],
        addActiveOperation: (id) => set((state) => ({
          activeOperationIds: [...state.activeOperationIds, id]
        })),
        removeActiveOperation: (id) => set((state) => ({
          activeOperationIds: state.activeOperationIds.filter(opId => opId !== id)
        })),
        
        lastSourceDb: '',
        lastTargetDb: '',
        setLastDbs: (source, target) => set({ lastSourceDb: source, lastTargetDb: target }),
      }),
      {
        name: 'stages-management-store',
        partialize: (state) => ({
          selectedDatabase: state.selectedDatabase,
          lastSourceDb: state.lastSourceDb,
          lastTargetDb: state.lastTargetDb,
          // Consider persisting activeOperationIds to recover on page refresh
          // activeOperationIds: state.activeOperationIds,
        }),
      }
    ),
    { name: 'management-store' }
  )
)
```

**Note**: Consider persisting `activeOperationIds` and implementing recovery logic on page load for long-running operations that survive page refreshes.

---

## Implementation Checklist

### Phase 1: Routes (1-2 hours)
- [ ] Create `src/components/layout/nav-link.tsx` client component
- [ ] Add navigation to `src/app/layout.tsx` (import NavLink)
- [ ] Move current page to `src/app/execution/page.tsx`
- [ ] Update `src/app/page.tsx` with redirect
- [ ] Create `src/app/management/page.tsx` with grid layout

### Phase 2: API Client (1 hour)
- [ ] Create `src/types/management.ts` with type definitions
- [ ] Create `src/lib/api/management.ts` using existing `api` client
- [ ] Test API calls work with backend

### Phase 3: Hooks (1 hour)
- [ ] Create `src/lib/query-keys.ts` with centralized query keys
- [ ] Create `src/hooks/use-management.ts` with React Query hooks
- [ ] Test database inspection hook
- [ ] Test operation polling hook

### Phase 4: Components (3-4 hours)
- [ ] Create `src/components/management/database-operations.tsx`
  - [ ] Copy Collection form with progress
  - [ ] Clean GraphRAG form with confirmation
  - [ ] Database Inspector
- [ ] Create `src/components/management/observability-panel.tsx`
  - [ ] Health status grid
  - [ ] Quick links to Grafana/Prometheus/Loki
- [ ] Create `src/components/management/maintenance-panel.tsx`
  - [ ] Clean Stage Status form
  - [ ] Rebuild Indexes form
- [ ] Create `src/components/management/analytics-panel.tsx`
  - [ ] Stats cards
  - [ ] Graph metrics display

### Phase 5: State Management (30 min)
- [ ] Create `src/lib/store/management-store.ts`
- [ ] Integrate store into components

### Phase 6: Testing (1 hour)
- [ ] Test all forms submit correctly
- [ ] Test progress tracking for copy operations
- [ ] Test confirmation flow for destructive operations
- [ ] Test navigation between routes
- [ ] Test error states display correctly

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          StagesUI                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /execution                    /management                      │
│  ┌───────────────────────┐    ┌───────────────────────────────┐│
│  │ Pipeline Configuration │    │ Left: Config  │ Right: Utils  ││
│  │ Stage Selection        │    │ (Collapsed)   │              ││
│  │ Stage Config           │    │               │ Database Ops ││
│  │ Execution Panel        │    │ Pipeline      │ Observability││
│  │ History                │    │ Stages        │ Maintenance  ││
│  └───────────────────────┘    │               │ Analytics    ││
│                                └───────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                        API Layer                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ lib/api/management.ts          hooks/use-management.ts      ││
│  │ - inspectDatabases()           - useDatabaseInspector()     ││
│  │ - copyCollection()             - useOperationStatus()       ││
│  │ - cleanGraphRAGData()          - useCopyCollection()        ││
│  │ - getOperationStatus()         - useCleanGraphRAG()         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                        State Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ lib/store/management-store.ts                               ││
│  │ - selectedDatabase (persisted)                              ││
│  │ - activeOperationIds                                        ││
│  │ - lastSourceDb, lastTargetDb                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend APIs                                 │
├─────────────────────────────────────────────────────────────────┤
│  Stages API (8080)              │  Graph API (8081)             │
│  - /management/*                │  - /api/statistics            │
│  - /observability/health        │  - /api/metrics/quality       │
│  - /pipelines/*                 │  - /api/entities/*            │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Summary

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/layout.tsx` | +30 | Navigation additions |
| `src/app/execution/page.tsx` | ~200 | Moved from page.tsx |
| `src/app/management/page.tsx` | ~60 | Management layout |
| `src/components/layout/nav-link.tsx` | ~25 | Client nav component |
| `src/types/management.ts` | ~100 | Type definitions |
| `src/lib/api/management.ts` | ~80 | API client |
| `src/lib/query-keys.ts` | ~35 | Query keys |
| `src/hooks/use-management.ts` | ~100 | React Query hooks |
| `src/lib/store/management-store.ts` | ~50 | Zustand store |
| `src/components/management/database-operations.tsx` | ~300 | Database ops panel |
| `src/components/management/observability-panel.tsx` | ~100 | Health panel |
| `src/components/management/maintenance-panel.tsx` | ~200 | Maintenance panel |
| `src/components/management/analytics-panel.tsx` | ~150 | Analytics panel |

**Total Estimated Effort**: 8-10 hours

