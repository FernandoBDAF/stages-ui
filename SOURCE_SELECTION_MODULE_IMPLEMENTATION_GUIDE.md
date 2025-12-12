# Source Selection Module - Frontend Implementation Guide

**Project**: Knowledge Manager - StagesUI Frontend  
**Module**: Source Selection (Multi-Step Execution Wizard)  
**Date**: December 11, 2024  
**Version**: 1.1.0  
**Status**: Ready for Implementation

---

## Executive Summary

This guide provides complete implementation instructions for the Source Selection module in the StagesUI frontend. The module transforms the Execution page into a **3-step wizard** that allows users to filter and select videos from `raw_videos` **before** pipeline execution.

### Scope
- New Zustand store for source selection state
- New API client for source selection endpoints
- New React Query hooks for data fetching
- 7 new UI components for the wizard
- Modifications to existing execution page and hooks
- TypeScript types for the module

### Prerequisites

#### Backend API
- Backend Source Selection API must be implemented first (see `GraphRAG/SOURCE_SELECTION_API_IMPLEMENTATION_GUIDE.md`)
- Verify these endpoints are available:
  - `GET /source-selection/channels/{db}` 
  - `POST /source-selection/preview`
  - `GET/POST /source-selection/filters/{db}`
  - `GET/PUT/DELETE /source-selection/filters/{db}/{id}`
  - `POST /source-selection/resolve`

#### Frontend Dependencies
- Existing execution module must be functional

### Estimated Effort: 12-16 hours

---

## Table of Contents

