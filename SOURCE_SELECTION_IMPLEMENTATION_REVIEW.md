# Source Selection Module - Technical Implementation Review

**Document**: Technical Review of `SOURCE_SELECTION_MODULE_IMPLEMENTATION_GUIDE.md`  
**Date**: December 11, 2024  
**Status**: Pre-Implementation Review  
**Reviewer**: AI Technical Assistant

---

## Executive Summary

This document provides a comprehensive technical review of the Source Selection Module Implementation Guide. The review identifies **critical gaps**, **inconsistencies**, and **areas requiring clarification** before implementation begins.

### Summary of Findings

| Category | Critical | Major | Minor |
|----------|----------|-------|-------|
| Missing Dependencies | 6 | 0 | 0 |
| Missing UI Components | 4 | 0 | 0 |
| API Client Gaps | 2 | 1 | 0 |
| Type/Interface Issues | 1 | 3 | 2 |
| Architectural Concerns | 0 | 3 | 2 |
| UX/Accessibility | 0 | 2 | 3 |
| **Total** | **13** | **9** | **7** |

---

## 1. Critical: Missing NPM Dependencies

The implementation guide uses several packages that are **NOT installed** in the project.

### 1.1 Toast Notifications (`sonner`)

**Location in Guide**: Lines 782, 1582  
**Usage**: `import { toast } from 'sonner';`

**Current State**: Package not in `package.json`

**Required Action**:
```bash
npm install sonner
```

Also requires adding `<Toaster />` component to `app/layout.tsx` or `providers.tsx`.

### 1.2 Debounce Utility (`lodash-es`)

**Location in Guide**: Line 1543  
**Usage**: `import { debounce } from 'lodash-es';`

**Current State**: Package not in `package.json`

**Required Action**:
```bash
npm install lodash-es
npm install -D @types/lodash-es
```

**Alternative**: Consider using a lighter alternative or native implementation:
```typescript
// Native debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}
```

### 1.3 Missing Radix UI Components

The following Radix UI primitives are used but not installed:

| Component | Package | Used In |
|-----------|---------|---------|
| ScrollArea | `@radix-ui/react-scroll-area` | channel-selector.tsx, saved-filters-list.tsx |
| Dialog | `@radix-ui/react-dialog` | source-selection-panel.tsx |
| Separator | `@radix-ui/react-separator` | source-selection-panel.tsx |
| Switch | `@radix-ui/react-switch` | source-selection-panel.tsx |

**Required Action**:
```bash
npm install @radix-ui/react-scroll-area @radix-ui/react-dialog @radix-ui/react-separator @radix-ui/react-switch
```

---

## 2. Critical: Missing UI Components

The guide imports components that don't exist in `src/components/ui/`:

### 2.1 Components to Create

| Component | File | Priority |
|-----------|------|----------|
| `ScrollArea` | `scroll-area.tsx` | High |
| `Dialog`, `DialogContent`, `DialogHeader`, etc. | `dialog.tsx` | High |
| `Separator` | `separator.tsx` | Medium |
| `Switch` | `switch.tsx` | High |

**Recommendation**: Use `npx shadcn@latest add <component>` to add these components with proper styling consistent with the existing codebase.

---

## 3. Critical: API Client Incomplete

### 3.1 Missing HTTP Methods

**Current `src/lib/api/client.ts` exports**:
```typescript
export const api = {
  get: <T>(...) => ...,
  post: <T>(...) => ...,
  // Missing: put, delete, patch
};
```

**Guide Usage** (source-selection.ts):
- Line 445: `api.put<{ message: string }>(...)`
- Line 452: `api.delete<{ message: string }>(...)`

**Required Changes to `client.ts`**:

