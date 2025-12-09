# Stages UI - Implementation Guide

**Last Updated:** December 9, 2025  
**Project:** StagesUI Frontend  
**Location:** `StagesUI/`  
**Related Backend:** `../GraphRAG/app/stages_api/`

---

## 📋 Session Summary

### What Was Fixed (December 9, 2025)

1. **React Hooks Order Violation**
   - **File:** `src/app/page.tsx`
   - **Issue:** `useStageConfig` hook was called inside `.map()` loop
   - **Fix:** Extracted `StageConfigPanelWrapper` component so hooks are at top level

2. **API Response Type Mismatches**
   - **File:** `src/components/execution/validation-results.tsx`
   - **Issues:** 
     - `errors.map is not a function` - API returned objects, not arrays
     - `Cannot read properties of undefined (reading 'length')` - missing optional chaining
   - **Fix:** Added `formatError()` and `normalizeErrors()` helpers with defensive coding

### What Still Needs Implementation

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 High | Polling continues on 404 | Infinite error loop | Low |
| 🔴 High | No server health detection | Can't show connection status | Low |
| 🟡 Medium | No retry logic | Fails silently | Medium |
| 🟡 Medium | Polling doesn't stop on error | Console spam | Low |
| 🟢 Low | No execution history view | Can't review past runs | Medium |

---

## 🏗️ Architecture Context

### Current File Structure
```
StagesUI/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main page ✅ FIXED (hooks extraction)
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # TanStack Query provider
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── config/
│   │   │   ├── category-section.tsx
│   │   │   ├── config-field.tsx
│   │   │   └── stage-config-panel.tsx
│   │   ├── execution/
│   │   │   ├── execution-panel.tsx       # ⚠️ NEEDS ERROR HANDLING
│   │   │   ├── status-monitor.tsx
│   │   │   └── validation-results.tsx    # ✅ FIXED (error formatting)
│   │   ├── pipeline/
│   │   │   ├── pipeline-selector.tsx
│   │   │   └── stage-selector.tsx
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   └── footer.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/
│   │   ├── use-pipeline-execution.ts  # ⚠️ NEEDS 404 HANDLING
│   │   ├── use-stage-config.ts
│   │   └── use-stages.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts              # Base fetch client
│   │   │   ├── pipelines.ts           # Pipeline API calls
│   │   │   └── stages.ts              # Stages API calls
│   │   ├── store/
│   │   │   ├── config-store.ts        # Config state (Zustand)
│   │   │   ├── execution-store.ts     # Execution state
│   │   │   └── pipeline-store.ts      # Pipeline selection state
│   │   └── utils/
│   │       └── cn.ts                  # Class name utility
│   └── types/
│       └── api.ts                     # API type definitions
├── package.json
└── tsconfig.json
```

### Tech Stack
- **Framework:** Next.js 16.0.8 (Turbopack)
- **React:** 19.2.1
- **State:** Zustand 5.0.9
- **Data Fetching:** TanStack Query 5.90.12
- **Forms:** React Hook Form 7.68.0
- **UI:** Radix UI + Tailwind CSS

### API Connection
```typescript
// src/lib/api/client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
```

---

## 🔧 Implementation Tasks

### Phase 1: Handle 404 Gracefully (Low Effort - 1 hour)

**Goal:** Stop polling when pipeline not found, show user-friendly error.

#### Task 1.1: Update Polling Logic to Handle 404

**File:** `src/hooks/use-pipeline-execution.ts`

**Current Code (lines 48-70):**
```typescript
const startPolling = useCallback((pipelineId: string) => {
  if (pollingRef.current) {
    clearInterval(pollingRef.current);
  }

  pollingRef.current = setInterval(async () => {
    try {
      const status = await pipelinesApi.getStatus(pipelineId);
      setPipelineStatus(status);

      if (['completed', 'failed', 'error', 'cancelled'].includes(status.status)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (error) {
      console.error('Status polling error:', error);
      // ⚠️ BUG: Polling continues forever on 404!
    }
  }, 2000);
}, [setPipelineStatus]);
```

**Fixed Code:**
```typescript
const startPolling = useCallback((pipelineId: string) => {
  if (pollingRef.current) {
    clearInterval(pollingRef.current);
  }

  let errorCount = 0;
  const MAX_ERRORS = 3;

  pollingRef.current = setInterval(async () => {
    try {
      const status = await pipelinesApi.getStatus(pipelineId);
      errorCount = 0; // Reset on success
      setPipelineStatus(status);

      // Stop polling if finished
      if (['completed', 'failed', 'error', 'cancelled'].includes(status.status)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (error) {
      errorCount++;
      console.error(`Status polling error (${errorCount}/${MAX_ERRORS}):`, error);
      
      // Check if it's a 404 (pipeline not found)
      if (error instanceof ApiError && error.status === 404) {
        // Stop polling immediately
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Set error state
        setPipelineStatus({
          pipeline_id: pipelineId,
          status: 'error',
          current_stage: null,
          progress: { completed_stages: 0, total_stages: 0, percent: 0 },
          elapsed_seconds: 0,
          error: 'Pipeline not found. The server may have restarted.',
        });
        addError('Pipeline not found. The server may have restarted. Please try executing again.');
        return;
      }
      
      // Stop after MAX_ERRORS consecutive failures
      if (errorCount >= MAX_ERRORS) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        addError(`Failed to get pipeline status after ${MAX_ERRORS} attempts`);
      }
    }
  }, 2000);
}, [setPipelineStatus, addError]);
```

