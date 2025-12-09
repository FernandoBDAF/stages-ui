# State Management Analysis & Reference Guide

**Version:** 1.0  
**Created:** December 9, 2025  
**Scope:** Zustand State Management Implementation  
**Location:** `src/lib/store/`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Store Inventory](#2-store-inventory)
3. [Pipeline Store - Detailed Analysis](#3-pipeline-store---detailed-analysis)
4. [Config Store - Detailed Analysis](#4-config-store---detailed-analysis)
5. [Execution Store - Detailed Analysis](#5-execution-store---detailed-analysis)
6. [Inter-Store Relationships](#6-inter-store-relationships)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Usage Patterns](#8-usage-patterns)
9. [Debugging Guide](#9-debugging-guide)
10. [Known Limitations & Improvements](#10-known-limitations--improvements)
11. [API Reference](#11-api-reference)

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | ^5.0.0 | Lightweight state management |
| **Devtools Middleware** | Built-in | Redux DevTools integration for debugging |
| **TypeScript** | ^5.0.0 | Type-safe state definitions |

### 1.2 Design Principles

1. **Separation of Concerns**: Three distinct stores handle different domains:
   - `pipeline-store`: Data selection (what to run)
   - `config-store`: Configuration data (how to run)
   - `execution-store`: Runtime state (running status)

2. **Immutability**: All state updates create new object references

3. **Colocation**: Actions are colocated with state in each store

4. **DevTools Integration**: All stores use `devtools` middleware for debugging

### 1.3 Store Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE                             │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│   PIPELINE STORE    │    CONFIG STORE     │    EXECUTION STORE      │
│                     │                     │                         │
│  ┌───────────────┐  │  ┌───────────────┐  │  ┌───────────────────┐  │
│  │ pipelines     │  │  │ schemas       │  │  │ validationResult  │  │
│  │ stages        │  │  │ defaults      │  │  │ validationLoading │  │
│  │ selectedPipe  │  │  │ configs       │  │  │ currentPipelineId │  │
│  │ selectedStage │  │  │ expandedPanel │  │  │ pipelineStatus    │  │
│  └───────────────┘  │  └───────────────┘  │  │ executionLoading  │  │
│                     │                     │  │ errors            │  │
│                     │                     │  └───────────────────┘  │
├─────────────────────┼─────────────────────┼─────────────────────────┤
│ • setPipelines      │ • setSchema         │ • setValidationResult   │
│ • setStages         │ • setDefaults       │ • setValidationLoading  │
│ • selectPipeline    │ • setFieldValue     │ • setPipelineId         │
│ • toggleStage       │ • resetStageConfig  │ • setPipelineStatus     │
│ • setSelectedStages │ • togglePanel       │ • setExecutionLoading   │
│ • clearSelection    │ • clearConfigs      │ • addError / clearErrors│
│                     │                     │ • reset                 │
└─────────────────────┴─────────────────────┴─────────────────────────┘
```

### 1.4 File Structure

```
src/lib/store/
├── pipeline-store.ts    # 71 lines - Pipeline & stage selection
├── config-store.ts      # 86 lines - Stage configurations
└── execution-store.ts   # 60 lines - Validation & execution state
```

---

## 2. Store Inventory

### 2.1 Quick Reference Table

| Store | File | Hook | State Count | Action Count | Lines |
|-------|------|------|-------------|--------------|-------|
| Pipeline | `pipeline-store.ts` | `usePipelineStore` | 4 | 6 | 71 |
| Config | `config-store.ts` | `useConfigStore` | 4 | 6 | 86 |
| Execution | `execution-store.ts` | `useExecutionStore` | 6 | 8 | 60 |
| **Total** | - | - | **14** | **20** | **217** |

### 2.2 Dependencies

```typescript
// All stores use the same imports:
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { /* API types */ } from '@/types/api';
```

### 2.3 TypeScript Types Used

| Store | Types Imported |
|-------|----------------|
| Pipeline | `Pipeline`, `Stage`, `PipelineType` |
| Config | `StageConfigSchema` |
| Execution | `ValidationResult`, `PipelineStatus` |

---

## 3. Pipeline Store - Detailed Analysis

### 3.1 Purpose

Manages pipeline and stage selection state. Handles the "what to run" aspect of the application.

### 3.2 State Schema

```typescript
interface PipelineState {
  // === DATA (from API) ===
  pipelines: Record<string, Pipeline>;  // All available pipelines
  stages: Record<string, Stage>;        // All available stages
  
  // === SELECTION (user choices) ===
  selectedPipeline: PipelineType | null;  // 'graphrag' | 'ingestion' | null
  selectedStages: string[];               // Array of stage names
  
  // === ACTIONS ===
  setPipelines: (pipelines: Record<string, Pipeline>) => void;
  setStages: (stages: Record<string, Stage>) => void;
  selectPipeline: (pipeline: PipelineType) => void;
  toggleStage: (stageName: string) => void;
  setSelectedStages: (stages: string[]) => void;
  clearSelection: () => void;
}
```

### 3.3 Initial State

```typescript
{
  pipelines: {},
  stages: {},
  selectedPipeline: null,
  selectedStages: [],
}
```

### 3.4 Actions Analysis

#### `setPipelines(pipelines)`
- **Purpose**: Populate available pipelines from API
- **Behavior**: Direct replacement of pipelines object
- **Called By**: `useStages` hook after API fetch
- **Side Effects**: None

```typescript
setPipelines: (pipelines) => set({ pipelines })
```

#### `setStages(stages)`
- **Purpose**: Populate available stages from API
- **Behavior**: Direct replacement of stages object
- **Called By**: `useStages` hook after API fetch
- **Side Effects**: None

```typescript
setStages: (stages) => set({ stages })
```

#### `selectPipeline(pipeline)` ⚠️ **Critical Action**
- **Purpose**: Select a pipeline type
- **Behavior**: Sets pipeline AND clears selected stages
- **Called By**: `PipelineSelector` component
- **Side Effects**: **Clears `selectedStages`** - This is intentional to reset stage selection when changing pipelines

```typescript
selectPipeline: (pipeline) => {
  set({ 
    selectedPipeline: pipeline,
    selectedStages: []  // ← IMPORTANT: Resets stages
  });
}
```

#### `toggleStage(stageName)` ⚠️ **Complex Action**
- **Purpose**: Toggle stage selection with auto-dependency resolution
- **Behavior**: 
  - If already selected → Remove from selection
  - If not selected → Add + auto-add any dependencies
- **Called By**: `StageSelector` component
- **Side Effects**: May add additional stages (dependencies)

```typescript
toggleStage: (stageName) => {
  const { selectedStages, stages } = get();
  const isSelected = selectedStages.includes(stageName);
  
  if (isSelected) {
    // Simple removal
    set({ selectedStages: selectedStages.filter((s) => s !== stageName) });
  } else {
    // Add with dependencies
    const stage = stages[stageName];
    const newStages = new Set([...selectedStages, stageName]);
    
    if (stage?.dependencies) {
      stage.dependencies.forEach((dep) => newStages.add(dep));
    }
    
    set({ selectedStages: Array.from(newStages) });
  }
}
```

**Dependency Resolution Flow:**
```
User selects: "entity_resolution"
              ↓
Stage has dependencies: ["graph_extraction"]
              ↓
Result: ["entity_resolution", "graph_extraction"]
```

#### `setSelectedStages(stages)`
- **Purpose**: Direct replacement of selected stages
- **Behavior**: Bypasses dependency logic
- **Called By**: Used for bulk operations (e.g., select all)
- **Side Effects**: None

```typescript
setSelectedStages: (stages) => set({ selectedStages: stages })
```

#### `clearSelection()`
- **Purpose**: Reset all selections
- **Behavior**: Clears both pipeline and stages
- **Called By**: Reset operations, navigation away
- **Side Effects**: None

```typescript
clearSelection: () => set({ 
  selectedPipeline: null, 
  selectedStages: [] 
})
```

### 3.5 State Access Patterns

```typescript
// Component usage:
const { selectedPipeline, selectPipeline } = usePipelineStore();

// Direct state access (outside React):
const stages = usePipelineStore.getState().stages;

// Selective subscription (performance optimization):
const selectedStages = usePipelineStore((state) => state.selectedStages);
```

---

## 4. Config Store - Detailed Analysis

### 4.1 Purpose

Manages stage configuration schemas, defaults, and user-entered values. Handles the "how to configure" aspect.

### 4.2 State Schema

```typescript
interface ConfigState {
  // === SCHEMA DATA (from API, cached) ===
  schemas: Record<string, StageConfigSchema>;   // Stage → Schema mapping
  defaults: Record<string, Record<string, unknown>>; // Stage → Default values
  
  // === USER DATA ===
  configs: Record<string, Record<string, unknown>>; // Stage → User config values
  
  // === UI STATE ===
  expandedPanels: string[];  // Which config panels are expanded
  
  // === ACTIONS ===
  setSchema: (stageName: string, schema: StageConfigSchema) => void;
  setDefaults: (stageName: string, defaults: Record<string, unknown>) => void;
  setFieldValue: (stageName: string, fieldName: string, value: unknown) => void;
  resetStageConfig: (stageName: string) => void;
  togglePanel: (stageName: string) => void;
  clearConfigs: () => void;
}
```

### 4.3 Initial State

```typescript
{
  schemas: {},
  defaults: {},
  configs: {},
  expandedPanels: [],
}
```

### 4.4 Data Structure Examples

```typescript
// schemas structure:
{
  "graph_extraction": {
    stage_name: "graph_extraction",
    config_class: "GraphExtractionConfig",
    description: "Extract entities and relationships",
    fields: [
      { name: "model_name", type: "string", ui_type: "select", ... },
      { name: "temperature", type: "number", ui_type: "slider", ... },
    ],
    categories: [
      { name: "LLM Settings", fields: ["model_name", "temperature"], ... }
    ],
    field_count: 25
  }
}

// defaults structure:
{
  "graph_extraction": {
    "model_name": "gpt-4o-mini",
    "temperature": 0.1,
    "concurrency": 50
  }
}

// configs structure (user values):
{
  "graph_extraction": {
    "model_name": "gpt-4o",      // User changed from default
    "temperature": 0.3,          // User changed from default
    "concurrency": 50            // Same as default
  }
}
```

### 4.5 Actions Analysis

#### `setSchema(stageName, schema)`
- **Purpose**: Cache schema from API
- **Behavior**: Merges into schemas object
- **Called By**: `useStageConfig` hook
- **Side Effects**: None

```typescript
setSchema: (stageName, schema) => {
  set((state) => ({
    schemas: { ...state.schemas, [stageName]: schema },
  }));
}
```

#### `setDefaults(stageName, defaults)` ⚠️ **Initializes Config**
- **Purpose**: Set default values AND initialize user config
- **Behavior**: 
  1. Stores defaults
  2. If no user config exists, initializes with defaults
- **Called By**: `useStageConfig` hook
- **Side Effects**: May initialize `configs[stageName]`

```typescript
setDefaults: (stageName, defaults) => {
  set((state) => ({
    defaults: { ...state.defaults, [stageName]: defaults },
    // Initialize config with defaults if not set
    configs: {
      ...state.configs,
      [stageName]: state.configs[stageName] || { ...defaults },
    },
  }));
}
```

**Initialization Logic:**
```
setDefaults("graph_extraction", { temperature: 0.1 })
              ↓
configs["graph_extraction"] exists?
  ├── YES → Keep existing (user may have modified)
  └── NO  → Initialize with { temperature: 0.1 }
```

#### `setFieldValue(stageName, fieldName, value)`
- **Purpose**: Update a single field value
- **Behavior**: Deep merge into stage config
- **Called By**: `ConfigField` component onChange
- **Side Effects**: None

```typescript
setFieldValue: (stageName, fieldName, value) => {
  set((state) => ({
    configs: {
      ...state.configs,
      [stageName]: {
        ...state.configs[stageName],
        [fieldName]: value,
      },
    },
  }));
}
```

**Update Flow:**
```
setFieldValue("graph_extraction", "temperature", 0.5)
              ↓
configs: {
  "graph_extraction": {
    ...existingValues,
    "temperature": 0.5  // Updated
  }
}
```

#### `resetStageConfig(stageName)`
- **Purpose**: Reset a stage's config to defaults
- **Behavior**: Replaces config with copy of defaults
- **Called By**: Reset button in `StageConfigPanel`
- **Side Effects**: Loses all user modifications for that stage

```typescript
resetStageConfig: (stageName) => {
  const { defaults } = get();
  set((state) => ({
    configs: {
      ...state.configs,
      [stageName]: { ...defaults[stageName] },
    },
  }));
}
```

#### `togglePanel(stageName)`
- **Purpose**: Toggle UI expansion state
- **Behavior**: Add/remove from expandedPanels array
- **Called By**: `StageConfigPanel` header click
- **Side Effects**: None (UI only)

```typescript
togglePanel: (stageName) => {
  set((state) => ({
    expandedPanels: state.expandedPanels.includes(stageName)
      ? state.expandedPanels.filter((p) => p !== stageName)
      : [...state.expandedPanels, stageName],
  }));
}
```

#### `clearConfigs()`
- **Purpose**: Clear all user configurations
- **Behavior**: Resets configs and UI state
- **Called By**: Pipeline change, reset operations
- **Side Effects**: All user modifications lost

```typescript
clearConfigs: () => set({ configs: {}, expandedPanels: [] })
```

---

## 5. Execution Store - Detailed Analysis

### 5.1 Purpose

Manages validation results, execution state, and runtime status. Handles the "running status" aspect.

### 5.2 State Schema

```typescript
interface ExecutionState {
  // === VALIDATION ===
  validationResult: ValidationResult | null;
  validationLoading: boolean;
  
  // === EXECUTION ===
  currentPipelineId: string | null;  // e.g., "pipeline_1234567890_abc123"
  pipelineStatus: PipelineStatus | null;
  executionLoading: boolean;
  
  // === ERRORS ===
  errors: string[];  // Accumulated error messages
  
  // === ACTIONS ===
  setValidationResult: (result: ValidationResult | null) => void;
  setValidationLoading: (loading: boolean) => void;
  setPipelineId: (id: string | null) => void;
  setPipelineStatus: (status: PipelineStatus | null) => void;
  setExecutionLoading: (loading: boolean) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  reset: () => void;
}
```

### 5.3 Initial State

```typescript
{
  validationResult: null,
  validationLoading: false,
  currentPipelineId: null,
  pipelineStatus: null,
  executionLoading: false,
  errors: [],
}
```

### 5.4 State Value Examples

```typescript
// After successful validation:
{
  validationResult: {
    valid: true,
    errors: {},
    warnings: ["Stage X depends on Y (auto-included)"],
    execution_plan: {
      stages: ["graph_extraction", "entity_resolution"],
      resolved_dependencies: ["graph_extraction"]
    }
  },
  validationLoading: false,
  ...
}

// During execution:
{
  currentPipelineId: "pipeline_1702123456789_abc123",
  pipelineStatus: {
    pipeline_id: "pipeline_1702123456789_abc123",
    status: "running",
    current_stage: "entity_resolution",
    progress: {
      completed_stages: 1,
      total_stages: 2,
      percent: 50
    },
    elapsed_seconds: 45
  },
  executionLoading: false,  // Only true during initial API call
  ...
}

// With errors:
{
  errors: [
    "Failed to connect to API",
    "Validation failed: missing required field"
  ],
  ...
}
```

### 5.5 Actions Analysis

#### `setValidationResult(result)`
- **Purpose**: Store validation API response
- **Behavior**: Direct replacement
- **Called By**: `usePipelineExecution.validate()`
- **Side Effects**: None

```typescript
setValidationResult: (result) => set({ validationResult: result })
```

#### `setValidationLoading(loading)`
- **Purpose**: Track validation API call state
- **Behavior**: Boolean toggle
- **Called By**: `usePipelineExecution.validate()`
- **Side Effects**: None (UI uses for button disable)

```typescript
setValidationLoading: (loading) => set({ validationLoading: loading })
```

#### `setPipelineId(id)`
- **Purpose**: Store pipeline ID from execution API
- **Behavior**: Direct replacement
- **Called By**: `usePipelineExecution.execute()`
- **Side Effects**: None

```typescript
setPipelineId: (id) => set({ currentPipelineId: id })
```

#### `setPipelineStatus(status)`
- **Purpose**: Update execution status from polling
- **Behavior**: Direct replacement
- **Called By**: Status polling interval in `usePipelineExecution`
- **Side Effects**: None

```typescript
setPipelineStatus: (status) => set({ pipelineStatus: status })
```

#### `setExecutionLoading(loading)`
- **Purpose**: Track execution API call state
- **Behavior**: Boolean toggle
- **Called By**: `usePipelineExecution.execute()`
- **Side Effects**: None

```typescript
setExecutionLoading: (loading) => set({ executionLoading: loading })
```

#### `addError(error)`
- **Purpose**: Accumulate error messages
- **Behavior**: Append to errors array (does not replace)
- **Called By**: Any error handler
- **Side Effects**: None

```typescript
addError: (error) => set((state) => ({ errors: [...state.errors, error] }))
```

**Accumulation Pattern:**
```
addError("Error 1") → errors: ["Error 1"]
addError("Error 2") → errors: ["Error 1", "Error 2"]
```

#### `clearErrors()`
- **Purpose**: Clear all accumulated errors
- **Behavior**: Reset to empty array
- **Called By**: Before new operations
- **Side Effects**: None

```typescript
clearErrors: () => set({ errors: [] })
```

#### `reset()` ⚠️ **Full Reset**
- **Purpose**: Reset entire execution state
- **Behavior**: Returns to initial state
- **Called By**: After completion, before new execution
- **Side Effects**: All execution state cleared

```typescript
reset: () => set({
  validationResult: null,
  validationLoading: false,
  currentPipelineId: null,
  pipelineStatus: null,
  executionLoading: false,
  errors: [],
})
```

---

## 6. Inter-Store Relationships

### 6.1 Store Dependency Graph

```
┌─────────────────┐
│ Pipeline Store  │ ← Data source (pipelines, stages)
└────────┬────────┘
         │ selectedPipeline, selectedStages
         ▼
┌─────────────────┐
│  Config Store   │ ← Uses selected stages to know which configs to show
└────────┬────────┘
         │ configs (all user configurations)
         ▼
┌─────────────────┐
│ Execution Store │ ← Uses configs for validation/execution
└─────────────────┘
```

### 6.2 Data Flow Between Stores

| Source | Target | Data Passed | When |
|--------|--------|-------------|------|
| Pipeline → Config | `selectedStages` | Determines which config panels to show | Stage selection |
| Pipeline + Config → Execution | `selectedPipeline`, `selectedStages`, `configs` | Validation/execution payload | Validate/Execute click |
| Execution → UI | `validationResult`, `pipelineStatus` | Display results | After API calls |

### 6.3 Cross-Store Access Pattern

```typescript
// In usePipelineExecution hook:
const { selectedPipeline, selectedStages } = usePipelineStore();
const { configs } = useConfigStore();
const { setValidationResult, ... } = useExecutionStore();

// Outside React (for non-hook contexts):
const pipelineId = useExecutionStore.getState().currentPipelineId;
```

### 6.4 Reset Chain

When resetting the application, stores should be cleared in this order:

```
1. clearSelection() on Pipeline Store
   └── Clears selectedPipeline, selectedStages
   
2. clearConfigs() on Config Store
   └── Clears configs, expandedPanels
   
3. reset() on Execution Store
   └── Clears all execution state
```

---

## 7. Data Flow Diagrams

### 7.1 Initial Data Load Flow

```
┌──────────────┐
│  Page Load   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│   useStages Hook     │
│  (TanStack Query)    │
└──────┬───────────────┘
       │ API: GET /stages
       ▼
┌──────────────────────┐
│   API Response       │
│  { pipelines, stages }│
└──────┬───────────────┘
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
┌──────────────────────┐    ┌──────────────────────┐
│ setPipelines(data)   │    │ setStages(data)      │
│   Pipeline Store     │    │   Pipeline Store     │
└──────────────────────┘    └──────────────────────┘
```

### 7.2 Stage Selection Flow

```
┌──────────────────────┐
│  User clicks stage   │
│  checkbox            │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  toggleStage(name)   │
│   Pipeline Store     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Dependency Resolution           │
│  stages[name].dependencies       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Update selectedStages           │
│  (includes dependencies)         │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  For each selected stage:        │
│  useStageConfig(stageName)       │
└──────┬───────────────────────────┘
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
┌──────────────────────┐    ┌──────────────────────┐
│ setSchema(name,data) │    │ setDefaults(name,val)│
│   Config Store       │    │   Config Store       │
└──────────────────────┘    └──────────────────────┘
```

### 7.3 Configuration Update Flow

```
┌──────────────────────┐
│  User changes field  │
│  value               │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  ConfigField.handleChange(newValue)  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  setFieldValue(stage, field, value)  │
│   Config Store                       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  configs[stage][field] = value       │
│  (Immutable update)                  │
└──────────────────────────────────────┘
```

### 7.4 Validation & Execution Flow

```
┌──────────────────────┐
│  User clicks         │
│  "Validate"          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  usePipelineExecution.validate()     │
└──────┬───────────────────────────────┘
       │
       ├───────────────────────────────────────────────┐
       │                                               │
       ▼                                               ▼
┌──────────────────────┐              ┌──────────────────────────┐
│ setValidationLoading │              │  Read from stores:       │
│ (true)               │              │  - selectedPipeline      │
│ Execution Store      │              │  - selectedStages        │
└──────────────────────┘              │  - configs               │
                                      └──────────┬───────────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────────┐
                                      │  API: POST /validate     │
                                      │  Body: { pipeline,       │
                                      │          stages, config }│
                                      └──────────┬───────────────┘
                                                 │
       ┌─────────────────────────────────────────┤
       │                                         │
       ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────────┐
│ setValidationResult  │              │ setValidationLoading     │
│ (response)           │              │ (false)                  │
│ Execution Store      │              │ Execution Store          │
└──────────────────────┘              └──────────────────────────┘
```

### 7.5 Status Polling Flow

```
┌──────────────────────┐
│  After execute()     │
│  API returns ID      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ setPipelineId(id)    │
│ Execution Store      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ startPolling(id)     │
│ setInterval(2000ms)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│         POLLING LOOP                  │
│  ┌─────────────────────────────────┐ │
│  │ API: GET /pipelines/{id}/status │ │
│  └──────────┬──────────────────────┘ │
│             │                        │
│             ▼                        │
│  ┌─────────────────────────────────┐ │
│  │ setPipelineStatus(response)     │ │
│  │ Execution Store                 │ │
│  └──────────┬──────────────────────┘ │
│             │                        │
│             ▼                        │
│  ┌─────────────────────────────────┐ │
│  │ status in [completed, failed,   │ │
│  │            error, cancelled]?   │ │
│  └──────────┬──────────────────────┘ │
│             │                        │
│    YES ─────┴───── NO → Continue     │
│      │             Loop              │
│      ▼                               │
│  ┌─────────────────────────────────┐ │
│  │ clearInterval()                 │ │
│  │ Stop polling                    │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 8. Usage Patterns

### 8.1 Component Subscription

```typescript
// GOOD: Selective subscription (re-renders only when specific state changes)
const selectedPipeline = usePipelineStore((state) => state.selectedPipeline);
const selectedStages = usePipelineStore((state) => state.selectedStages);

// GOOD: Multiple values with shallow equality
const { selectedPipeline, selectPipeline } = usePipelineStore(
  useShallow((state) => ({
    selectedPipeline: state.selectedPipeline,
    selectPipeline: state.selectPipeline,
  }))
);

// AVOID: Full store subscription (re-renders on any change)
const store = usePipelineStore(); // Don't do this
```

### 8.2 Outside React Access

```typescript
// Access state outside React components:
const currentId = useExecutionStore.getState().currentPipelineId;

// Call action outside React:
useExecutionStore.getState().addError("Something went wrong");

// Subscribe to changes (for non-React code):
const unsubscribe = usePipelineStore.subscribe(
  (state) => state.selectedStages,
  (selectedStages) => {
    console.log('Stages changed:', selectedStages);
  }
);
```

### 8.3 Conditional State Updates

```typescript
// Pattern: Check before update
toggleStage: (stageName) => {
  const { selectedStages, stages } = get(); // get() for current state
  const isSelected = selectedStages.includes(stageName);
  
  if (isSelected) {
    // Action A
  } else {
    // Action B
  }
}
```

### 8.4 Derived State

```typescript
// In components, compute derived state from store:
const { selectedPipeline, stages } = usePipelineStore();

// Derived: Filter stages for selected pipeline
const pipelineStages = selectedPipeline
  ? Object.values(stages).filter((s) => s.pipeline === selectedPipeline)
  : [];
```

---

## 9. Debugging Guide

### 9.1 Redux DevTools Integration

All stores are configured with `devtools` middleware. Open Redux DevTools in browser:

1. Install Redux DevTools browser extension
2. Open DevTools (F12)
3. Navigate to "Redux" tab
4. See stores listed: `pipeline-store`, `config-store`, `execution-store`

**Features:**
- State inspection
- Action history
- Time-travel debugging
- State diff view

### 9.2 Common Issues & Solutions

#### Issue: Stage selection not updating

**Symptoms:**
- Clicking checkbox doesn't change selection
- Dependencies not being added

**Debug Steps:**
1. Check Redux DevTools for `toggleStage` action
2. Verify `stages` data is populated
3. Check if component is subscribed correctly

```typescript
// Debug logging:
toggleStage: (stageName) => {
  const { selectedStages, stages } = get();
  console.log('toggleStage called:', stageName);
  console.log('Current stages:', Object.keys(stages));
  console.log('Current selected:', selectedStages);
  // ... rest of logic
}
```

#### Issue: Configuration not persisting

**Symptoms:**
- Values reset when changing tabs
- Values lost after navigation

**Debug Steps:**
1. Check if `setFieldValue` action fires in DevTools
2. Verify `configs` state structure
3. Check component key prop (may be remounting)

```typescript
// Verify config state:
console.log('Current configs:', useConfigStore.getState().configs);
```

#### Issue: Validation result not updating UI

**Symptoms:**
- Validation completes but UI shows old result
- Button stays in loading state

**Debug Steps:**
1. Check `setValidationResult` in DevTools
2. Verify component subscription
3. Check for errors in console

```typescript
// Force check state:
console.log('Validation state:', {
  result: useExecutionStore.getState().validationResult,
  loading: useExecutionStore.getState().validationLoading,
});
```

### 9.3 DevTools Action Names

| Store | Action | DevTools Name |
|-------|--------|---------------|
| Pipeline | `selectPipeline` | `pipeline-store/selectPipeline` |
| Pipeline | `toggleStage` | `pipeline-store/toggleStage` |
| Config | `setFieldValue` | `config-store/setFieldValue` |
| Config | `resetStageConfig` | `config-store/resetStageConfig` |
| Execution | `setValidationResult` | `execution-store/setValidationResult` |
| Execution | `setPipelineStatus` | `execution-store/setPipelineStatus` |

### 9.4 State Inspection Helpers

```typescript
// Add to browser console for debugging:
window.debugStores = {
  pipeline: () => usePipelineStore.getState(),
  config: () => useConfigStore.getState(),
  execution: () => useExecutionStore.getState(),
  all: () => ({
    pipeline: usePipelineStore.getState(),
    config: useConfigStore.getState(),
    execution: useExecutionStore.getState(),
  }),
};

// Usage in console:
debugStores.pipeline()
debugStores.all()
```

---

## 10. Known Limitations & Improvements

### 10.1 Current Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **No persistence** | State lost on refresh | User must reconfigure |
| **No undo/redo** | Can't undo field changes | User experience |
| **No field-level errors** | Errors not tracked per field | Validation UX |
| **No dirty tracking** | Can't detect unsaved changes | Navigation warnings |
| **Dependency removal** | Removing stage doesn't remove dependents | May leave orphans |

### 10.2 Suggested Improvements

#### 1. Add localStorage persistence

```typescript
import { persist } from 'zustand/middleware';

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set, get) => ({
        // ... store implementation
      }),
      {
        name: 'config-storage',
        partialize: (state) => ({ configs: state.configs }),
      }
    ),
    { name: 'config-store' }
  )
);
```

#### 2. Add field-level error tracking

```typescript
// Add to ConfigState:
interface ConfigState {
  // ... existing state
  fieldErrors: Record<string, Record<string, string>>;
  setFieldError: (stage: string, field: string, error: string | null) => void;
  clearFieldErrors: (stage: string) => void;
}
```

#### 3. Add dirty state tracking

```typescript
// Add to ConfigState:
interface ConfigState {
  // ... existing state
  dirtyFields: Record<string, Set<string>>;
  markDirty: (stage: string, field: string) => void;
  clearDirty: (stage: string) => void;
  isDirty: () => boolean;
}
```

#### 4. Cascade dependency removal

```typescript
// Enhanced toggleStage:
toggleStage: (stageName) => {
  const { selectedStages, stages } = get();
  const isSelected = selectedStages.includes(stageName);
  
  if (isSelected) {
    // Find stages that depend on this one
    const dependents = Object.values(stages)
      .filter(s => s.dependencies.includes(stageName))
      .map(s => s.name);
    
    // Remove this stage AND its dependents
    set({ 
      selectedStages: selectedStages.filter(
        s => s !== stageName && !dependents.includes(s)
      )
    });
  } else {
    // ... existing add logic
  }
}
```

#### 5. Add computed selectors

```typescript
// Add selectors file: src/lib/store/selectors.ts
export const selectPipelineStages = (state: PipelineState) => {
  if (!state.selectedPipeline) return [];
  return Object.values(state.stages)
    .filter(s => s.pipeline === state.selectedPipeline);
};

export const selectMissingDependencies = (state: PipelineState) => {
  return state.selectedStages.flatMap(stageName => {
    const stage = state.stages[stageName];
    if (!stage?.dependencies) return [];
    return stage.dependencies.filter(dep => !state.selectedStages.includes(dep));
  });
};
```

---

## 11. API Reference

### 11.1 Pipeline Store API

```typescript
// Hook
import { usePipelineStore } from '@/lib/store/pipeline-store';

// State
interface PipelineState {
  pipelines: Record<string, Pipeline>;
  stages: Record<string, Stage>;
  selectedPipeline: PipelineType | null;
  selectedStages: string[];
}

// Actions
setPipelines(pipelines: Record<string, Pipeline>): void
setStages(stages: Record<string, Stage>): void
selectPipeline(pipeline: PipelineType): void  // Clears selectedStages
toggleStage(stageName: string): void          // Auto-adds dependencies
setSelectedStages(stages: string[]): void
clearSelection(): void
```

### 11.2 Config Store API

```typescript
// Hook
import { useConfigStore } from '@/lib/store/config-store';

// State
interface ConfigState {
  schemas: Record<string, StageConfigSchema>;
  defaults: Record<string, Record<string, unknown>>;
  configs: Record<string, Record<string, unknown>>;
  expandedPanels: string[];
}

// Actions
setSchema(stageName: string, schema: StageConfigSchema): void
setDefaults(stageName: string, defaults: Record<string, unknown>): void  // Initializes config
setFieldValue(stageName: string, fieldName: string, value: unknown): void
resetStageConfig(stageName: string): void
togglePanel(stageName: string): void
clearConfigs(): void
```

### 11.3 Execution Store API

```typescript
// Hook
import { useExecutionStore } from '@/lib/store/execution-store';

// State
interface ExecutionState {
  validationResult: ValidationResult | null;
  validationLoading: boolean;
  currentPipelineId: string | null;
  pipelineStatus: PipelineStatus | null;
  executionLoading: boolean;
  errors: string[];
}

// Actions
setValidationResult(result: ValidationResult | null): void
setValidationLoading(loading: boolean): void
setPipelineId(id: string | null): void
setPipelineStatus(status: PipelineStatus | null): void
setExecutionLoading(loading: boolean): void
addError(error: string): void  // Accumulates, doesn't replace
clearErrors(): void
reset(): void                  // Full state reset
```

### 11.4 Type Definitions Reference

```typescript
// From @/types/api
type PipelineType = 'graphrag' | 'ingestion';

interface Pipeline {
  name: string;
  description: string;
  stages: string[];
  stage_count: number;
}

interface Stage {
  name: string;
  display_name: string;
  description: string;
  pipeline: string;
  config_class: string;
  dependencies: string[];
  has_llm: boolean;
}

interface StageConfigSchema {
  stage_name: string;
  config_class: string;
  description: string;
  fields: ConfigField[];
  categories: Category[];
  field_count: number;
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  warnings: string[];
  execution_plan?: {
    stages: string[];
    resolved_dependencies: string[];
  };
}

interface PipelineStatus {
  pipeline_id: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'error' | 'cancelled';
  current_stage: string | null;
  progress: {
    completed_stages: number;
    total_stages: number;
    percent: number;
  };
  elapsed_seconds: number;
  error?: string;
}
```

---

## Document Metadata

**Type:** Technical Analysis & Reference  
**Scope:** State Management (`src/lib/store/`)  
**Total Lines Analyzed:** 217 lines across 3 files  
**State Properties:** 14 total  
**Actions:** 20 total  

**Related Documentation:**
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Phase 7 Polish](./PHASE_7_POLISH.md)
- [UI Design Specification](./UI_DESIGN_SPECIFICATION.md)

---

**End of State Management Analysis**