```typescript
export const api = {
  get: <T>(endpoint: string, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, options),
    
  post: <T>(endpoint: string, data: unknown, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
    
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

## 4. Major: Type and Interface Issues

### 4.1 Inconsistent Type Names

**Issue**: The guide uses `RendererType` and `SortOption` which don't match existing types.

**Existing Types** (in `viewer-api.ts`):
- `ViewerRendererType` (not `RendererType`)
- `ViewerQuerySort` (not `SortOption`)

**Affected Files**: Lines 42, 64 of the page.tsx modification

**Recommendation**: Update the guide to use existing type names OR clarify if new separate types are intended.

### 4.2 Query Key Cache Stability Issue

**Location**: Line 1017-1018

```typescript
preview: (dbName: string, filter: unknown) => 
  [...queryKeys.sourceSelection.all, 'preview', dbName, JSON.stringify(filter)] as const,
```

**Problem**: Using `JSON.stringify(filter)` creates unstable cache keys because:
1. Object property order is not guaranteed
2. Different filter objects with same values create different keys

**Recommendation**: Create a deterministic cache key generator:

```typescript
function createFilterCacheKey(filter: FilterDefinition): string {
  // Sort keys and create stable string representation
  return JSON.stringify(filter, Object.keys(filter).sort());
}
```

### 4.3 Missing Export in `types/source-selection.ts`

**Issue**: The file defines `SourceSelectionState` interface but it's also defined in the store file with slightly different fields.

**Duplicate Definitions**:
- Types file lines 326-348: Interface `SourceSelectionState`
- Store file lines 507-528: Interface `SourceSelectionState`

**Recommendation**: Keep type definition ONLY in `types/source-selection.ts` and import in store.

### 4.4 Type Safety Issue with `as never[]` Casts

**Observation**: The existing viewer page uses `as never[]` casts which indicates type mismatches:

```typescript
<ChunksViewer documents={collectionData.documents as never[]} ... />
```

**Risk**: Same pattern may propagate to source selection. Consider properly typing document interfaces.

---

## 5. Major: Architectural Concerns

### 5.1 Zustand Store Persistence Scope

**Location**: Lines 746-754 (store persist configuration)

```typescript
partialize: (state) => ({
  mode: state.mode,
  currentFilter: state.currentFilter,
  selectedFilterId: state.selectedFilterId,
}),
```

**Concern**: `currentStep` is NOT persisted, but `mode` and `currentFilter` are. This creates inconsistent UX:

- User sets filter → closes browser → returns → filter is restored but on step 1
- User might expect either full state restoration OR fresh start

**Recommendation**: Either:
1. Persist `currentStep` too
2. Don't persist any state (fresh start each session)
3. Add a "Resume Session" UI prompt

### 5.2 State Access Pattern Anti-Pattern

**Location**: Line 2239 (use-pipeline-execution.ts modification)

```typescript
const { getExecutionMetadata } = useSourceSelectionStore.getState();
```

**Problem**: Using `.getState()` bypasses React's subscription model. Changes to source selection won't trigger re-renders in components using this hook.

**Better Pattern**:

```typescript
// In the hook:
const getExecutionMetadata = useSourceSelectionStore((state) => state.getExecutionMetadata);

// In execute function:
const sourceMetadata = getExecutionMetadata();
```

### 5.3 Duplicate Loading State Management

**Issue**: Both React Query and Zustand track loading states for the same data:

**React Query**:
```typescript
const { isLoading: channelsLoading } = useChannels();
```

**Zustand Store**:
```typescript
setChannelsLoading: (loading: boolean) => void;
channelsLoading: boolean;
```

**Recommendation**: Remove loading states from Zustand store and rely solely on React Query's `isLoading`/`isPending` states. The hooks already track this.

---

## 6. Major: UX/Accessibility Concerns

### 6.1 Destructive Action Without Confirmation Dialog

**Location**: Lines 1945-1949 (saved-filters-list.tsx)

```typescript
const handleDelete = (filterId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  if (confirm('Delete this filter?')) {  // Native browser confirm
    deleteFilterMutation.mutate(filterId);
  }
};
```

**Problem**: Uses native `confirm()` which:
- Looks inconsistent with app design
- Blocks the main thread
- Cannot be styled
- Poor accessibility

**Recommendation**: Use the Dialog component already imported for a proper confirmation modal.

### 6.2 Wizard Step Navigation Accessibility

**Location**: Lines 1086-1092 (wizard-step-indicator.tsx)

**Missing**:
- `aria-current="step"` for current step
- `aria-disabled` for non-clickable steps  
- Keyboard navigation (Tab, Enter, Arrow keys)
- Screen reader announcements for step changes

**Recommendation**: Add ARIA attributes:

```typescript
<button
  onClick={() => isClickable && onStepClick?.(step.id)}
  disabled={!isClickable}
  aria-current={isCurrent ? 'step' : undefined}
  aria-disabled={!isClickable}
  role="tab"
  tabIndex={isClickable ? 0 : -1}
  // ...