**Also add import at top:**
```typescript
import { ApiError } from '@/lib/api/client';
```

#### Task 1.2: Export ApiError from Client

**File:** `src/lib/api/client.ts`

Ensure `ApiError` is exported (it already is, but verify):
```typescript
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
```

#### Task 1.3: Update Execution Panel UI for Errors

**File:** `src/components/execution/execution-panel.tsx`

Add error display in the status section:

```typescript
// Add to imports
import { AlertCircle, RefreshCw } from 'lucide-react';

// In the component, after status display:
{pipelineStatus?.error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Execution Error</AlertTitle>
    <AlertDescription className="flex items-center justify-between">
      <span>{pipelineStatus.error}</span>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          // Clear status and allow retry
          useExecutionStore.getState().clearStatus();
        }}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </AlertDescription>
  </Alert>
)}
```

#### Task 1.4: Add clearStatus to Execution Store

**File:** `src/lib/store/execution-store.ts`

Add to the store interface and implementation:
```typescript
interface ExecutionState {
  // ... existing fields ...
  clearStatus: () => void;
}

export const useExecutionStore = create<ExecutionState>()(
  devtools(
    (set) => ({
      // ... existing fields ...
      
      clearStatus: () => set({
        currentPipelineId: null,
        pipelineStatus: null,
        validationResult: null,
        errors: [],
      }),
    }),
    { name: 'execution-store' }
  )
);
```

---

### Phase 2: Server Health Detection (Low Effort - 1-2 hours)

**Goal:** Detect when backend is unavailable and show connection status.

#### Task 2.1: Create Health Check Hook

**New File:** `src/hooks/use-server-health.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

interface HealthStatus {
  isConnected: boolean;
  lastChecked: Date | null;
  error: string | null;
  serverInfo: {
    version: string;
    activePipelines: number;
  } | null;
}

export function useServerHealth(checkInterval = 30000) {
  const [health, setHealth] = useState<HealthStatus>({
    isConnected: true, // Assume connected initially
    lastChecked: null,
    error: null,
    serverInfo: null,
  });

  const checkHealth = useCallback(async () => {
    try {
      const response = await api.get<{
        status: string;
        version: string;
        active_pipelines: number;
      }>('/health');
      
      setHealth({
        isConnected: response.status === 'healthy',
        lastChecked: new Date(),
        error: null,
        serverInfo: {
          version: response.version,
          activePipelines: response.active_pipelines,
        },
      });
    } catch (error) {
      setHealth((prev) => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Server unavailable',
        serverInfo: null,
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();
    
    // Periodic checks
    const interval = setInterval(checkHealth, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return {
    ...health,
    refresh: checkHealth,
  };
}
```

#### Task 2.2: Create Connection Status Banner

**New File:** `src/components/layout/connection-banner.tsx`

```typescript
'use client';

import { useServerHealth } from '@/hooks/use-server-health';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConnectionBanner() {
  const { isConnected, error, refresh, lastChecked } = useServerHealth();

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          <strong>Backend Unavailable:</strong> {error || 'Cannot connect to server'}
          {lastChecked && (
            <span className="text-xs ml-2 opacity-70">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </span>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

#### Task 2.3: Add Banner to Layout

**File:** `src/app/layout.tsx`

```typescript
import { ConnectionBanner } from '@/components/layout/connection-banner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ConnectionBanner />
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

---

### Phase 3: Retry Logic with Exponential Backoff (Medium Effort - 2-3 hours)

**Goal:** Automatically retry failed requests with increasing delays.

#### Task 3.1: Create Retry Utility

**New File:** `src/lib/utils/retry.ts`

```typescript
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Helper to check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Don't retry 4xx client errors (except 429)
    if ('status' in error) {
      const status = (error as { status: number }).status;
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }
  }
  return true;
}
```

#### Task 3.2: Update API Client to Use Retry

**File:** `src/lib/api/client.ts`

```typescript
import { withRetry, isRetryableError } from '@/lib/utils/retry';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { retry?: boolean }
): Promise<T> {
  const { retry = true, ...fetchOptions } = options || {};
  
  const doFetch = async () => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, `API Error: ${response.statusText}`);
    }

    return response.json();
  };

  if (retry) {
    return withRetry(doFetch, {
      maxRetries: 3,
      shouldRetry: isRetryableError,
    });
  }
  
  return doFetch();
}

export const api = {
  get: <T>(endpoint: string, options?: { retry?: boolean }) => 
    fetchApi<T>(endpoint, options),
  post: <T>(endpoint: string, data: unknown, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
};
```

