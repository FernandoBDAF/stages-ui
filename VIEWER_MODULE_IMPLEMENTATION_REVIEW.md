# Viewer Module Implementation - Self-Critical Review

**Date**: December 11, 2025  
**Status**: Critical Issues Found - Requires Fixes Before Use  
**Severity**: 🔴 Breaking (Build will fail)

---

## Executive Summary

The implementation I created has **significant interface mismatches** with the user's updated `page.tsx`. The user made substantial architectural changes that result in ~15 breaking issues. The codebase **will not compile** in its current state.

---

## 🔴 Critical Issues (Build-Breaking)

### 1. Missing Type Exports

**File**: `src/types/viewer-api.ts`

The page imports types that don't exist:

```typescript
// page.tsx expects:
import type { RendererType, SortOption } from '@/types/viewer-api';

// I created:
export type ViewerRendererType = 'long_text' | 'json' | ...
export interface ViewerQuerySort { field: string; order: 'asc' | 'desc'; }
```

**Fix Required**:
```typescript
// Add to viewer-api.ts:
export type RendererType = ViewerRendererType; // Alias
export type SortOption = ViewerQuerySort;      // Alias
```

---

### 2. Hook Name and Signature Mismatches

**File**: `src/hooks/use-viewer-data.ts`

| Page Expects | I Created | Issue |
|-------------|-----------|-------|
| `useCollectionQuery(db, coll, options)` | `useViewerCollectionQuery(request)` | Different signature |
| `useDocument(db, coll, id)` | `useViewerDocument(db, coll, id)` | Different name |

**Fix Required**: Export aliases or rewrite hooks:
```typescript
// Add exports:
export { useViewerCollectionQuery as useCollectionQuery };
export { useViewerDocument as useDocument };

// Or rewrite useCollectionQuery to match expected signature:
export function useCollectionQuery(
  db: string | null,
  collection: string | null,
  options: { skip?: number; limit?: number; sort?: SortOption[]; enabled?: boolean }
) { ... }
```

---

### 3. DatabaseBrowser Props Mismatch

**File**: `src/components/viewer/database-browser.tsx`

| Page Expects | I Created |
|-------------|-----------|
| `open` | `isOpen` |
| `onOpenChange` | `onClose` |
| `onSelect(db, coll, renderer)` | `onSelectCollection(db, coll, info)` |
| `currentDatabase` | `selectedDb` |
| `currentCollection` | `selectedCollection` |

**Fix Required**: Rewrite component interface:
```typescript
interface DatabaseBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (db: string, collection: string, renderer: RendererType) => void;
  currentDatabase: string | null;
  currentCollection: string | null;
}
```

---

### 4. Missing DropdownMenu Component

**File**: `src/components/ui/dropdown-menu.tsx` does **not exist**

The page uses:
```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

**Fix Required**: Install shadcn dropdown-menu component:
```bash
npx shadcn@latest add dropdown-menu
```

---

### 5. Missing Renderer Selector Function

**File**: `src/lib/viewer/renderer-selector.ts`

| Page Expects | I Created |
|-------------|-----------|
| `getAvailableRenderers(collectionName)` | ❌ Missing |
| `selectRenderer(collectionName, defaultRenderer)` | `selectRenderer(info: ViewerCollectionInfo)` |

**Fix Required**:
```typescript
export function getAvailableRenderers(collectionName: string): RendererType[] {
  // Collection-specific renderers
  if (collectionName === 'video_chunks') return ['chunks', 'table', 'json'];
  if (collectionName === 'entities') return ['entity', 'table', 'json'];
  if (collectionName === 'communities') return ['community', 'table', 'json'];
  // Default
  return ['json', 'table', 'long_text'];
}