>
```

---

## 7. Minor: Code Quality Issues

### 7.1 Hardcoded Database Name Fallback

**Location**: Line 785

```typescript
const getDbName = () => process.env.NEXT_PUBLIC_DB_NAME || '2025-12';
```

**Problem**: Hardcoded fallback `'2025-12'` is:
- Time-sensitive (will become outdated)
- Not configurable without env vars
- Should probably come from a config file or user selection

**Recommendation**: Either:
1. Make it a required env variable (fail fast if missing)
2. Store selected database in user preferences
3. Derive from actual available databases

### 7.2 Unused Import/Destructuring

**Location**: Line 1608

```typescript
const { } = useSavedFilter(selectedFilterId);
```

**Issue**: Empty destructuring suggests the hook is called only for side effects. This is an anti-pattern - the hook should be called even without using return value, but the empty `{}` is confusing.

**Recommendation**:
```typescript
// Just call the hook without destructuring
useSavedFilter(selectedFilterId);
```

### 7.3 Magic Numbers

**Location**: Various

- Line 1806-1807: `staleTime: 5 * 60 * 1000` - should be a named constant
- Line 1879: `sample_limit: 5` - should be configurable
- Line 1734: `max={100000}`, `step={1000}` - slider bounds should be derived from data

**Recommendation**: Create a constants file:

```typescript
// lib/constants/source-selection.ts
export const SOURCE_SELECTION = {
  CACHE_TIMES: {
    CHANNELS: 5 * 60 * 1000,  // 5 minutes
    PREVIEW: 30 * 1000,        // 30 seconds
  },
  PREVIEW_SAMPLE_LIMIT: 5,
  VIEW_SLIDER: {
    MAX: 100000,
    STEP: 1000,
  },
} as const;
```

---

## 8. Inconsistencies with Existing Codebase

### 8.1 Max Width Inconsistency

**Existing execution page**: `max-w-4xl`  
**New execution page in guide**: `max-w-5xl`

**Recommendation**: Keep consistent with existing design (4xl) unless intentionally widening for wizard.

### 8.2 Store Naming Convention

**Existing stores**:
- `usePipelineStore`
- `useConfigStore`
- `useExecutionStore`

**New store**: `useSourceSelectionStore`

**Observation**: Consistent with existing naming ✓

### 8.3 Hook Naming Convention

**Existing hooks**:
- `useStages`
- `useStageConfig`
- `usePipelineExecution`

**New hooks in guide**:
- `useChannels`
- `useSavedFilters`
- `useFilterPreview`

**Concern**: The new hooks don't follow a consistent prefix pattern. Consider:
- `useSourceChannels`
- `useSourceFilters`
- `useSourcePreview`

Or group under a namespace pattern.

---

## 9. Missing Error Handling

### 9.1 No Error Boundaries

**Location**: N/A (not defined)

**Issue**: Wizard steps should have error boundaries to gracefully handle component crashes.

**Recommendation**: Add error boundary wrapper:

```typescript
// components/execution/wizard-error-boundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WizardErrorBoundary extends Component<Props, State> {
  // ... implementation
}
```

### 9.2 Missing Network Error Handling in Preview

**Location**: Lines 854-880 (useFilterPreview hook)

**Issue**: If preview API fails, the UI shows no feedback. The error is caught by React Query but not displayed.

**Recommendation**: Add `onError` callback or display error state in FilterPreview component.

---

## 10. Backend API Assumptions

### 10.1 Unverified Endpoints

The guide assumes these endpoints exist in the backend:

| Endpoint | Method | Verified |
|----------|--------|----------|
| `/source-selection/channels/{dbName}` | GET | ❓ |
| `/source-selection/preview` | POST | ❓ |
| `/source-selection/filters/{dbName}` | GET, POST | ❓ |
| `/source-selection/filters/{dbName}/{filterId}` | GET, PUT, DELETE | ❓ |
| `/source-selection/filters/{dbName}/{filterId}/duplicate` | POST | ❓ |
| `/source-selection/resolve` | POST | ❓ |

**Recommendation**: Confirm backend API exists and matches expected request/response formats before implementation.

### 10.2 Missing API Error Response Types

**Issue**: No types defined for API error responses from source-selection endpoints.

**Recommendation**: Add error response types:

```typescript
export interface SourceSelectionErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
```

---

## 11. Testing Considerations

### 11.1 Missing Test Data/Mocks

**Issue**: No mock data defined for testing during development.

**Recommendation**: Create mock data file similar to `lib/mock-data/viewer-documents.ts`:

```typescript
// lib/mock-data/source-selection.ts
export const mockChannels: ChannelInfo[] = [...];
export const mockSavedFilters: SavedFilterSummary[] = [...];
export const mockPreviewResponse: FilterPreviewResponse = {...};
```

### 11.2 No Storybook Stories

**Observation**: If the project uses Storybook, stories should be created for new components.

---

## 12. Recommended Implementation Order

Based on dependencies and risk, here's the suggested implementation order:

### Phase 1: Foundation (Day 1)
1. Install missing npm dependencies
2. Create missing UI components (ScrollArea, Dialog, Separator, Switch)
3. Add `put` and `delete` methods to API client
4. Create types file (`types/source-selection.ts`)

### Phase 2: Data Layer (Day 1-2)
5. Add query keys to `query-keys.ts`
6. Create API client (`lib/api/source-selection.ts`)
7. Create Zustand store (`lib/store/source-selection-store.ts`)
8. Create React Query hooks (`hooks/use-source-selection.ts`)

### Phase 3: Components (Day 2-3)
9. Create `wizard-step-indicator.tsx`
10. Create `channel-selector.tsx`
11. Create `filter-preview.tsx`
12. Create `saved-filters-list.tsx`
13. Create `source-selection-panel.tsx`

### Phase 4: Integration (Day 3-4)
14. Modify `execution/page.tsx`
15. Modify `use-pipeline-execution.ts`
16. Add toast provider to layout

### Phase 5: Testing & Polish (Day 4)
17. Manual testing per checklist
18. Fix any accessibility issues
19. Add error handling

---

## 13. Questions for Clarification

Before proceeding, please clarify:

1. **Backend Status**: Are all source-selection API endpoints implemented and tested?

2. **Database Selection**: Should the database name come from:
   - Environment variable only?
   - User selection (stored in preferences)?
   - Some other source?

3. **Session Persistence**: Should the wizard state persist across browser sessions? Currently filter state persists but step doesn't.

4. **Error UX**: What should happen when:
   - Channel fetch fails?
   - Preview fetch fails?
   - Filter save fails?

5. **Validation**: Should there be client-side validation for filter values (min views, engagement scores)?

6. **Loading States**: Should we show skeleton loaders or spinners for each section independently?

---

## 14. Conclusion

The implementation guide is comprehensive but requires several updates before implementation:

### Must Fix (Blocking)
- [ ] Install missing npm dependencies (sonner, lodash-es, Radix components)
- [ ] Create missing UI components
- [ ] Add PUT/DELETE to API client
- [ ] Verify backend API availability

### Should Fix (Important)
- [ ] Resolve type inconsistencies
- [ ] Fix state access anti-patterns
- [ ] Add proper delete confirmation dialog
- [ ] Add error boundaries

### Nice to Have (Enhancement)
- [ ] Add accessibility attributes
- [ ] Create mock data for development
- [ ] Add constants file for magic numbers
- [ ] Improve cache key stability

---

**Document prepared for**: Implementation Planning Session  
**Next Step**: Review findings and update implementation guide accordingly

