# Custom Hooks Analysis & Reference Guide

**Version:** 1.0  
**Created:** December 9, 2025  
**Scope:** Custom React Hooks Implementation  
**Location:** `src/hooks/`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Hook Inventory](#2-hook-inventory)
3. [useStages Hook - Detailed Analysis](#3-usestages-hook---detailed-analysis)
4. [useStageConfig Hook - Detailed Analysis](#4-usestageconfig-hook---detailed-analysis)
5. [usePipelineExecution Hook - Detailed Analysis](#5-usepipelineexecution-hook---detailed-analysis)
6. [Hook Relationships & Data Flow](#6-hook-relationships--data-flow)
7. [TanStack Query Integration](#7-tanstack-query-integration)
8. [Usage Patterns](#8-usage-patterns)
9. [Debugging Guide](#9-debugging-guide)
10. [Known Limitations & Improvements](#10-known-limitations--improvements)
11. [API Reference](#11-api-reference)

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^19.0.0 | Core hooks API (useCallback, useEffect, useRef) |
| **TanStack Query** | ^5.0.0 | Server state management, caching |
| **Zustand** | ^5.0.0 | Client state management integration |

### 1.2 Design Principles

1. **Separation of Concerns**: Each hook handles a specific data domain
   - `useStages`: Initial data loading
   - `useStageConfig`: Per-stage configuration fetching
   - `usePipelineExecution`: Execution lifecycle management

2. **Server State vs Client State**: 
   - TanStack Query handles server state (API data, caching)
   - Zustand stores handle client state (selections, UI state)
   - Hooks bridge the gap between them

3. **Declarative Data Fetching**: Hooks automatically fetch when enabled

4. **Side Effect Isolation**: Effects sync server state to client stores

### 1.3 Hook Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CUSTOM HOOKS LAYER                             │
├───────────────────┬─────────────────────┬───────────────────────────────┤
│    useStages      │   useStageConfig    │    usePipelineExecution       │
│                   │                     │                               │
│  ┌─────────────┐  │  ┌─────────────┐    │  ┌───────────────────────┐   │
│  │ TanStack    │  │  │ TanStack    │    │  │ Manual API calls      │   │
│  │ Query       │  │  │ Query (x2)  │    │  │ with useCallback      │   │
│  └──────┬──────┘  │  └──────┬──────┘    │  └───────────┬───────────┘   │
│         │         │         │           │              │               │
│         ▼         │         ▼           │              ▼               │
│  ┌─────────────┐  │  ┌─────────────┐    │  ┌───────────────────────┐   │
│  │ useEffect   │  │  │ useEffect   │    │  │ Polling via           │   │
│  │ Sync to     │  │  │ Sync to     │    │  │ setInterval + useRef  │   │
│  │ Store       │  │  │ Store       │    │  └───────────────────────┘   │
│  └─────────────┘  │  └─────────────┘    │                               │
├───────────────────┼─────────────────────┼───────────────────────────────┤
│  Pipeline Store   │   Config Store      │   Execution Store             │
│  (Zustand)        │   (Zustand)         │   (Zustand)                   │
└───────────────────┴─────────────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                      │
│                    (stagesApi, pipelinesApi)                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.4 File Structure

```
src/hooks/
├── use-stages.ts              # 25 lines - Initial data loading
├── use-stage-config.ts        # 41 lines - Per-stage config fetching
└── use-pipeline-execution.ts  # 113 lines - Execution lifecycle
```

---

## 2. Hook Inventory

### 2.1 Quick Reference Table

| Hook | File | Lines | Queries | Callbacks | Effects | Store Dependencies |
|------|------|-------|---------|-----------|---------|-------------------|
| `useStages` | `use-stages.ts` | 25 | 1 | 0 | 1 | Pipeline |
| `useStageConfig` | `use-stage-config.ts` | 41 | 2 | 0 | 2 | Config |
| `usePipelineExecution` | `use-pipeline-execution.ts` | 113 | 0 | 4 | 1 | All 3 |
| **Total** | - | **179** | **3** | **4** | **4** | - |

### 2.2 Dependencies Map

```typescript
// use-stages.ts
import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/api/stages';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useEffect } from 'react';

// use-stage-config.ts
import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/api/stages';
import { useConfigStore } from '@/lib/store/config-store';
import { useEffect } from 'react';

// use-pipeline-execution.ts
import { useCallback, useEffect, useRef } from 'react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useExecutionStore } from '@/lib/store/execution-store';
import { pipelinesApi } from '@/lib/api/pipelines';
```

### 2.3 Return Value Comparison

| Hook | Returns | Type |
|------|---------|------|
| `useStages` | TanStack Query result | `UseQueryResult<StagesResponse>` |
| `useStageConfig` | Custom object | `{ schema, defaults, isLoading, error }` |
| `usePipelineExecution` | Action methods | `{ validate, execute, cancel }` |

---

## 3. useStages Hook - Detailed Analysis

### 3.1 Purpose

Fetches initial pipeline and stage data on application load. Acts as the entry point for populating the Pipeline Store.

### 3.2 Source Code

```typescript
import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/api/stages';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useEffect } from 'react';

export function useStages() {
  const { setPipelines, setStages } = usePipelineStore();

  const query = useQuery({
    queryKey: ['stages'],
    queryFn: stagesApi.listStages,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (query.data) {
      setPipelines(query.data.pipelines);
      setStages(query.data.stages);
    }
  }, [query.data, setPipelines, setStages]);

  return query;
}
```

### 3.3 Component Breakdown

#### TanStack Query Configuration

```typescript
const query = useQuery({
  queryKey: ['stages'],           // Cache key for this query
  queryFn: stagesApi.listStages,  // API function to call
  staleTime: 5 * 60 * 1000,       // Data fresh for 5 minutes
});
```

| Property | Value | Purpose |
|----------|-------|---------|
| `queryKey` | `['stages']` | Unique identifier for caching |
| `queryFn` | `stagesApi.listStages` | Async function that fetches data |
| `staleTime` | `300000` (5 min) | Time before data is considered stale |

#### Store Synchronization Effect

```typescript
useEffect(() => {
  if (query.data) {
    setPipelines(query.data.pipelines);  // Sync to Pipeline Store
    setStages(query.data.stages);        // Sync to Pipeline Store
  }
}, [query.data, setPipelines, setStages]);
```

**Effect Dependencies:**
- `query.data` - Triggers when API data arrives
- `setPipelines` - Store action (stable reference)
- `setStages` - Store action (stable reference)

### 3.4 Data Flow Diagram

```
┌─────────────────┐
│  Component      │
│  calls          │
│  useStages()    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  TanStack Query                         │
│  queryKey: ['stages']                   │
│  queryFn: stagesApi.listStages          │
└────────┬────────────────────────────────┘
         │
         │  Check cache first
         ▼
┌─────────────────────────────────────────┐
│  Cache Hit?                             │
│  ├── YES → Return cached data           │
│  └── NO  → Fetch from API               │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  API: GET /stages                       │
│  Response: { pipelines, stages }        │
└────────┬────────────────────────────────┘
         │
         │  query.data updates
         ▼
┌─────────────────────────────────────────┐
│  useEffect triggers                     │
│  setPipelines(data.pipelines)           │
│  setStages(data.stages)                 │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Pipeline Store Updated                 │
│  Components re-render                   │
└─────────────────────────────────────────┘
```

### 3.5 Return Value

The hook returns the full TanStack Query result:

```typescript
interface UseQueryResult<StagesResponse> {
  data: StagesResponse | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  refetch: () => Promise<...>;
  // ... other TanStack Query properties
}
```

### 3.6 Usage Example

```typescript
// In page.tsx
const { data, isLoading, error } = useStages();

if (isLoading) return <Skeleton />;
if (error) return <ErrorAlert error={error} />;
if (!data) return null;

// data.pipelines and data.stages are now available
// AND synced to Pipeline Store
```

---

## 4. useStageConfig Hook - Detailed Analysis

### 4.1 Purpose

Fetches configuration schema and default values for a specific stage. Called once per selected stage to populate the Config Store.

### 4.2 Source Code

```typescript
import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/api/stages';
import { useConfigStore } from '@/lib/store/config-store';
import { useEffect } from 'react';

export function useStageConfig(stageName: string) {
  const { setSchema, setDefaults } = useConfigStore();

  const schemaQuery = useQuery({
    queryKey: ['stage-config', stageName],
    queryFn: () => stagesApi.getStageConfig(stageName),
    enabled: !!stageName,
  });

  const defaultsQuery = useQuery({
    queryKey: ['stage-defaults', stageName],
    queryFn: () => stagesApi.getStageDefaults(stageName),
    enabled: !!stageName,
  });

  useEffect(() => {
    if (schemaQuery.data) {
      setSchema(stageName, schemaQuery.data);
    }
  }, [schemaQuery.data, stageName, setSchema]);

  useEffect(() => {
    if (defaultsQuery.data) {
      setDefaults(stageName, defaultsQuery.data);
    }
  }, [defaultsQuery.data, stageName, setDefaults]);

  return {
    schema: schemaQuery.data,
    defaults: defaultsQuery.data,
    isLoading: schemaQuery.isLoading || defaultsQuery.isLoading,
    error: schemaQuery.error || defaultsQuery.error,
  };
}
```

### 4.3 Component Breakdown

#### Dual Query Pattern

This hook uses **two parallel queries**:

```typescript
// Query 1: Schema (field definitions)
const schemaQuery = useQuery({
  queryKey: ['stage-config', stageName],    // Unique per stage
  queryFn: () => stagesApi.getStageConfig(stageName),
  enabled: !!stageName,                      // Only fetch if stageName exists
});

// Query 2: Defaults (default values)
const defaultsQuery = useQuery({
  queryKey: ['stage-defaults', stageName],  // Unique per stage
  queryFn: () => stagesApi.getStageDefaults(stageName),
  enabled: !!stageName,
});
```

| Query | Key | API Endpoint | Purpose |
|-------|-----|--------------|---------|
| Schema | `['stage-config', stageName]` | `GET /stages/{name}/config` | Field definitions, types, UI hints |
| Defaults | `['stage-defaults', stageName]` | `GET /stages/{name}/defaults` | Default values for each field |

#### Conditional Fetching

```typescript
enabled: !!stageName  // Boolean coercion
```

**Behavior:**
- If `stageName` is `""`, `null`, or `undefined` → Query disabled
- If `stageName` is `"graph_extraction"` → Query enabled, fetches data

#### Dual Store Synchronization

```typescript
// Effect 1: Sync schema to store
useEffect(() => {
  if (schemaQuery.data) {
    setSchema(stageName, schemaQuery.data);
  }
}, [schemaQuery.data, stageName, setSchema]);

// Effect 2: Sync defaults to store (also initializes config)
useEffect(() => {
  if (defaultsQuery.data) {
    setDefaults(stageName, defaultsQuery.data);  // This also initializes configs[stageName]
  }
}, [defaultsQuery.data, stageName, setDefaults]);
```

### 4.4 Data Flow Diagram

```
┌─────────────────────────────────────────┐
│  useStageConfig("graph_extraction")     │
└────────┬────────────────────────────────┘
         │
         │  enabled: true (stageName exists)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL QUERIES                                           │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ schemaQuery             │  │ defaultsQuery           │  │
│  │ key: ['stage-config',   │  │ key: ['stage-defaults', │  │
│  │       'graph_extraction']│  │       'graph_extraction']│  │
│  └───────────┬─────────────┘  └───────────┬─────────────┘  │
│              │                            │                 │
└──────────────┼────────────────────────────┼─────────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ GET /stages/            │  │ GET /stages/            │
│ graph_extraction/config │  │ graph_extraction/defaults│
└───────────┬─────────────┘  └───────────┬─────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ useEffect #1            │  │ useEffect #2            │
│ setSchema(name, data)   │  │ setDefaults(name, data) │
└───────────┬─────────────┘  └───────────┬─────────────┘
            │                            │
            └────────────┬───────────────┘
                         ▼
┌─────────────────────────────────────────┐
│  Config Store Updated                   │
│  - schemas[stageName] = schema          │
│  - defaults[stageName] = defaults       │
│  - configs[stageName] = {...defaults}   │
└─────────────────────────────────────────┘
```

### 4.5 Return Value

Custom aggregated object (not raw TanStack Query result):

```typescript
interface UseStageConfigResult {
  schema: StageConfigSchema | undefined;  // Field definitions
  defaults: Record<string, unknown> | undefined;  // Default values
  isLoading: boolean;  // Either query loading
  error: Error | null;  // First error from either query
}
```

**Loading Logic:**
```typescript
isLoading: schemaQuery.isLoading || defaultsQuery.isLoading
// True if EITHER query is still loading
```

**Error Logic:**
```typescript
error: schemaQuery.error || defaultsQuery.error
// Returns first non-null error
```

### 4.6 Usage Pattern

```typescript
// Called inside a component that renders for each selected stage
function StageConfigPanels({ stageNames }: { stageNames: string[] }) {
  return (
    <div>
      {stageNames.map((stageName) => {
        // Hook called per stage - each gets its own cached query
        useStageConfig(stageName);
        
        const schema = useConfigStore((s) => s.schemas[stageName]);
        
        if (!schema) return <Skeleton key={stageName} />;
        
        return (
          <StageConfigPanel
            key={stageName}
            stageName={stageName}
            schema={schema}
          />
        );
      })}
    </div>
  );
}
```

### 4.7 Cache Behavior

Each stage has its own cache entry:

```
Cache State Example:
┌─────────────────────────────────────────────────────────┐
│  TanStack Query Cache                                   │
├─────────────────────────────────────────────────────────┤
│  ['stage-config', 'graph_extraction']    → SchemaData   │
│  ['stage-config', 'entity_resolution']   → SchemaData   │
│  ['stage-defaults', 'graph_extraction']  → DefaultsData │
│  ['stage-defaults', 'entity_resolution'] → DefaultsData │
└─────────────────────────────────────────────────────────┘
```

---

## 5. usePipelineExecution Hook - Detailed Analysis

### 5.1 Purpose

Manages the entire execution lifecycle: validation, execution, status polling, and cancellation. This is the most complex hook, coordinating all three Zustand stores.

### 5.2 Source Code Structure

```typescript
export function usePipelineExecution() {
  // 1. Store subscriptions (lines 8-17)
  // 2. Polling ref (line 19)
  // 3. Cleanup effect (lines 21-28)
  // 4. validate callback (lines 30-46)
  // 5. startPolling callback (lines 48-70)
  // 6. execute callback (lines 72-96)
  // 7. cancel callback (lines 98-108)
  // 8. Return (line 110)
}
```

### 5.3 Component Breakdown

#### Store Subscriptions

```typescript
const { selectedPipeline, selectedStages } = usePipelineStore();
const { configs } = useConfigStore();
const {
  setValidationResult,
  setValidationLoading,
  setPipelineId,
  setPipelineStatus,
  setExecutionLoading,
  addError,
} = useExecutionStore();
```

**Cross-Store Access:**
| Store | Read | Write |
|-------|------|-------|
| Pipeline | `selectedPipeline`, `selectedStages` | - |
| Config | `configs` | - |
| Execution | - | All setters |

#### Polling Reference

```typescript
const pollingRef = useRef<NodeJS.Timeout | null>(null);
```

**Why useRef?**
- Persists across re-renders without causing re-renders
- Allows cleanup of interval in unmount effect
- Mutable container for interval ID

#### Cleanup Effect

```typescript
useEffect(() => {
  return () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };
}, []);  // Empty deps = runs cleanup only on unmount
```

**Critical for:**
- Preventing memory leaks
- Stopping polling when component unmounts
- Avoiding orphaned intervals

### 5.4 Action: validate()

```typescript
const validate = useCallback(async () => {
  if (!selectedPipeline) return;  // Guard clause

  setValidationLoading(true);
  try {
    const result = await pipelinesApi.validate(
      selectedPipeline,
      selectedStages,
      configs
    );
    setValidationResult(result);
  } catch (error) {
    addError(error instanceof Error ? error.message : 'Validation failed');
  } finally {
    setValidationLoading(false);
  }
}, [selectedPipeline, selectedStages, configs, setValidationLoading, setValidationResult, addError]);
```

**Flow Diagram:**
```
validate() called
       │
       ▼
┌─────────────────────┐
│ selectedPipeline    │──── null? ────► return (exit)
│ exists?             │
└────────┬────────────┘
         │ yes
         ▼
┌─────────────────────┐
│ setValidationLoading│
│ (true)              │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ API: POST /pipelines/validate       │
│ Body: { pipeline, stages, config }  │
└────────┬───────────────┬────────────┘
         │               │
    success           error
         │               │
         ▼               ▼
┌─────────────────┐ ┌─────────────────┐
│setValidationResult│ │addError(message)│
│(result)          │ │                 │
└────────┬─────────┘ └────────┬────────┘
         │                    │
         └────────┬───────────┘
                  │
                  ▼
         ┌─────────────────────┐
         │ setValidationLoading│
         │ (false) - finally   │
         └─────────────────────┘
```

**Dependencies Array:**
```typescript
[selectedPipeline, selectedStages, configs, setValidationLoading, setValidationResult, addError]
```

### 5.5 Action: startPolling(pipelineId)

```typescript
const startPolling = useCallback((pipelineId: string) => {
  // Clear existing polling
  if (pollingRef.current) {
    clearInterval(pollingRef.current);
  }

  pollingRef.current = setInterval(async () => {
    try {
      const status = await pipelinesApi.getStatus(pipelineId);
      setPipelineStatus(status);

      // Stop polling if finished
      if (['completed', 'failed', 'error', 'cancelled'].includes(status.status)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  }, 2000);
}, [setPipelineStatus]);
```

**Polling State Machine:**
```
startPolling(id)
       │
       ▼
┌─────────────────────────┐
│ Clear existing interval │
│ if any                  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│              POLLING LOOP (every 2s)            │
│  ┌─────────────────────────────────────────┐   │
│  │ GET /pipelines/{id}/status              │   │
│  └──────────────────┬──────────────────────┘   │
│                     │                          │
│                     ▼                          │
│  ┌─────────────────────────────────────────┐   │
│  │ setPipelineStatus(status)               │   │
│  └──────────────────┬──────────────────────┘   │
│                     │                          │
│                     ▼                          │
│  ┌─────────────────────────────────────────┐   │
│  │ status.status in terminal states?       │   │
│  │ [completed, failed, error, cancelled]   │   │
│  └──────────┬─────────────┬────────────────┘   │
│             │             │                    │
│           YES            NO                    │
│             │             │                    │
│             ▼             └──── Continue loop  │
│  ┌─────────────────────┐                       │
│  │ clearInterval()     │                       │
│  │ pollingRef = null   │                       │
│  └─────────────────────┘                       │
└────────────────────────────────────────────────┘
```

**Terminal States:**
| Status | Meaning | Stops Polling? |
|--------|---------|----------------|
| `starting` | Pipeline initializing | No |
| `running` | Pipeline executing | No |
| `completed` | Success | **Yes** |
| `failed` | Stage failed | **Yes** |
| `error` | System error | **Yes** |
| `cancelled` | User cancelled | **Yes** |

### 5.6 Action: execute()

```typescript
const execute = useCallback(async () => {
  if (!selectedPipeline) return;

  setExecutionLoading(true);
  try {
    const result = await pipelinesApi.execute(
      selectedPipeline,
      selectedStages,
      configs,
      { experiment_id: `exp_${Date.now()}` }
    );

    if (result.error) {
      addError(result.error);
      return;
    }

    setPipelineId(result.pipeline_id);
    startPolling(result.pipeline_id);
  } catch (error) {
    addError(error instanceof Error ? error.message : 'Execution failed');
  } finally {
    setExecutionLoading(false);
  }
}, [selectedPipeline, selectedStages, configs, setExecutionLoading, setPipelineId, startPolling, addError]);
```

**Flow Diagram:**
```
execute() called
       │
       ▼
┌─────────────────────┐
│ selectedPipeline    │──── null? ────► return
│ exists?             │
└────────┬────────────┘
         │ yes
         ▼
┌─────────────────────┐
│ setExecutionLoading │
│ (true)              │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ API: POST /pipelines/execute            │
│ Body: { pipeline, stages, config,       │
│         metadata: { experiment_id } }   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Response has error?                     │
│  ├── YES → addError(result.error)       │
│  │         return                       │
│  │                                      │
│  └── NO  → setPipelineId(id)            │
│            startPolling(id)             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│ setExecutionLoading │
│ (false) - finally   │
└─────────────────────┘
```

**Experiment ID Generation:**
```typescript
{ experiment_id: `exp_${Date.now()}` }
// Example: "exp_1702123456789"
```

### 5.7 Action: cancel()

```typescript
const cancel = useCallback(async () => {
  const pipelineId = useExecutionStore.getState().currentPipelineId;
  if (!pipelineId) return;

  try {
    await pipelinesApi.cancel(pipelineId);
    // Polling will pick up the cancelled status
  } catch (error) {
    addError(error instanceof Error ? error.message : 'Cancel failed');
  }
}, [addError]);
```

**Key Pattern - Direct Store Access:**
```typescript
const pipelineId = useExecutionStore.getState().currentPipelineId;
```

**Why `getState()` instead of hook subscription?**
- `cancel` doesn't need to re-render when `currentPipelineId` changes
- Only needs current value at call time
- Reduces unnecessary re-renders
- Keeps dependencies array minimal

### 5.8 Return Value

```typescript
return { validate, execute, cancel };
```

**Interface:**
```typescript
interface UsePipelineExecutionResult {
  validate: () => Promise<void>;
  execute: () => Promise<void>;
  cancel: () => Promise<void>;
}
```

---

## 6. Hook Relationships & Data Flow

### 6.1 Hook Dependency Graph

```
┌─────────────────┐
│    useStages    │ ← Called once on page load
└────────┬────────┘
         │ Populates Pipeline Store
         ▼
┌─────────────────┐
│  Page renders   │
│  StageSelector  │
└────────┬────────┘
         │ User selects stages
         ▼
┌─────────────────────┐
│  useStageConfig     │ ← Called once per selected stage
│  (per stage)        │
└────────┬────────────┘
         │ Populates Config Store
         ▼
┌─────────────────────┐
│  User configures    │
│  fields             │
└────────┬────────────┘
         │ Config Store updated
         ▼
┌─────────────────────────┐
│  usePipelineExecution   │ ← Called for validate/execute
│  (validate, execute)    │
└─────────────────────────┘
```

### 6.2 Store Usage by Hook

| Hook | Pipeline Store | Config Store | Execution Store |
|------|----------------|--------------|-----------------|
| `useStages` | **Write** | - | - |
| `useStageConfig` | - | **Write** | - |
| `usePipelineExecution` | **Read** | **Read** | **Write** |

### 6.3 Complete Application Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LIFECYCLE                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. PAGE LOAD                                                         │
│     └── useStages() fetches /stages                                   │
│         └── Populates: Pipeline Store (pipelines, stages)             │
│                                                                       │
│  2. USER SELECTS PIPELINE                                             │
│     └── usePipelineStore.selectPipeline('graphrag')                   │
│         └── Clears selectedStages                                     │
│                                                                       │
│  3. USER SELECTS STAGES                                               │
│     └── usePipelineStore.toggleStage('graph_extraction')              │
│         └── Auto-adds dependencies                                    │
│                                                                       │
│  4. FOR EACH SELECTED STAGE                                           │
│     └── useStageConfig(stageName) fetches schema & defaults           │
│         └── Populates: Config Store (schemas, defaults, configs)      │
│                                                                       │
│  5. USER MODIFIES CONFIG                                              │
│     └── useConfigStore.setFieldValue(stage, field, value)             │
│         └── Updates: configs[stage][field]                            │
│                                                                       │
│  6. USER CLICKS VALIDATE                                              │
│     └── usePipelineExecution.validate()                               │
│         ├── Reads: selectedPipeline, selectedStages, configs          │
│         ├── Calls: POST /pipelines/validate                           │
│         └── Writes: Execution Store (validationResult)                │
│                                                                       │
│  7. USER CLICKS EXECUTE                                               │
│     └── usePipelineExecution.execute()                                │
│         ├── Reads: selectedPipeline, selectedStages, configs          │
│         ├── Calls: POST /pipelines/execute                            │
│         ├── Writes: Execution Store (currentPipelineId)               │
│         └── Starts: Status polling (every 2s)                         │
│                                                                       │
│  8. POLLING UPDATES                                                   │
│     └── startPolling() interval                                       │
│         ├── Calls: GET /pipelines/{id}/status                         │
│         ├── Writes: Execution Store (pipelineStatus)                  │
│         └── Stops: When status is terminal                            │
│                                                                       │
│  9. USER CLICKS CANCEL (optional)                                     │
│     └── usePipelineExecution.cancel()                                 │
│         └── Calls: POST /pipelines/{id}/cancel                        │
│             └── Polling picks up 'cancelled' status                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. TanStack Query Integration

### 7.1 Query Configuration Overview

| Hook | Query Key | Stale Time | Enabled |
|------|-----------|------------|---------|
| `useStages` | `['stages']` | 5 minutes | Always |
| `useStageConfig` | `['stage-config', stageName]` | Default | `!!stageName` |
| `useStageConfig` | `['stage-defaults', stageName]` | Default | `!!stageName` |

### 7.2 Cache Key Strategy

```
Query Key Structure:
['resource-type']              → Global resource
['resource-type', identifier]  → Specific resource

Examples:
['stages']                     → All stages (global)
['stage-config', 'graph_extraction']  → Schema for specific stage
['stage-defaults', 'entity_resolution'] → Defaults for specific stage
```

### 7.3 Cache Invalidation

Currently, caches are **not manually invalidated**. They expire based on `staleTime` or `gcTime`.

**To manually invalidate:**
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate specific stage config
queryClient.invalidateQueries({ queryKey: ['stage-config', 'graph_extraction'] });

// Invalidate all stage configs
queryClient.invalidateQueries({ queryKey: ['stage-config'] });

// Invalidate everything
queryClient.invalidateQueries();
```

### 7.4 Query States

TanStack Query provides these states:

| State | Meaning | UI Action |
|-------|---------|-----------|
| `isLoading` | First fetch, no cached data | Show skeleton |
| `isFetching` | Fetching (may have cached data) | Show spinner |
| `isSuccess` | Data available | Render content |
| `isError` | Fetch failed | Show error |
| `isStale` | Data older than staleTime | Background refetch |

---

## 8. Usage Patterns

### 8.1 Basic Hook Usage

```typescript
// Page component
function PipelinePage() {
  const { data, isLoading, error } = useStages();
  const { validate, execute, cancel } = usePipelineExecution();

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return (
    <div>
      <PipelineSelector pipelines={data.pipelines} />
      <Button onClick={validate}>Validate</Button>
      <Button onClick={execute}>Execute</Button>
    </div>
  );
}
```

### 8.2 Conditional Rendering with Config

```typescript
function StageConfigSection({ stageNames }: { stageNames: string[] }) {
  return (
    <>
      {stageNames.map((name) => (
        <StageConfigLoader key={name} stageName={name} />
      ))}
    </>
  );
}

function StageConfigLoader({ stageName }: { stageName: string }) {
  const { isLoading, error } = useStageConfig(stageName);
  const schema = useConfigStore((s) => s.schemas[stageName]);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!schema) return null;

  return <StageConfigPanel stageName={stageName} schema={schema} />;
}
```

### 8.3 Error Handling Pattern

```typescript
function ExecutionControls() {
  const { validate, execute } = usePipelineExecution();
  const errors = useExecutionStore((s) => s.errors);
  const clearErrors = useExecutionStore((s) => s.clearErrors);

  const handleValidate = async () => {
    clearErrors();  // Clear previous errors
    await validate();
  };

  return (
    <div>
      <Button onClick={handleValidate}>Validate</Button>
      {errors.length > 0 && (
        <ErrorList errors={errors} onDismiss={clearErrors} />
      )}
    </div>
  );
}
```

### 8.4 Loading State Composition

```typescript
function ExecutionPanel() {
  const validationLoading = useExecutionStore((s) => s.validationLoading);
  const executionLoading = useExecutionStore((s) => s.executionLoading);
  
  const isAnyLoading = validationLoading || executionLoading;
  
  return (
    <div className={isAnyLoading ? 'opacity-50' : ''}>
      {/* ... */}
    </div>
  );
}
```

---

## 9. Debugging Guide

### 9.1 React Query DevTools

Install React Query DevTools for visual debugging:

```typescript
// In providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**DevTools Features:**
- View all cached queries
- See query status (fresh, stale, fetching)
- Manually trigger refetch
- View query data

### 9.2 Common Issues & Solutions

#### Issue: useStageConfig not fetching

**Symptoms:**
- Schema/defaults never load
- `isLoading` always true

**Debug Steps:**
1. Check if `stageName` is truthy:
```typescript
console.log('stageName:', stageName, '!!stageName:', !!stageName);
```

2. Check React Query DevTools for query status

3. Verify API endpoint is correct:
```typescript
// In browser console
fetch('/api/v1/stages/graph_extraction/config').then(r => r.json()).then(console.log);
```

#### Issue: Polling doesn't stop

**Symptoms:**
- Network requests continue after completion
- Memory usage increases

**Debug Steps:**
1. Log status in polling callback:
```typescript
pollingRef.current = setInterval(async () => {
  const status = await pipelinesApi.getStatus(pipelineId);
  console.log('Polling status:', status.status);
  // ...
}, 2000);
```

2. Check if status matches terminal states:
```typescript
const terminalStates = ['completed', 'failed', 'error', 'cancelled'];
console.log('Is terminal:', terminalStates.includes(status.status));
```

#### Issue: Stale data after mutation

**Symptoms:**
- Old data shows after changes
- Need to refresh to see updates

**Solution:**
Invalidate queries after mutations:
```typescript
const queryClient = useQueryClient();

const handleSomeAction = async () => {
  await someApiCall();
  queryClient.invalidateQueries({ queryKey: ['stages'] });
};
```

### 9.3 Debug Logging Helpers

```typescript
// Add to hooks for debugging

// In useStages
export function useStages() {
  const query = useQuery({...});
  
  useEffect(() => {
    console.log('[useStages] Query state:', {
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      data: query.data,
    });
  }, [query.isLoading, query.isSuccess, query.data]);
  
  // ...
}

// In usePipelineExecution
const validate = useCallback(async () => {
  console.log('[validate] Called with:', {
    selectedPipeline,
    selectedStages,
    configsKeys: Object.keys(configs),
  });
  // ...
}, [...]);
```

### 9.4 Network Request Tracing

```typescript
// In API client
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  console.log(`[API] ${options?.method || 'GET'} ${endpoint}`);
  const start = performance.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {...});
    const data = await response.json();
    console.log(`[API] Response (${Math.round(performance.now() - start)}ms):`, data);
    return data;
  } catch (error) {
    console.error(`[API] Error:`, error);
    throw error;
  }
}
```

---

## 10. Known Limitations & Improvements

### 10.1 Current Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No retry on polling error | Polling continues with console.error | Add retry logic |
| No exponential backoff | Fixed 2s polling interval | Implement backoff |
| No prefetching | Each stage config fetches on demand | Prefetch on hover |
| No optimistic updates | UI waits for server response | Add optimistic logic |
| No offline support | Requires network connection | Add offline detection |

### 10.2 Suggested Improvements

#### 1. Add Retry Logic to Polling

```typescript
const startPolling = useCallback((pipelineId: string) => {
  let errorCount = 0;
  const MAX_ERRORS = 3;

  pollingRef.current = setInterval(async () => {
    try {
      const status = await pipelinesApi.getStatus(pipelineId);
      errorCount = 0;  // Reset on success
      setPipelineStatus(status);
      // ...
    } catch (error) {
      errorCount++;
      console.error(`Polling error (${errorCount}/${MAX_ERRORS}):`, error);
      
      if (errorCount >= MAX_ERRORS) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        addError('Lost connection to pipeline status');
      }
    }
  }, 2000);
}, [setPipelineStatus, addError]);
```

#### 2. Add Exponential Backoff

```typescript
const startPolling = useCallback((pipelineId: string) => {
  let interval = 2000;
  const MAX_INTERVAL = 30000;

  const poll = async () => {
    try {
      const status = await pipelinesApi.getStatus(pipelineId);
      setPipelineStatus(status);

      if (['completed', 'failed', 'error', 'cancelled'].includes(status.status)) {
        return;  // Stop
      }

      // Schedule next poll
      pollingRef.current = setTimeout(poll, interval);
      
      // Increase interval for long-running pipelines
      interval = Math.min(interval * 1.5, MAX_INTERVAL);
    } catch (error) {
      // ...
    }
  };

  poll();
}, [setPipelineStatus]);
```

#### 3. Add Prefetching

```typescript
// In component
const queryClient = useQueryClient();

const handleStageHover = (stageName: string) => {
  // Prefetch on hover
  queryClient.prefetchQuery({
    queryKey: ['stage-config', stageName],
    queryFn: () => stagesApi.getStageConfig(stageName),
  });
  queryClient.prefetchQuery({
    queryKey: ['stage-defaults', stageName],
    queryFn: () => stagesApi.getStageDefaults(stageName),
  });
};
```

#### 4. Add Client-Side Validation

```typescript
// Enhanced validate in usePipelineExecution
const validate = useCallback(async () => {
  if (!selectedPipeline) return;

  // Client-side validation first
  const clientErrors = validateConfigs(configs, schemas);
  if (Object.keys(clientErrors).length > 0) {
    setValidationResult({
      valid: false,
      errors: clientErrors,
      warnings: [],
    });
    return;  // Don't call server
  }

  // Server validation
  setValidationLoading(true);
  // ...
}, [...]);
```

#### 5. Add Abort Controller for Cleanup

```typescript
export function useStages() {
  const query = useQuery({
    queryKey: ['stages'],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${BASE_URL}/stages`, { signal });
      return response.json();
    },
  });
  // ...
}
```

---

## 11. API Reference

### 11.1 useStages API

```typescript
// Import
import { useStages } from '@/hooks/use-stages';

// Signature
function useStages(): UseQueryResult<StagesResponse>;

// Usage
const { data, isLoading, isError, error, refetch } = useStages();

// Return Type (TanStack Query)
interface UseQueryResult<StagesResponse> {
  data: StagesResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult>;
  // ... other TanStack Query properties
}

// Data Type
interface StagesResponse {
  pipelines: Record<string, Pipeline>;
  stages: Record<string, Stage>;
}
```

### 11.2 useStageConfig API

```typescript
// Import
import { useStageConfig } from '@/hooks/use-stage-config';

// Signature
function useStageConfig(stageName: string): UseStageConfigResult;

// Usage
const { schema, defaults, isLoading, error } = useStageConfig('graph_extraction');

// Return Type
interface UseStageConfigResult {
  schema: StageConfigSchema | undefined;
  defaults: Record<string, unknown> | undefined;
  isLoading: boolean;
  error: Error | null;
}

// Conditionally enabled
// - enabled: !!stageName
// - If stageName is empty string, null, or undefined, queries won't run
```

### 11.3 usePipelineExecution API

```typescript
// Import
import { usePipelineExecution } from '@/hooks/use-pipeline-execution';

// Signature
function usePipelineExecution(): UsePipelineExecutionResult;

// Usage
const { validate, execute, cancel } = usePipelineExecution();

// Return Type
interface UsePipelineExecutionResult {
  validate: () => Promise<void>;
  execute: () => Promise<void>;
  cancel: () => Promise<void>;
}

// Action Details

// validate()
// - Reads: selectedPipeline, selectedStages, configs (from stores)
// - Writes: validationResult, validationLoading (to Execution Store)
// - API: POST /pipelines/validate

// execute()
// - Reads: selectedPipeline, selectedStages, configs (from stores)
// - Writes: currentPipelineId, pipelineStatus, executionLoading (to Execution Store)
// - API: POST /pipelines/execute, then GET /pipelines/{id}/status (polling)

// cancel()
// - Reads: currentPipelineId (from Execution Store via getState())
// - API: POST /pipelines/{id}/cancel
// - Note: Polling will pick up 'cancelled' status
```

### 11.4 API Endpoints Used

| Hook | Method | Endpoint | When |
|------|--------|----------|------|
| `useStages` | GET | `/stages` | Page load |
| `useStageConfig` | GET | `/stages/{name}/config` | Stage selected |
| `useStageConfig` | GET | `/stages/{name}/defaults` | Stage selected |
| `usePipelineExecution.validate` | POST | `/pipelines/validate` | User clicks validate |
| `usePipelineExecution.execute` | POST | `/pipelines/execute` | User clicks execute |
| `usePipelineExecution` (polling) | GET | `/pipelines/{id}/status` | Every 2 seconds |
| `usePipelineExecution.cancel` | POST | `/pipelines/{id}/cancel` | User clicks cancel |

---

## Document Metadata

**Type:** Technical Analysis & Reference  
**Scope:** Custom Hooks (`src/hooks/`)  
**Total Lines Analyzed:** 179 lines across 3 files  
**TanStack Queries:** 3 total  
**Callbacks:** 4 total  
**Effects:** 4 total  

**Related Documentation:**
- [State Management Analysis](./STATE_MANAGEMENT_ANALYSIS.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Phase 7 Polish](./PHASE_7_POLISH.md)

---

**End of Hooks Analysis**