export function selectRenderer(
  collectionName: string,
  defaultRenderer: RendererType
): RendererType {
  if (collectionName in COLLECTION_RENDERERS) {
    return COLLECTION_RENDERERS[collectionName];
  }
  return defaultRenderer;
}
```

---

### 6. Viewer Component Props Mismatches

All specialized viewers have different props than the page expects.

**ChunksViewer** - Expected vs Created:

| Expected | Created |
|----------|---------|
| `documents` | `chunks` |
| `total`, `skip`, `limit`, `hasMore` | ❌ Missing |
| `onPageChange`, `onDocumentClick` | `onChunkSelect` |

**EntityViewer** - Same issue:

| Expected | Created |
|----------|---------|
| `documents` | `entities` |
| `total`, `skip`, `limit`, `hasMore` | ❌ Missing |
| `onPageChange`, `onDocumentClick` | `onEntitySelect` |

**TableViewer** - Expected vs Created:

| Expected | Created |
|----------|---------|
| `skip`, `limit`, `hasMore` | `currentPage`, `pageSize` |
| `onSortChange(field, order)` | Internal only |
| `onDocumentClick` | `onRowClick` |
| `sortField`, `sortOrder` | Internal only |

**JsonViewer** - Expected vs Created:

| Expected | Created |
|----------|---------|
| `defaultExpanded` | `initialExpanded` |

---

### 7. CommunityViewer Props Mismatch

Same pattern as EntityViewer - expects pagination props that don't exist.

---

## 🟠 High Priority Issues

### 8. Pagination Model Inconsistency

**Issue**: I used page-based pagination (`currentPage`, `pageSize`), but the page expects skip-based pagination (`skip`, `limit`, `hasMore`).

The API uses skip/limit, so my implementation adds unnecessary conversion. The page correctly uses skip directly.

**Recommendation**: Refactor TableViewer and all list viewers to use skip/limit directly.

---

### 9. Sort State Externalization

**Issue**: TableViewer manages sort state internally. The page expects to control it externally via `sortField`, `sortOrder`, and `onSortChange`.

**Current**:
```typescript
// Internal state
const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
```

**Expected**:
```typescript
interface TableViewerProps {
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
}
```

---

### 10. Keyboard Shortcuts Removed

The user removed all keyboard shortcut handling from the page. My implementation has keyboard handling in `DatabaseBrowser` that may conflict or be redundant.

**Action**: Verify keyboard handling is working correctly in the modal context.

---

## 🟡 Medium Priority Issues

### 11. Mock Data Mode Removed

I created a dual-mode implementation (mock vs API) using `NEXT_PUBLIC_VIEWER_MODE`. The user removed this entirely, preferring API-only mode.

**Files Affected**:
- `src/lib/mock-data/viewer-documents.ts` - Now orphaned
- `src/components/viewer/source-selector.tsx` - Unused import removed

**Recommendation**: Either remove mock data files or keep them for testing purposes with documentation.

---

### 12. ViewMode (Split View) Feature Lost

The original viewer had a split-view feature comparing raw vs cleaned text. The user's refactored page doesn't use this feature, though I preserved `rendererSupportsSplitView()`.

**Impact**: The `viewMode` setting in `useViewerSettings` is now unused for actual split rendering.

**Recommendation**: Document this as a future enhancement or remove dead code.

---

### 13. JsonViewer Prop Naming

Minor inconsistency:
- Page uses `defaultExpanded={3}` (expects a number)
- I implemented `initialExpanded` as boolean with hardcoded `depth < 2` check

**Fix**: Rename prop and respect numeric depth:
```typescript
interface JsonViewerProps {
  defaultExpanded?: number; // Levels to auto-expand
}
```

---

## 🟢 Code Quality Observations

### 14. Good Patterns Used

✅ Consistent use of `cn()` for className merging  
✅ Proper TypeScript types with `Record<string, unknown>`  
✅ Loading states in all components  
✅ Error handling in DatabaseBrowser  
✅ Keyboard navigation implementation (just wrong interface)  
✅ Centralized query keys pattern followed  

### 15. Improvement Opportunities

1. **Extract common patterns**: Loading spinner, empty state, and error display could be shared components

2. **Virtual scrolling**: For large document lists, consider `@tanstack/virtual`

3. **CSS variables**: Hardcoded colors like `text-green-500` should use theme variables

4. **Better type inference**: The `as never[]` casts in page.tsx suggest type issues:
   ```typescript
   documents={collectionData.documents as never[]}
   ```

---

## Action Plan

### Immediate Fixes (Required for Build)

1. **Add missing types** to `viewer-api.ts`:
   - `RendererType` alias
   - `SortOption` alias

2. **Add missing function** to `renderer-selector.ts`:
   - `getAvailableRenderers()`
   - Update `selectRenderer()` signature

3. **Install dropdown-menu**:
   ```bash
   npx shadcn@latest add dropdown-menu
   ```

4. **Update hook exports** in `use-viewer-data.ts`:
   - Add `useCollectionQuery` with new signature
   - Add `useDocument` alias

5. **Rewrite DatabaseBrowser** interface to match page expectations

6. **Rewrite all viewer components** to use:
   - `documents` instead of type-specific names
   - Skip/limit pagination
   - External sort control
   - `onDocumentClick` handler

### Future Enhancements

1. Re-add split view for text comparison
2. Add virtual scrolling for performance
3. Add search within JSON viewer
4. Add export buttons (JSON, CSV)
5. Add keyboard shortcuts back with proper hook
6. Add collection schema preview
7. Add document count and size statistics

---

## Files Requiring Changes

| File | Priority | Changes |
|------|----------|---------|
| `src/types/viewer-api.ts` | 🔴 Critical | Add type aliases |
| `src/lib/viewer/renderer-selector.ts` | 🔴 Critical | Add missing functions |
| `src/hooks/use-viewer-data.ts` | 🔴 Critical | Rewrite hooks |
| `src/components/viewer/database-browser.tsx` | 🔴 Critical | Rewrite interface |
| `src/components/viewer/table-viewer.tsx` | 🔴 Critical | Rewrite interface |
| `src/components/viewer/chunks-viewer.tsx` | 🔴 Critical | Rewrite interface |
| `src/components/viewer/entity-viewer.tsx` | 🔴 Critical | Rewrite interface |
| `src/components/viewer/community-viewer.tsx` | 🔴 Critical | Rewrite interface |
| `src/components/viewer/json-viewer.tsx` | 🟡 Medium | Rename prop |
| `src/components/ui/dropdown-menu.tsx` | 🔴 Critical | Install component |

---

## Conclusion

This implementation demonstrates the importance of **interface-first design**. I should have:

1. Started by reading the page.tsx carefully to understand expected interfaces
2. Created TypeScript interfaces first before implementing
3. Validated component contracts against consumer expectations
4. Asked clarifying questions about the user's architectural preferences

The core functionality (JSON viewer, table rendering, entity cards) is solid, but the integration layer needs complete rework to match the expected contracts.

**Estimated Fix Time**: 2-3 hours to align all interfaces.