---

### Phase 4: Execution History UI (Medium Effort - 3-4 hours)

**Goal:** Show past pipeline executions.

#### Task 4.1: Create History Hook

**New File:** `src/hooks/use-pipeline-history.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { pipelinesApi } from '@/lib/api/pipelines';

export function usePipelineHistory(limit = 10) {
  return useQuery({
    queryKey: ['pipeline-history', limit],
    queryFn: () => pipelinesApi.getHistory(limit),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
```

#### Task 4.2: Add History API Method

**File:** `src/lib/api/pipelines.ts`

```typescript
export const pipelinesApi = {
  // ... existing methods ...
  
  getHistory: (limit: number = 10) =>
    api.get<{
      total: number;
      returned: number;
      pipelines: Array<{
        pipeline_id: string;
        pipeline: string;
        status: string;
        started_at: string;
        completed_at: string | null;
        stages: string[];
        progress: {
          total_stages: number;
          completed_stages: number;
          percent: number;
        };
      }>;
    }>(`/pipelines/history?limit=${limit}`),
};
```

#### Task 4.3: Create History Component

**New File:** `src/components/execution/execution-history.tsx`

```typescript
'use client';

import { usePipelineHistory } from '@/hooks/use-pipeline-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const statusConfig = {
  completed: { icon: CheckCircle, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  running: { icon: Clock, color: 'bg-blue-500', label: 'Running' },
  error: { icon: AlertCircle, color: 'bg-orange-500', label: 'Error' },
  cancelled: { icon: XCircle, color: 'bg-gray-500', label: 'Cancelled' },
};

export function ExecutionHistory() {
  const { data, isLoading, error } = usePipelineHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently fail if history not available
  }

  if (data.pipelines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No executions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.pipelines.map((pipeline) => {
            const config = statusConfig[pipeline.status as keyof typeof statusConfig] 
              || statusConfig.error;
            const Icon = config.icon;
            
            return (
              <div
                key={pipeline.pipeline_id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                  <div>
                    <div className="font-medium text-sm">
                      {pipeline.pipeline.charAt(0).toUpperCase() + pipeline.pipeline.slice(1)} Pipeline
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pipeline.stages.join(' → ')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(pipeline.started_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🧪 Testing

### Manual Testing Flow

1. **Start Backend:**
   ```bash
   cd ../GraphRAG
   source .venv/bin/activate
   python -m app.stages_api.server --port 8080
   ```

2. **Start Frontend:**
   ```bash
   cd StagesUI
   npm run dev
   ```

3. **Test Scenarios:**

   | Scenario | Steps | Expected Result |
   |----------|-------|-----------------|
   | Happy path | Select pipeline → stages → validate → execute | Shows progress, completes |
   | Server restart during polling | Execute → restart backend → wait | Shows "Pipeline not found" error |
   | Server down | Stop backend → try validate | Shows connection banner |
   | 404 handling | Execute → immediately restart backend | Polling stops, error shown |

### Browser DevTools Checks

```javascript
// Console should NOT show infinite 404 errors
// Network tab should show polling stops after 404

// Check execution store state
useExecutionStore.getState()
```

---

## 📝 Notes for Future Sessions

### Key Files Modified in This Session
1. `src/app/page.tsx` - Extracted StageConfigPanelWrapper for hooks fix
2. `src/components/execution/validation-results.tsx` - Added error formatting

### Files That Need Modification
1. `src/hooks/use-pipeline-execution.ts` - 404 handling
2. `src/lib/store/execution-store.ts` - Add clearStatus
3. `src/lib/api/client.ts` - Add retry logic
4. `src/components/execution/execution-panel.tsx` - Error display

### New Files to Create
1. `src/hooks/use-server-health.ts`
2. `src/components/layout/connection-banner.tsx`
3. `src/lib/utils/retry.ts`
4. `src/hooks/use-pipeline-history.ts`
5. `src/components/execution/execution-history.tsx`

### TypeScript Types to Consider

**File:** `src/types/api.ts`

Consider adding:
```typescript
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  version: string;
  timestamp: string;
  active_pipelines: number;
}

export interface PipelineHistoryResponse {
  total: number;
  returned: number;
  pipelines: PipelineHistoryItem[];
}

export interface PipelineHistoryItem {
  pipeline_id: string;
  pipeline: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  stages: string[];
  progress: {
    total_stages: number;
    completed_stages: number;
    percent: number;
  };
}
```

### Related Backend Document
See: `../GraphRAG/STAGES_API_IMPLEMENTATION_GUIDE.md`

### Development Server
- Frontend: `http://localhost:3001` (or 3000 if available)
- Backend: `http://localhost:8080`

---

**End of Document**