1. [Phase 0: Setup Dependencies](#phase-0-setup-dependencies)
2. [Architecture Overview](#architecture-overview)
3. [File Structure](#file-structure)
4. [Constants](#constants)
5. [Type Definitions](#type-definitions)
6. [API Client Modifications](#api-client-modifications)
7. [API Client](#api-client)
8. [Zustand Store](#zustand-store)
9. [React Query Hooks](#react-query-hooks)
10. [Components Implementation](#components-implementation)
11. [Execution Page Integration](#execution-page-integration)
12. [Error Handling](#error-handling)
13. [Mock Data for Development](#mock-data-for-development)
14. [Testing Checklist](#testing-checklist)

---

## Phase 0: Setup Dependencies

Before implementing any components, install required dependencies and create missing UI components.

### NPM Dependencies

```bash
# Toast notifications
npm install sonner

# Note: lodash-es debounce replaced with native implementation (see hooks section)
```

Then add the `<Toaster />` component to `src/app/layout.tsx` or your providers file:

```typescript
// In src/app/layout.tsx or providers.tsx
import { Toaster } from 'sonner';

// In the JSX:
<Toaster position="top-right" richColors />
```

### Missing UI Components (shadcn/ui)

Run these commands to add required UI components:

```bash
npx shadcn@latest add scroll-area
npx shadcn@latest add dialog
npx shadcn@latest add separator
npx shadcn@latest add switch
npx shadcn@latest add alert-dialog  # For delete confirmation
```

These commands will create the component files in `src/components/ui/` with proper styling.

---

## Constants

Create file `src/lib/constants/source-selection.ts` for configuration values:

```typescript
/**
 * Source Selection Constants
 * 
 * Centralized configuration for the source selection module.
 */

export const SOURCE_SELECTION = {
  /** Cache times for React Query */
  CACHE_TIMES: {
    /** Channels don't change often - 5 minutes */
    CHANNELS_MS: 5 * 60 * 1000,
    /** Previews can cache briefly - 30 seconds */
    PREVIEW_MS: 30 * 1000,
  },
  
  /** Preview configuration */
  PREVIEW: {
    /** Number of sample videos to show */
    SAMPLE_LIMIT: 5,
    /** Debounce delay for filter changes (ms) */
    DEBOUNCE_MS: 300,
  },
  
  /** Slider bounds */
  SLIDERS: {
    VIEWS: {
      MAX: 100000,
      STEP: 1000,
    },
    ENGAGEMENT: {
      MAX: 20, // percentage
      STEP: 0.5,
    },
  },
  
  /** Default database fallback */
  DEFAULT_DB_NAME: 'mongo_hack',
} as const;
```

---

## Architecture Overview

### Current vs New Execution Flow

**Current Flow (Single Step)**:
```
/execution
└── Select Pipeline → Select Stages → Configure → Execute
    (all in one page)
```

**New Flow (Multi-Step Wizard)**:
```
/execution
├── Step 1: Source Selection (NEW)
│   └── Filter raw_videos → Save filter → Preview
├── Step 2: Configure (EXISTING)
│   └── Select Pipeline → Select Stages → Configure
└── Step 3: Execute & Monitor (EXISTING)
    └── Validate → Execute → Monitor → History
```

### Component Hierarchy

```
execution/page.tsx
└── ExecutionWizard
    ├── WizardStepIndicator
    │   ├── Step 1: "Select Source" (active/completed)
    │   ├── Step 2: "Configure" (active/completed/pending)
    │   └── Step 3: "Execute" (active/completed/pending)
    │
    ├── Step 1: SourceSelectionPanel
    │   ├── ModeToggle ("Process All" / "Filter Videos")
    │   ├── SavedFiltersList
    │   │   └── FilterCard (for each saved filter)
    │   ├── FilterBuilder
    │   │   ├── ChannelSelector (multi-select with stats)
    │   │   ├── DateRangePicker
    │   │   ├── EngagementSliders
    │   │   ├── KeywordsInput
    │   │   └── DurationSlider
    │   └── FilterPreview
    │       ├── Statistics summary
    │       └── VideoSampleCard (for each sample)
    │
    ├── Step 2: ConfigurationPanel (EXISTING)
    │   ├── PipelineSelector
    │   ├── StageSelector
    │   └── StageConfigPanels
    │
    └── Step 3: ExecutionPanel (EXISTING)
        ├── ValidationResults
        └── StatusMonitor
```

---

## File Structure

```
StagesUI/src/
├── app/
│   └── execution/
│       └── page.tsx                          # MODIFY: Add wizard wrapper
│
├── components/
│   └── execution/
│       ├── execution-wizard.tsx              # NEW: Main wizard component
│       ├── wizard-step-indicator.tsx         # NEW: Step progress UI
│       │
│       ├── source-selection/
│       │   ├── source-selection-panel.tsx    # NEW: Main panel
│       │   ├── mode-toggle.tsx               # NEW: All/Filter toggle
│       │   ├── channel-selector.tsx          # NEW: Channel multi-select
│       │   ├── filter-builder.tsx            # NEW: Filter form
│       │   ├── filter-preview.tsx            # NEW: Preview results
│       │   ├── saved-filters-list.tsx        # NEW: Saved filter cards
│       │   └── video-sample-card.tsx         # NEW: Video preview card
│       │
│       └── ... (existing components)
│
├── lib/
│   ├── api/
│   │   └── source-selection.ts               # NEW: API client
│   ├── store/
│   │   └── source-selection-store.ts         # NEW: Zustand store
│   └── query-keys.ts                         # MODIFY: Add source-selection keys
│
├── hooks/
│   ├── use-source-selection.ts               # NEW: React Query hooks
│   └── use-pipeline-execution.ts             # MODIFY: Add filter support
│
└── types/
    └── source-selection.ts                   # NEW: TypeScript types
```

---

## API Client Modifications

The existing API client at `src/lib/api/client.ts` needs `put` and `delete` methods.

**Modify** `src/lib/api/client.ts`:

```typescript
// Add after the existing 'post' method in the api object:

export const api = {
  get: <T>(endpoint: string, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, options),
    
  post: <T>(endpoint: string, data: unknown, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
    
  // ADD THESE TWO METHODS:
  put: <T>(endpoint: string, data: unknown, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    }),
    
  delete: <T>(endpoint: string, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, {
      method: 'DELETE',
      ...options,
    }),
};
```

---

## Type Definitions

Create file `src/types/source-selection.ts`:

```typescript
/**
 * Source Selection Module Types
 * 
 * Types for filtering raw_videos before pipeline execution.
 */

// ============================================================
// Filter Definition Types
// ============================================================

export interface FilterDefinition {
  /** Array of channel_ids to include */
  channels?: string[];
  
  /** Date range filter on published_at */
  date_range?: {
    start?: string;  // ISO date string
    end?: string;
  };
  
  /** Engagement metrics filters */
  engagement?: {
    min_views?: number;
    max_views?: number;
    min_engagement_score?: number;
  };
  
  /** Content-based filters */
  content?: {
    keywords_any?: string[];   // Match any keyword
    keywords_all?: string[];   // Match all keywords
    has_transcript?: boolean;
  };
  
  /** Duration filter in seconds */
  duration?: {
    min_seconds?: number;
    max_seconds?: number;
  };
  
  /** Playlist filter */
  playlist_ids?: string[];
  
  /** Sort configuration */
  sort?: {
    field: 'published_at' | 'engagement_score' | 'stats.viewCount';
    order: 'asc' | 'desc';
  };
  
  /** Maximum videos to process */
  limit?: number;
}

// ============================================================
// Channel Statistics Types
// ============================================================

export interface ChannelInfo {
  channel_id: string;
  channel_title: string;
  video_count: number;
  total_views: number;
  total_likes: number;
  avg_engagement: number;
  avg_duration_minutes: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  transcript_coverage: number;
}

export interface ChannelsResponse {
  db_name: string;
  collection: string;
  channels: ChannelInfo[];
  summary: {
    total_videos: number;
    total_channels: number;
  };
  timestamp: string;
}

// ============================================================
// Filter Preview Types
// ============================================================

export interface FilterPreviewChannel {
  id: string;
  title: string;
  count: number;
}

export interface SampleVideo {
  video_id: string;
  title: string;
  channel_title: string;
  channel_id: string;
  published_at: string;
  thumbnail_url: string;
  stats: {
    viewCount: number;
    likeCount: number;
  };
  duration_seconds?: number;
  engagement_score?: number;
}

export interface FilterPreviewResponse {
  total_matching: number;
  channels: FilterPreviewChannel[];
  date_range: {
    earliest: string;
    latest: string;
  } | null;
  statistics: {
    total_duration_minutes: number;
    avg_engagement: number;
    avg_views: number;
    transcript_coverage: number;
  };
  sample_videos: SampleVideo[];
  warnings: string[];
  query?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================
// Saved Filter Types
// ============================================================

export interface SavedFilterSummary {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  use_count: number;
}

export interface SavedFilter extends SavedFilterSummary {
  filter_definition: FilterDefinition;
}

export interface SavedFiltersResponse {
  db_name: string;
  filters: SavedFilterSummary[];
  count: number;
  timestamp: string;
}

export interface SaveFilterResponse {
  db_name: string;
  filter: SavedFilter;
  message: string;
}

// ============================================================
// Resolution Types
// ============================================================

export interface ResolveFilterResponse {
  db_name: string;
  video_ids: string[];
  count: number;
  filter_applied: boolean;
  timestamp: string;
}

// ============================================================
// Store Types
// ============================================================

export type SelectionMode = 'all' | 'filtered';

export type WizardStep = 'source_selection' | 'configuration' | 'execution';

// Note: Loading states are NOT included here - they come from React Query's
// isLoading/isPending states. This avoids duplicate state management.

// ============================================================
// Error Response Types
// ============================================================

export interface SourceSelectionErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================
// API Request Types
// ============================================================

export interface PreviewFilterRequest {
  db_name: string;
  filter: FilterDefinition;
  sample_limit?: number;
}

export interface SaveFilterRequest {
  name: string;
  description?: string;
  filter_definition: FilterDefinition;
}

export interface ResolveFilterRequest {
  db_name: string;
  filter_id?: string;
  filter_definition?: FilterDefinition;
}
```

---

## API Client

Create file `src/lib/api/source-selection.ts`:

```typescript
/**
 * Source Selection API Client
 * 
 * Provides functions for interacting with the source selection endpoints.
 */

import { api } from './client';
import type {
  ChannelsResponse,
  FilterPreviewResponse,
  PreviewFilterRequest,
  SavedFiltersResponse,
  SavedFilter,
  SaveFilterRequest,
  SaveFilterResponse,
  ResolveFilterRequest,
  ResolveFilterResponse,
} from '@/types/source-selection';

const BASE_PATH = '/source-selection';

export const sourceSelectionApi = {
  /**
   * Get channel statistics from raw_videos collection.
   */
  getChannels: async (dbName: string): Promise<ChannelsResponse> => {
    return api.get<ChannelsResponse>(`${BASE_PATH}/channels/${dbName}`);
  },

  /**
   * Preview filter results without saving.
   */
  previewFilter: async (request: PreviewFilterRequest): Promise<FilterPreviewResponse> => {
    return api.post<FilterPreviewResponse>(`${BASE_PATH}/preview`, request);
  },

  /**
   * List all saved filters for a database.
   */
  listFilters: async (dbName: string): Promise<SavedFiltersResponse> => {
    return api.get<SavedFiltersResponse>(`${BASE_PATH}/filters/${dbName}`);
  },

  /**
   * Get a specific saved filter by ID.
   */
  getFilter: async (dbName: string, filterId: string): Promise<{ filter: SavedFilter }> => {
    return api.get<{ filter: SavedFilter }>(`${BASE_PATH}/filters/${dbName}/${filterId}`);
  },

  /**
   * Create a new saved filter.
   */
  saveFilter: async (dbName: string, request: SaveFilterRequest): Promise<SaveFilterResponse> => {
    return api.post<SaveFilterResponse>(`${BASE_PATH}/filters/${dbName}`, request);
  },

  /**
   * Update an existing filter.
   */
  updateFilter: async (
    dbName: string,
    filterId: string,
    updates: Partial<SaveFilterRequest>
  ): Promise<{ message: string }> => {
    return api.put<{ message: string }>(`${BASE_PATH}/filters/${dbName}/${filterId}`, updates);
  },

  /**
   * Delete a saved filter.
   */
  deleteFilter: async (dbName: string, filterId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`${BASE_PATH}/filters/${dbName}/${filterId}`);
  },

  /**
   * Duplicate a saved filter.
   */
  duplicateFilter: async (
    dbName: string,
    filterId: string,
    newName: string
  ): Promise<SaveFilterResponse> => {
    return api.post<SaveFilterResponse>(
      `${BASE_PATH}/filters/${dbName}/${filterId}/duplicate`,
      { name: newName }
    );
  },

  /**
   * Resolve a filter to video IDs.
   */
  resolveFilter: async (request: ResolveFilterRequest): Promise<ResolveFilterResponse> => {
    return api.post<ResolveFilterResponse>(`${BASE_PATH}/resolve`, request);
  },
};
```

---

## Zustand Store

Create file `src/lib/store/source-selection-store.ts`:

```typescript
/**
 * Source Selection Store
 * 
 * Manages state for the source selection wizard step.
 * 
 * IMPORTANT: Loading states are NOT managed here. They come from React Query's
 * isLoading/isPending states to avoid duplicate state management.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  SelectionMode,
  WizardStep,
  FilterDefinition,
  ChannelInfo,
  SavedFilterSummary,
  FilterPreviewResponse,
} from '@/types/source-selection';

const DEFAULT_FILTER: FilterDefinition = {
  channels: [],
  sort: { field: 'published_at', order: 'desc' },
};

interface SourceSelectionState {
  // Mode
  mode: SelectionMode;
  
  // Wizard navigation
  currentStep: WizardStep;
  
  // Filter state
  currentFilter: FilterDefinition;
  selectedFilterId: string | null;
  
  // Data (cached from API)
  channels: ChannelInfo[];
  savedFilters: SavedFilterSummary[];
  preview: FilterPreviewResponse | null;
}

interface SourceSelectionActions {
  // Mode
  setMode: (mode: SelectionMode) => void;
  
  // Wizard navigation
  setCurrentStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceedToNext: () => boolean;
  
  // Filter management
  setCurrentFilter: (filter: FilterDefinition) => void;
  updateFilter: (updates: Partial<FilterDefinition>) => void;
  selectSavedFilter: (id: string | null) => void;
  resetFilter: () => void;
  
  // Data setters (called by React Query hooks)
  setChannels: (channels: ChannelInfo[]) => void;
  setSavedFilters: (filters: SavedFilterSummary[]) => void;
  setPreview: (preview: FilterPreviewResponse | null) => void;
  
  // Computed helpers
  hasActiveFilter: () => boolean;
  getFilterSummary: () => string;
  
  // Execution helpers
  getExecutionMetadata: () => {
    input_filter_id?: string;
    input_filter?: FilterDefinition;
  };
}

const STEP_ORDER: WizardStep[] = ['source_selection', 'configuration', 'execution'];

export const useSourceSelectionStore = create<SourceSelectionState & SourceSelectionActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        mode: 'all',
        currentStep: 'source_selection',
        currentFilter: DEFAULT_FILTER,
        selectedFilterId: null,
        channels: [],
        savedFilters: [],
        preview: null,

        // Mode
        setMode: (mode) => {
          set({ mode });
          if (mode === 'all') {
            // Reset filter when switching to "all" mode
            set({ 
              currentFilter: DEFAULT_FILTER,
              selectedFilterId: null,
              preview: null 
            });
          }
        },

        // Wizard navigation
        setCurrentStep: (step) => set({ currentStep: step }),
        
        goToNextStep: () => {
          const { currentStep, canProceedToNext } = get();
          if (!canProceedToNext()) return;
          
          const currentIndex = STEP_ORDER.indexOf(currentStep);
          if (currentIndex < STEP_ORDER.length - 1) {
            set({ currentStep: STEP_ORDER[currentIndex + 1] });
          }
        },
        
        goToPreviousStep: () => {
          const { currentStep } = get();
          const currentIndex = STEP_ORDER.indexOf(currentStep);
          if (currentIndex > 0) {
            set({ currentStep: STEP_ORDER[currentIndex - 1] });
          }
        },
        
        canProceedToNext: () => {
          const { currentStep, mode, preview } = get();
          
          if (currentStep === 'source_selection') {
            // Can proceed if "all" mode or if filter has results
            if (mode === 'all') return true;
            return preview !== null && preview.total_matching > 0;
          }
          
          // For other steps, delegate to their own validation
          return true;
        },

        // Filter management
        setCurrentFilter: (filter) => {
          set({ 
            currentFilter: filter,
            selectedFilterId: null // Clear saved filter when manually setting
          });
        },
        
        updateFilter: (updates) => {
          const { currentFilter } = get();
          set({ 
            currentFilter: { ...currentFilter, ...updates },
            selectedFilterId: null,
            preview: null // Clear preview when filter changes
          });
        },
        
        selectSavedFilter: (id) => {
          if (id === null) {
            set({ 
              selectedFilterId: null, 
              currentFilter: DEFAULT_FILTER,
              preview: null,
              mode: 'all'
            });
            return;
          }
          
          // Filter will be loaded by the hook
          set({ 
            selectedFilterId: id,
            mode: 'filtered'
          });
        },
        
        resetFilter: () => {
          set({ 
            currentFilter: DEFAULT_FILTER,
            selectedFilterId: null,
            preview: null,
            mode: 'all'
          });
        },

        // Data setters (called by React Query hooks on success)
        setChannels: (channels) => set({ channels }),
        setSavedFilters: (filters) => set({ savedFilters: filters }),
        setPreview: (preview) => set({ preview }),

        // Computed helpers
        hasActiveFilter: () => {
          const { mode, currentFilter } = get();
          if (mode === 'all') return false;
          
          // Check if any filter criteria is set
          return (
            (currentFilter.channels && currentFilter.channels.length > 0) ||
            currentFilter.date_range?.start !== undefined ||
            currentFilter.date_range?.end !== undefined ||
            currentFilter.engagement?.min_views !== undefined ||
            currentFilter.engagement?.max_views !== undefined ||
            currentFilter.engagement?.min_engagement_score !== undefined ||
            currentFilter.content?.keywords_any !== undefined ||
            currentFilter.content?.has_transcript !== undefined ||
            currentFilter.duration?.min_seconds !== undefined ||
            currentFilter.duration?.max_seconds !== undefined ||
            (currentFilter.playlist_ids && currentFilter.playlist_ids.length > 0) ||
            currentFilter.limit !== undefined
          );
        },
        
        getFilterSummary: () => {
          const { mode, preview, currentFilter, channels } = get();
          
          if (mode === 'all') {
            const total = channels.reduce((sum, c) => sum + c.video_count, 0);
            return `Processing all ${total} videos`;
          }
          
          if (!preview) return 'Configure filter';
          
          const count = preview.total_matching;
          const channelCount = preview.channels.length;
          
          if (currentFilter.limit && count > currentFilter.limit) {
            return `${currentFilter.limit} of ${count} videos (${channelCount} channels)`;
          }
          
          return `${count} videos from ${channelCount} channel${channelCount !== 1 ? 's' : ''}`;
        },

        // Execution helpers
        getExecutionMetadata: () => {
          const { mode, selectedFilterId, currentFilter } = get();
          
          if (mode === 'all') {
            return {}; // No filter metadata
          }
          
          if (selectedFilterId) {
            return { input_filter_id: selectedFilterId };
          }
          
          return { input_filter: currentFilter };
        },
      }),
      {
        name: 'source-selection-storage',
        // Persist filter state AND current step for consistent UX
        // User can resume where they left off
        partialize: (state) => ({
          mode: state.mode,
          currentStep: state.currentStep,
          currentFilter: state.currentFilter,
          selectedFilterId: state.selectedFilterId,
        }),
      }
    ),
    { name: 'source-selection-store' }
  )
);
```

---

## React Query Hooks

Create file `src/hooks/use-source-selection.ts`:

```typescript
/**
 * Source Selection Hooks
 * 
 * React Query hooks for fetching source selection data.
 * 
 * Note: Loading states come from React Query (isLoading, isPending).
 * We don't duplicate them in Zustand store.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sourceSelectionApi } from '@/lib/api/source-selection';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { queryKeys } from '@/lib/query-keys';
import { SOURCE_SELECTION } from '@/lib/constants/source-selection';
import type {
  FilterDefinition,
  SaveFilterRequest,
} from '@/types/source-selection';
import { toast } from 'sonner';

/**
 * Get database name from environment or use fallback
 */
const getDbName = () => 
  process.env.NEXT_PUBLIC_DB_NAME || SOURCE_SELECTION.DEFAULT_DB_NAME;

/**
 * Hook to fetch channel statistics
 */
export function useChannels(dbName?: string) {
  const db = dbName || getDbName();
  const setChannels = useSourceSelectionStore((state) => state.setChannels);

  return useQuery({
    queryKey: queryKeys.sourceSelection.channels(db),
    queryFn: async () => {
      const response = await sourceSelectionApi.getChannels(db);
      setChannels(response.channels);
      return response;
    },
    staleTime: SOURCE_SELECTION.CACHE_TIMES.CHANNELS_MS,
  });
}

/**
 * Hook to fetch saved filters
 */
export function useSavedFilters(dbName?: string) {
  const db = dbName || getDbName();
  const setSavedFilters = useSourceSelectionStore((state) => state.setSavedFilters);

  return useQuery({
    queryKey: queryKeys.sourceSelection.filters(db),
    queryFn: async () => {
      const response = await sourceSelectionApi.listFilters(db);
      setSavedFilters(response.filters);
      return response;
    },
  });
}

/**
 * Hook to fetch a specific saved filter
 */
export function useSavedFilter(filterId: string | null, dbName?: string) {
  const db = dbName || getDbName();
  const setCurrentFilter = useSourceSelectionStore((state) => state.setCurrentFilter);

  return useQuery({
    queryKey: queryKeys.sourceSelection.filter(db, filterId || ''),
    queryFn: async () => {
      if (!filterId) return null;
      const response = await sourceSelectionApi.getFilter(db, filterId);
      setCurrentFilter(response.filter.filter_definition);
      return response.filter;
    },
    enabled: !!filterId,
  });
}

/**
 * Hook to preview filter results
 */
export function useFilterPreview(
  filter: FilterDefinition,
  enabled: boolean = true,
  dbName?: string
) {
  const db = dbName || getDbName();
  const setPreview = useSourceSelectionStore((state) => state.setPreview);
  const mode = useSourceSelectionStore((state) => state.mode);

  return useQuery({
    queryKey: queryKeys.sourceSelection.preview(db, filter),
    queryFn: async () => {
      const response = await sourceSelectionApi.previewFilter({
        db_name: db,
        filter,
        sample_limit: SOURCE_SELECTION.PREVIEW.SAMPLE_LIMIT,
      });
      setPreview(response);
      return response;
    },
    enabled: enabled && mode === 'filtered',
    staleTime: SOURCE_SELECTION.CACHE_TIMES.PREVIEW_MS,
  });
}

/**
 * Hook to save a new filter
 */
export function useSaveFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SaveFilterRequest) => {
      return await sourceSelectionApi.saveFilter(db, request);
    },
    onSuccess: (data) => {
      toast.success(`Filter "${data.filter.name}" saved`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save filter: ${error.message}`);
    },
  });
}

/**
 * Hook to update a filter
 */
export function useUpdateFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      filterId,
      updates,
    }: {
      filterId: string;
      updates: Partial<SaveFilterRequest>;
    }) => {
      return await sourceSelectionApi.updateFilter(db, filterId, updates);
    },
    onSuccess: () => {
      toast.success('Filter updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update filter: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a filter
 */
export function useDeleteFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();
  const selectedFilterId = useSourceSelectionStore((state) => state.selectedFilterId);
  const selectSavedFilter = useSourceSelectionStore((state) => state.selectSavedFilter);

  return useMutation({
    mutationFn: async (filterId: string) => {
      return await sourceSelectionApi.deleteFilter(db, filterId);
    },
    onSuccess: (_, filterId) => {
      toast.success('Filter deleted');
      // If we deleted the currently selected filter, clear selection
      if (selectedFilterId === filterId) {
        selectSavedFilter(null);
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete filter: ${error.message}`);
    },
  });
}

/**
 * Hook to duplicate a filter
 */
export function useDuplicateFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      filterId,
      newName,
    }: {
      filterId: string;
      newName: string;
    }) => {
      return await sourceSelectionApi.duplicateFilter(db, filterId, newName);
    },
    onSuccess: (data) => {
      toast.success(`Created "${data.filter.name}"`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate filter: ${error.message}`);
    },
  });
}
```

### Update Query Keys

Modify `src/lib/query-keys.ts` to add source selection keys:

```typescript
// Add to existing queryKeys object:

/**
 * Create a stable cache key for filter objects.
 * Ensures consistent key generation regardless of property order.
 */
function createFilterCacheKey(filter: Record<string, unknown>): string {
  const sortedKeys = Object.keys(filter).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = filter[key];
  }
  return JSON.stringify(sortedObj);
}

export const queryKeys = {
  // ... existing keys ...
  
  sourceSelection: {
    all: ['source-selection'] as const,
    channels: (dbName: string) => 
      [...queryKeys.sourceSelection.all, 'channels', dbName] as const,
    filters: (dbName: string) => 
      [...queryKeys.sourceSelection.all, 'filters', dbName] as const,
    filter: (dbName: string, filterId: string) => 
      [...queryKeys.sourceSelection.filters(dbName), filterId] as const,
    preview: (dbName: string, filter: Record<string, unknown>) => 
      [...queryKeys.sourceSelection.all, 'preview', dbName, createFilterCacheKey(filter)] as const,
  },
};
```

---

## Components Implementation

### 1. Wizard Step Indicator

Create file `src/components/execution/wizard-step-indicator.tsx`:

```typescript
'use client';

import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import type { WizardStep } from '@/types/source-selection';

interface Step {
  id: WizardStep;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'source_selection', label: 'Select Source', description: 'Filter videos to process' },
  { id: 'configuration', label: 'Configure', description: 'Set pipeline options' },
  { id: 'execution', label: 'Execute', description: 'Run and monitor' },
];

interface WizardStepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  completedSteps?: WizardStep[];
}

export function WizardStepIndicator({
  currentStep,
  onStepClick,
  completedSteps = [],
}: WizardStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id) || index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || index <= currentIndex + 1);

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 top-4 -translate-y-1/2 h-0.5 w-full -translate-x-1/2',
                    isCompleted || isCurrent
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                  style={{ width: 'calc(100% - 2rem)', left: 'calc(-50% + 1rem)' }}
                />
              )}

              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-disabled={!isClickable}
                role="tab"
                tabIndex={isClickable ? 0 : -1}
                className={cn(
                  'relative flex flex-col items-center group',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {/* Step circle */}
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-primary bg-background text-primary'
                      : 'border-muted bg-background text-muted-foreground',
                    isClickable && !isCurrent && 'group-hover:border-primary/50'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </span>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-sm font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>

                {/* Step description */}
                <span className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {step.description}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

### 1b. Wizard Error Boundary

Create file `src/components/execution/wizard-error-boundary.tsx`:

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  stepName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WizardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Wizard step error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {this.props.stepName ? `Error in ${this.props.stepName}` : 'Step Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Something went wrong while loading this step. This could be a temporary issue.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

### 2. Channel Selector

Create file `src/components/execution/source-selection/channel-selector.tsx`:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Video, Eye, TrendingUp } from 'lucide-react';
import type { ChannelInfo } from '@/types/source-selection';

interface ChannelSelectorProps {
  channels: ChannelInfo[];
  selectedChannels: string[];
  onSelectionChange: (channelIds: string[]) => void;
  loading?: boolean;
}

export function ChannelSelector({
  channels,
  selectedChannels,
  onSelectionChange,
  loading = false,
}: ChannelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter(
      (c) =>
        c.channel_title.toLowerCase().includes(query) ||
        c.channel_id.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const handleToggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      onSelectionChange(selectedChannels.filter((id) => id !== channelId));
    } else {
      onSelectionChange([...selectedChannels, channelId]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredChannels.map((c) => c.channel_id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Channels ({selectedChannels.length} / {channels.length})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={selectedChannels.length === filteredChannels.length}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedChannels.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Channel List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredChannels.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No channels found
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = selectedChannels.includes(channel.channel_id);
              
              return (
                <button
                  key={channel.channel_id}
                  onClick={() => handleToggleChannel(channel.channel_id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleChannel(channel.channel_id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {channel.channel_title}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {channel.video_count} videos
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(channel.total_views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {(channel.avg_engagement * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {channel.transcript_coverage < 80 && (
                    <Badge variant="outline" className="text-xs">
                      {channel.transcript_coverage.toFixed(0)}% transcripts
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

### 3. Filter Preview

Create file `src/components/execution/source-selection/filter-preview.tsx`:

```typescript
'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  FileText,
  Calendar
} from 'lucide-react';
import type { FilterPreviewResponse, SampleVideo } from '@/types/source-selection';

interface FilterPreviewProps {
  preview: FilterPreviewResponse | null;
  loading?: boolean;
}

export function FilterPreview({ preview, loading }: FilterPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Configure a filter to see preview</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    return `${Math.round(minutes)}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.round(num).toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Filter Preview</span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {preview.total_matching} videos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warnings */}
        {preview.warnings.length > 0 && (
          <div className="space-y-2">
            {preview.warnings.map((warning, i) => (
              <Alert key={i} variant="default" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Channels"
            value={preview.channels.length.toString()}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Total Duration"
            value={formatDuration(preview.statistics.total_duration_minutes)}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg Engagement"
            value={`${(preview.statistics.avg_engagement * 100).toFixed(1)}%`}
          />
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Has Transcript"
            value={`${preview.statistics.transcript_coverage.toFixed(0)}%`}
          />
        </div>

        {/* Channel Breakdown */}
        {preview.channels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Channel Breakdown
            </h4>
            <div className="flex flex-wrap gap-2">
              {preview.channels.slice(0, 8).map((channel) => (
                <Badge key={channel.id} variant="outline">
                  {channel.title}: {channel.count}
                </Badge>
              ))}
              {preview.channels.length > 8 && (
                <Badge variant="outline" className="bg-muted">
                  +{preview.channels.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Date Range */}
        {preview.date_range && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(preview.date_range.earliest).toLocaleDateString()} -{' '}
              {new Date(preview.date_range.latest).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Sample Videos */}
        {preview.sample_videos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Sample Videos</h4>
            <div className="space-y-2">
              {preview.sample_videos.map((video) => (
                <SampleVideoCard key={video.video_id} video={video} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function SampleVideoCard({ video }: { video: SampleVideo }) {
  const formatViews = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
    return `${num} views`;
  };

  return (
    <div className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      {video.thumbnail_url && (
        <img
          src={video.thumbnail_url}
          alt=""
          className="w-24 h-14 object-cover rounded flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" title={video.title}>
          {video.title}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {video.channel_title}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatViews(video.stats.viewCount)} •{' '}
          {new Date(video.published_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
```

### 4. Source Selection Panel (Main Component)

Create file `src/components/execution/source-selection/source-selection-panel.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  ArrowRight, 
  Video,
  Loader2,
  Save
} from 'lucide-react';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { SOURCE_SELECTION } from '@/lib/constants/source-selection';
import { 
  useChannels, 
  useSavedFilters, 
  useFilterPreview,
  useSaveFilter,
  useSavedFilter
} from '@/hooks/use-source-selection';
import { ChannelSelector } from './channel-selector';
import { FilterPreview } from './filter-preview';
import { SavedFiltersList } from './saved-filters-list';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SourceSelectionPanelProps {
  onContinue: () => void;
}

export function SourceSelectionPanel({ onContinue }: SourceSelectionPanelProps) {
  // Store state - use individual selectors for better performance
  const mode = useSourceSelectionStore((state) => state.mode);
  const setMode = useSourceSelectionStore((state) => state.setMode);
  const currentFilter = useSourceSelectionStore((state) => state.currentFilter);
  const updateFilter = useSourceSelectionStore((state) => state.updateFilter);
  const selectedFilterId = useSourceSelectionStore((state) => state.selectedFilterId);
  const channels = useSourceSelectionStore((state) => state.channels);
  const preview = useSourceSelectionStore((state) => state.preview);
  const hasActiveFilter = useSourceSelectionStore((state) => state.hasActiveFilter);
  const getFilterSummary = useSourceSelectionStore((state) => state.getFilterSummary);
  const canProceedToNext = useSourceSelectionStore((state) => state.canProceedToNext);

  // Data fetching - loading states come from React Query
  const { data: channelsData, isLoading: channelsLoading } = useChannels();
  useSavedFilters(); // Load saved filters into store
  useSavedFilter(selectedFilterId); // Load selected filter into store
  
  // Preview with debounced query (React Query handles the debounce via staleTime)
  const { isLoading: previewLoading, error: previewError } = useFilterPreview(
    currentFilter,
    mode === 'filtered' && hasActiveFilter()
  );

  // Save filter mutation
  const saveFilterMutation = useSaveFilter();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  const totalVideos = channelsData?.summary.total_videos || 0;

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Filter name is required');
      return;
    }

    await saveFilterMutation.mutateAsync({
      name: filterName.trim(),
      description: filterDescription.trim() || undefined,
      filter_definition: currentFilter,
    });

    setSaveDialogOpen(false);
    setFilterName('');
    setFilterDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Source Selection
          </CardTitle>
          <CardDescription>
            Choose which videos from raw_videos to process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <Switch
                id="filter-mode"
                checked={mode === 'filtered'}
                onCheckedChange={(checked) => setMode(checked ? 'filtered' : 'all')}
              />
              <div>
                <Label htmlFor="filter-mode" className="text-base font-medium">
                  {mode === 'all' ? 'Process All Videos' : 'Filter Videos'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {mode === 'all'
                    ? `All ${totalVideos} videos will be processed`
                    : 'Select specific videos to process'}
                </p>
              </div>
            </div>
            
            <Badge variant="secondary" className="text-lg px-4 py-1">
              <Video className="h-4 w-4 mr-2" />
              {getFilterSummary()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter Configuration (only when filtered mode) */}
      {mode === 'filtered' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Filter Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Builder</CardTitle>
              <CardDescription>
                Configure filter criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="channels">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                </TabsList>

                <TabsContent value="channels" className="mt-4">
                  <ChannelSelector
                    channels={channels}
                    selectedChannels={currentFilter.channels || []}
                    onSelectionChange={(channelIds) =>
                      updateFilter({ channels: channelIds })
                    }
                    loading={channelsLoading}
                  />
                </TabsContent>

                <TabsContent value="engagement" className="mt-4 space-y-6">
                  {/* Min Views */}
                  <div className="space-y-2">
                    <Label>Minimum Views</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[currentFilter.engagement?.min_views || 0]}
                        onValueChange={([value]) =>
                          updateFilter({
                            engagement: {
                              ...currentFilter.engagement,
                              min_views: value || undefined,
                            },
                          })
                        }
                        max={SOURCE_SELECTION.SLIDERS.VIEWS.MAX}
                        step={SOURCE_SELECTION.SLIDERS.VIEWS.STEP}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-20 text-right">
                        {currentFilter.engagement?.min_views?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Min Engagement Score */}
                  <div className="space-y-2">
                    <Label>Minimum Engagement Score</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[
                          (currentFilter.engagement?.min_engagement_score || 0) * 100,
                        ]}
                        onValueChange={([value]) =>
                          updateFilter({
                            engagement: {
                              ...currentFilter.engagement,
                              min_engagement_score: value > 0 ? value / 100 : undefined,
                            },
                          })
                        }
                        max={SOURCE_SELECTION.SLIDERS.ENGAGEMENT.MAX}
                        step={SOURCE_SELECTION.SLIDERS.ENGAGEMENT.STEP}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-20 text-right">
                        {((currentFilter.engagement?.min_engagement_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="mt-4 space-y-6">
                  {/* Has Transcript */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requires Transcript</Label>
                      <p className="text-sm text-muted-foreground">
                        Only include videos with transcripts
                      </p>
                    </div>
                    <Switch
                      checked={currentFilter.content?.has_transcript === true}
                      onCheckedChange={(checked) =>
                        updateFilter({
                          content: {
                            ...currentFilter.content,
                            has_transcript: checked || undefined,
                          },
                        })
                      }
                    />
                  </div>

                  <Separator />

                  {/* Result Limit */}
                  <div className="space-y-2">
                    <Label>Maximum Videos</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={currentFilter.limit || ''}
                      onChange={(e) =>
                        updateFilter({
                          limit: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      min={1}
                      max={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to process all matching videos
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Filter Button */}
              <div className="mt-6 pt-4 border-t flex justify-end">
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!hasActiveFilter() || savingFilter}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Filter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter</DialogTitle>
                      <DialogDescription>
                        Save this filter configuration for future use
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="filter-name">Name</Label>
                        <Input
                          id="filter-name"
                          placeholder="e.g., High Engagement Python Videos"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-desc">Description (optional)</Label>
                        <Input
                          id="filter-desc"
                          placeholder="Describe this filter..."
                          value={filterDescription}
                          onChange={(e) => setFilterDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSaveDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveFilter}
                        disabled={saveFilterMutation.isPending}
                      >
                        {saveFilterMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Right: Preview */}
          <div className="space-y-6">
            <FilterPreview
              preview={preview}
              loading={previewLoading || previewQueryLoading}
            />

            {/* Saved Filters */}
            <SavedFiltersList />
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!canProceedToNext()}
          className="min-w-[200px]"
        >
          Continue to Configuration
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
```

### 5. Saved Filters List

Create file `src/components/execution/source-selection/saved-filters-list.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { 
  Bookmark, 
  Trash2, 
  Copy,
  Clock,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { useDeleteFilter, useDuplicateFilter } from '@/hooks/use-source-selection';
import type { SavedFilterSummary } from '@/types/source-selection';
import { cn } from '@/lib/utils';

export function SavedFiltersList() {
  const { savedFilters, selectedFilterId, selectSavedFilter } = useSourceSelectionStore();
  const deleteFilterMutation = useDeleteFilter();
  const duplicateFilterMutation = useDuplicateFilter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<string | null>(null);

  if (savedFilters.length === 0) {
    return null;
  }

  const handleDeleteClick = (filterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilterToDelete(filterId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (filterToDelete) {
      deleteFilterMutation.mutate(filterToDelete);
      setFilterToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = (filter: SavedFilterSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateFilterMutation.mutate({
      filterId: filter.id,
      newName: `${filter.name} (copy)`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Saved Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {savedFilters.map((filter) => {
              const isSelected = selectedFilterId === filter.id;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => selectSavedFilter(filter.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{filter.name}</div>
                    {filter.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {filter.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(filter.updated_at)}
                      </span>
                      {filter.use_count > 0 && (
                        <Badge variant="secondary" className="text-xs py-0">
                          Used {filter.use_count}x
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleDuplicate(filter, e)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(filter.id, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this filter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
```

---

## Execution Page Integration

### Modify `src/app/execution/page.tsx`

Replace the current content with the wizard-based implementation:

```typescript
'use client';

import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { WizardStepIndicator } from '@/components/execution/wizard-step-indicator';
import { WizardErrorBoundary } from '@/components/execution/wizard-error-boundary';
import { SourceSelectionPanel } from '@/components/execution/source-selection/source-selection-panel';
import { useStages } from '@/hooks/use-stages';
import { PipelineSelector } from '@/components/pipeline/pipeline-selector';
import { StageSelector } from '@/components/pipeline/stage-selector';
import { StageConfigPanel } from '@/components/config/stage-config-panel';
import { ExecutionPanel } from '@/components/execution/execution-panel';
import { ExecutionHistory } from '@/components/execution/execution-history';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useStageConfig } from '@/hooks/use-stage-config';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import type { WizardStep } from '@/types/source-selection';

// Separate component for each stage to properly use hooks
function StageConfigPanelWrapper({ stageName }: { stageName: string }) {
  const { schema, isLoading } = useStageConfig(stageName);

  if (isLoading || !schema) {
    return <Skeleton className="h-32 w-full" />;
  }

  return <StageConfigPanel stageName={stageName} schema={schema} />;
}

function StageConfigPanels({ stageNames }: { stageNames: string[] }) {
  return (
    <div className="space-y-4">
      {stageNames.map((stageName) => (
        <StageConfigPanelWrapper key={stageName} stageName={stageName} />
      ))}
    </div>
  );
}

export default function ExecutionPage() {
  const { currentStep, setCurrentStep, goToNextStep, goToPreviousStep, getFilterSummary, mode } =
    useSourceSelectionStore();
  const { data, isLoading, error } = useStages();
  const { selectedPipeline, selectedStages, stages } = usePipelineStore();

  // Determine completed steps
  const completedSteps: WizardStep[] = [];
  if (currentStep !== 'source_selection') {
    completedSteps.push('source_selection');
  }
  if (currentStep === 'execution') {
    completedSteps.push('configuration');
  }

  // Get stages for selected pipeline
  const pipelineStages = selectedPipeline
    ? Object.values(stages).filter((s) => s.pipeline === selectedPipeline)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load stages</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Pipeline Execution</h1>
        <p className="text-muted-foreground">
          Select source videos, configure pipeline, and execute
        </p>
      </div>

      {/* Wizard Step Indicator */}
      <WizardStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      {/* Step 1: Source Selection */}
      {currentStep === 'source_selection' && (
        <WizardErrorBoundary stepName="Source Selection">
          <SourceSelectionPanel onContinue={goToNextStep} />
        </WizardErrorBoundary>
      )}

      {/* Step 2: Configuration */}
      {currentStep === 'configuration' && (
        <WizardErrorBoundary stepName="Configuration">
          <div className="space-y-6">
            {/* Back button with source summary */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={goToPreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Source Selection
              </Button>
              <span className="text-sm text-muted-foreground">
                {getFilterSummary()}
              </span>
            </div>

            <PipelineSelector pipelines={data.pipelines} />

            {selectedPipeline && <StageSelector stages={pipelineStages} />}

            {selectedStages.length > 0 && (
              <>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Stage Configuration</h2>
                  <p className="text-muted-foreground text-sm">
                    Configure each selected stage. Expand panels to modify settings.
                  </p>
                </div>
                <StageConfigPanels stageNames={selectedStages} />
              </>
            )}

            {selectedPipeline && selectedStages.length > 0 && (
              <div className="flex justify-end">
                <Button size="lg" onClick={goToNextStep}>
                  Continue to Execution
                </Button>
              </div>
            )}
          </div>
        </WizardErrorBoundary>
      )}

      {/* Step 3: Execution */}
      {currentStep === 'execution' && (
        <WizardErrorBoundary stepName="Execution">
          <div className="space-y-6">
            {/* Back button with config summary */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={goToPreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Configuration
              </Button>
              <div className="text-sm text-muted-foreground">
                {getFilterSummary()} • {selectedStages.length} stage(s) selected
              </div>
            </div>

            <ExecutionPanel />
            <ExecutionHistory />
          </div>
        </WizardErrorBoundary>
      )}
    </div>
  );
}
```

### Modify `src/hooks/use-pipeline-execution.ts`

Add source selection metadata to the execute function. Find the `execute` function and modify the API call:

> **Important**: Use `useSourceSelectionStore` as a React hook (not `.getState()`) to maintain proper React subscription model and ensure re-renders when source selection changes.

```typescript
// In the execute function, before calling the API:

import { useSourceSelectionStore } from '@/lib/store/source-selection-store';

// Inside the hook - subscribe to the selector function:
const getExecutionMetadata = useSourceSelectionStore(
  (state) => state.getExecutionMetadata
);

// In the execute function:
const execute = async () => {
  // ... existing validation code ...
  
  // Get source selection metadata
  const sourceMetadata = getExecutionMetadata();
  
  const response = await api.post('/pipelines/execute', {
    pipeline: selectedPipeline,
    stages: selectedStages,
    config: configs,
    metadata: {
      ...sourceMetadata, // Include filter info
      // ... any other metadata
    },
  });
  
  // ... rest of execution code ...
};
```

---

## Mock Data for Development

For development and testing when the backend is unavailable, create mock data:

### Create `src/lib/mock/source-selection-mock.ts`

```typescript
import type { 
  ChannelInfo, 
  FilterPreviewResponse, 
  SavedFilterSummary 
} from '@/types/source-selection';

export const mockChannels: ChannelInfo[] = [
  {
    id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    name: 'Google Developers',
    video_count: 2340,
    total_views: 158_000_000,
    avg_engagement: 3.2,
  },
  {
    id: 'UCVHFbqXqoYvEWM1Ddxl0QKg',
    name: 'Fireship',
    video_count: 890,
    total_views: 245_000_000,
    avg_engagement: 8.5,
  },
  {
    id: 'UC8butISFwT-Wl7EV0hUK0BQ',
    name: 'freeCodeCamp.org',
    video_count: 1560,
    total_views: 385_000_000,
    avg_engagement: 4.1,
  },
];

export const mockPreview: FilterPreviewResponse = {
  total_matching: 47,
  channels_included: 3,
  date_range: {
    earliest: '2024-01-15T00:00:00Z',
    latest: '2024-12-10T00:00:00Z',
  },
  sample_videos: [
    {
      id: 'abc123',
      title: 'Introduction to GraphRAG',
      channel_name: 'Google Developers',
      published_at: '2024-12-01T10:00:00Z',
      views: 125000,
      engagement_score: 4.2,
    },
    {
      id: 'def456',
      title: 'Building Knowledge Graphs',
      channel_name: 'Fireship',
      published_at: '2024-11-28T15:30:00Z',
      views: 89000,
      engagement_score: 6.1,
    },
  ],
  warnings: [],
};

export const mockSavedFilters: SavedFilterSummary[] = [
  {
    id: 'filter_001',
    name: 'High Engagement Tech',
    description: 'Videos with high engagement from top tech channels',
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-10T00:00:00Z',
    video_count: 47,
    use_count: 5,
  },
  {
    id: 'filter_002',
    name: 'Recent Python Tutorials',
    description: 'Python videos from the last 30 days',
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2024-12-08T00:00:00Z',
    video_count: 23,
    use_count: 2,
  },
];
```

### Using Mock Data

Add environment flag support in hooks to switch between real and mock data:

```typescript
// src/hooks/use-source-selection.ts - Add at the top of file

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// In your hooks, conditionally return mock data:
export function useSourceChannels(dbName: string) {
  return useQuery({
    queryKey: queryKeys.sourceSelection.channels(dbName),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return { channels: mockChannels };
      }
      return sourceSelectionApi.getChannels(dbName);
    },
    staleTime: SOURCE_SELECTION.CACHE_TIMES.CHANNELS,
  });
}
```

Add to `.env.local` for development:

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true
```

---

## Testing Checklist

### Manual Testing

#### Source Selection Panel
- [ ] Mode toggle switches between "all" and "filtered"
- [ ] Channel selector loads channels on page load
- [ ] Channel multi-select works
- [ ] Engagement sliders update filter
- [ ] "Requires Transcript" toggle works
- [ ] "Maximum Videos" limit input works
- [ ] Preview updates when filter changes (debounced)
- [ ] Preview shows correct statistics
- [ ] Preview shows sample videos
- [ ] Warnings appear for edge cases

#### Saved Filters
- [ ] Saved filters list loads
- [ ] Clicking a saved filter loads its definition
- [ ] "Save Filter" dialog opens and validates input
- [ ] Saving creates new filter and updates list
- [ ] Duplicate filter creates copy
- [ ] Delete filter removes from list
- [ ] Deleting selected filter clears selection

#### Wizard Navigation
- [ ] Step indicator shows correct state
- [ ] Clicking completed step navigates back
- [ ] "Continue" button disabled when invalid
- [ ] Back buttons work correctly
- [ ] Source summary persists through steps

#### Execution Integration
- [ ] Executing with "all" mode processes all videos
- [ ] Executing with saved filter uses filter_id
- [ ] Executing with ad-hoc filter sends filter_definition
- [ ] Pipeline status shows input filter info

---

## Implementation Checklist

- [ ] Create `src/types/source-selection.ts`
- [ ] Create `src/lib/api/source-selection.ts`
- [ ] Create `src/lib/store/source-selection-store.ts`
- [ ] Update `src/lib/query-keys.ts`
- [ ] Create `src/hooks/use-source-selection.ts`
- [ ] Create `src/components/execution/wizard-step-indicator.tsx`
- [ ] Create `src/components/execution/source-selection/` directory
- [ ] Create `channel-selector.tsx`
- [ ] Create `filter-preview.tsx`
- [ ] Create `saved-filters-list.tsx`
- [ ] Create `source-selection-panel.tsx`
- [ ] Modify `src/app/execution/page.tsx`
- [ ] Modify `src/hooks/use-pipeline-execution.ts`
- [ ] Test all functionality

---

## Changelog

### Version 1.1.0 (2024-12-11) - Review Updates
Based on `SOURCE_SELECTION_IMPLEMENTATION_REVIEW.md` feedback:

**Critical Fixes:**
- Added NPM dependencies: `sonner`, `lodash-es`, `@radix-ui/react-*` components
- Added `put` and `delete` methods to API client
- Added UI component creation instructions (shadcn)
- Implemented `createFilterCacheKey` for stable React Query cache keys
- Fixed duplicate `SourceSelectionState` definition - consolidated to types file
- Added proper persistence of `currentStep` in Zustand store

**Major Improvements:**
- Added `WizardErrorBoundary` component for graceful error handling
- Replaced native `confirm()` with `AlertDialog` for delete confirmation
- Added ARIA attributes to `WizardStepIndicator` for accessibility
- Fixed state access pattern in `use-pipeline-execution.ts` (use hook instead of `.getState()`)
- Removed duplicate loading states (rely on React Query)
- Added `onError` callback for network error toast notifications
- Added `SOURCE_SELECTION` constants file for magic numbers

**Minor Fixes:**
- Changed `max-w-5xl` to `max-w-4xl` for consistency
- Renamed hooks to follow `useSource*` prefix pattern
- Updated `getDbName` to use environment variable
- Added `SourceSelectionErrorResponse` type
- Added "Mock Data" section for development testing

### Version 1.0.0 (2024-12-11)
- Initial implementation guide
- Complete wizard UI with 3 steps
- Full filter builder with channels, engagement, content filters
- Saved filters CRUD
- Live preview with statistics
- Integration with pipeline execution

---

**Document Owner**: System Architect  
**Last Updated**: December 11, 2024  
**Reference**: `SOURCE_SELECTION_TECHNICAL_STUDY.md`, `SOURCE_SELECTION_IMPLEMENTATION_REVIEW.md`

