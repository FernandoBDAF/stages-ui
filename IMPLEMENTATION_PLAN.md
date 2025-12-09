# Stages-UI Implementation Plan

**Version:** 1.1  
**Created:** December 9, 2025  
**Last Updated:** December 9, 2025  
**Status:** In Progress (Phase 1-2 Complete)  
**Reference:** [UI_DESIGN_SPECIFICATION.md](./UI_DESIGN_SPECIFICATION.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Implementation Phases](#4-implementation-phases)
5. [Core Components](#5-core-components)
6. [State Management](#6-state-management)
7. [API Integration](#7-api-integration)
8. [Custom Hooks](#8-custom-hooks)
9. [TypeScript Types](#9-typescript-types)
10. [Main Application](#10-main-application)
11. [Timeline & Deliverables](#11-timeline--deliverables)
12. [Best Practices Applied](#12-best-practices-applied)
13. [Alignment Review (UI Design Specification)](#13-alignment-review-ui-design-specification)

---

## 1. Overview

### 1.1 Purpose

This document outlines the implementation plan for the Stages-UI project—a minimalist, functional UI for configuring and executing GraphRAG and Ingestion pipelines.

### 1.2 Design Philosophy

- **Minimalist**: Clean interface with only essential elements
- **Functional**: Every element serves a clear purpose
- **Dynamic**: Forms generated from API schema, not hardcoded
- **Responsive**: Works on desktop and tablet screens
- **Type-Safe**: Full TypeScript coverage with strict mode

### 1.3 User Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Select    │ → │   Select    │ → │  Configure  │ → │   Execute   │
│  Pipeline   │    │   Stages    │    │   Stages    │    │  Pipeline   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
 GET /stages      Show stage list     GET /stages/     POST /pipelines/
                  with dependencies   {name}/config      execute
```

---

## 2. Technology Stack

### 2.1 Recommended Stack

Based on patterns from the rich-library-nextjs reference implementations:

| Layer | Technology | Reference Source | Rationale |
|-------|------------|------------------|-----------|
| **Framework** | Next.js 15+ (App Router) | ⭐⭐⭐ next-shadcn-admin-dashboard | Modern routing, server components |
| **UI Components** | shadcn/ui | ⭐⭐⭐ next-shadcn-admin-dashboard | Consistent, accessible, customizable |
| **Styling** | Tailwind CSS v4 | ⭐⭐⭐ next-shadcn-admin-dashboard | Utility-first, rapid development |
| **State Management** | Zustand | ⭐⭐⭐ shadcn-next-workflows | Lightweight, proven with complex flows |
| **Forms** | React Hook Form + Zod | ⭐⭐⭐ munia | Type-safe validation, dynamic forms |
| **Data Fetching** | TanStack Query (React Query) | ⭐⭐⭐ munia | Caching, polling, optimistic updates |
| **TypeScript** | Strict mode | All reference projects | Type safety across the stack |

### 2.2 Package Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0",
    "zod": "^3.0.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## 3. Project Structure

### 3.1 Directory Layout

Following the colocation architecture from reference implementations:

```
stages-ui/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── page.tsx                  # Main page (pipeline configuration)
│   │   ├── globals.css               # Global styles + Tailwind
│   │   └── providers.tsx             # React Query, Zustand providers
│   │
│   ├── components/                   # UI Components
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── collapsible.tsx
│   │   │   └── accordion.tsx
│   │   │
│   │   ├── pipeline/                 # Pipeline-specific components
│   │   │   ├── pipeline-selector.tsx
│   │   │   ├── stage-selector.tsx
│   │   │   ├── dependency-warning.tsx
│   │   │   └── pipeline-header.tsx
│   │   │
│   │   ├── config/                   # Configuration components
│   │   │   ├── stage-config-panel.tsx
│   │   │   ├── config-field.tsx
│   │   │   ├── category-section.tsx
│   │   │   └── field-renderer/
│   │   │       ├── text-field.tsx
│   │   │       ├── number-field.tsx
│   │   │       ├── slider-field.tsx
│   │   │       ├── checkbox-field.tsx
│   │   │       ├── select-field.tsx
│   │   │       └── multiselect-field.tsx
│   │   │
│   │   ├── execution/                # Execution components
│   │   │   ├── execution-panel.tsx
│   │   │   ├── validation-results.tsx
│   │   │   ├── status-monitor.tsx
│   │   │   └── progress-display.tsx
│   │   │
│   │   └── layout/                   # Layout components
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── api-status.tsx
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── use-stages.ts             # Stage fetching hook
│   │   ├── use-stage-config.ts       # Config schema hook
│   │   ├── use-pipeline-execution.ts # Execution hook
│   │   └── use-status-polling.ts     # Status polling hook
│   │
│   ├── lib/                          # Utilities
│   │   ├── api/                      # API client
│   │   │   ├── client.ts             # Base API client
│   │   │   ├── stages.ts             # Stage API calls
│   │   │   ├── pipelines.ts          # Pipeline API calls
│   │   │   └── types.ts              # API response types
│   │   │
│   │   ├── store/                    # Zustand stores
│   │   │   ├── pipeline-store.ts     # Pipeline state
│   │   │   ├── config-store.ts       # Configuration state
│   │   │   └── execution-store.ts    # Execution state
│   │   │
│   │   ├── validation/               # Validation utilities
│   │   │   ├── field-validator.ts
│   │   │   └── config-validator.ts
│   │   │
│   │   └── utils/                    # General utilities
│   │       ├── form-generator.ts     # Dynamic form generation
│   │       └── cn.ts                 # Tailwind class merger
│   │
│   └── types/                        # TypeScript types
│       ├── api.ts                    # API types
│       ├── pipeline.ts               # Pipeline types
│       ├── config.ts                 # Configuration types
│       └── ui.ts                     # UI types
│
├── public/
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.local
├── UI_DESIGN_SPECIFICATION.md
└── IMPLEMENTATION_PLAN.md
```

---

## 4. Implementation Phases

### Phase 1: Project Foundation (Day 1-2)

**Objective:** Set up the project with modern patterns from reference implementations.

#### 4.1.1 Initialize Project

```bash
npx create-next-app@latest stages-ui --typescript --tailwind --eslint --app --src-dir
cd stages-ui
```

#### 4.1.2 Install Dependencies

```bash
# Core dependencies
npm install zustand @tanstack/react-query react-hook-form @hookform/resolvers zod

# shadcn/ui setup
npx shadcn@latest init

# Add required shadcn components
npx shadcn@latest add button card checkbox input label select slider badge alert progress collapsible accordion radio-group form skeleton
```

#### 4.1.3 Configure `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

#### 4.1.4 Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

#### 4.1.5 Deliverables ✅

- [x] Project initialized with Next.js 16+
- [x] Tailwind CSS v4 configured
- [x] shadcn/ui components installed (15 components)
- [x] Core dependencies installed
- [x] Environment variables configured

**Files Created:**
- `stages-ui/package.json`
- `stages-ui/next.config.ts`
- `stages-ui/.env.local`
- `stages-ui/src/app/layout.tsx`
- `stages-ui/src/app/page.tsx`
- `stages-ui/src/app/globals.css`
- `stages-ui/src/components/ui/*.tsx` (15 shadcn components)
- `stages-ui/src/components/layout/header.tsx`
- `stages-ui/src/components/layout/footer.tsx`

---

### Phase 2: State Management & API Integration (Day 2-3)

**Objective:** Implement Zustand stores and API client following reference patterns.

#### 4.2.1 Set Up Providers

**File: `src/app/providers.tsx`**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 4.2.2 Deliverables ✅

- [x] TypeScript types defined
- [x] API client implemented
- [x] Zustand stores created
- [x] Providers configured

**Files Created:**
- `stages-ui/src/types/api.ts`
- `stages-ui/src/lib/api/client.ts`
- `stages-ui/src/lib/api/stages.ts`
- `stages-ui/src/lib/api/pipelines.ts`
- `stages-ui/src/lib/store/pipeline-store.ts`
- `stages-ui/src/lib/store/config-store.ts`
- `stages-ui/src/lib/store/execution-store.ts`
- `stages-ui/src/lib/utils/cn.ts`
- `stages-ui/src/app/providers.tsx`

---

### Phase 3: Core Components (Day 3-4)

**Objective:** Build reusable components following reference patterns.

#### 4.3.1 Deliverables

- [ ] Pipeline Selector component (`src/components/pipeline/pipeline-selector.tsx`)
- [ ] Stage Selector component (`src/components/pipeline/stage-selector.tsx`)
- [ ] Stage Config Panel component (`src/components/config/stage-config-panel.tsx`)
- [ ] Category Section component (`src/components/config/category-section.tsx`) *[Gap: needs implementation]*
- [ ] Config Field component (`src/components/config/config-field.tsx`)
- [ ] Field renderers: text, number, slider, checkbox, select, **multiselect** *[Gap: multiselect added]*

---

### Phase 4: Execution Panel (Day 4-5)

**Objective:** Implement validation, execution, and status monitoring.

#### 4.4.1 Deliverables

- [ ] Execution Panel component (`src/components/execution/execution-panel.tsx`)
- [ ] Validation Results component (`src/components/execution/validation-results.tsx`) *[Must include execution plan preview with arrows]*
- [ ] Status Monitor component (`src/components/execution/status-monitor.tsx`) *[Includes progress display]*

---

### Phase 5: Custom Hooks (Day 5)

**Objective:** Create reusable hooks for data fetching and business logic.

#### 4.5.1 Deliverables

- [ ] useStages hook (`src/hooks/use-stages.ts`)
- [ ] useStageConfig hook (`src/hooks/use-stage-config.ts`)
- [ ] usePipelineExecution hook (`src/hooks/use-pipeline-execution.ts`) *[Includes status polling internally]*

---

### Phase 6: Main Page Assembly (Day 5-6)

**Objective:** Assemble all components into the main application.

#### 4.6.1 Deliverables

- [ ] Main page layout
- [ ] Component integration
- [ ] Loading states
- [ ] Error handling

---

### Phase 7: Polish & Testing (Day 6-7)

**Objective:** Final polish and testing.

#### 4.7.1 Deliverables

- [ ] Responsive design verified (desktop, tablet, mobile)
- [ ] Accessibility audit (ARIA labels, keyboard navigation)
- [ ] Error boundaries for graceful error handling
- [ ] Loading skeletons for all async operations
- [ ] Inline field validation errors (red border + message) *[Gap from UI spec Section 9.2]*
- [ ] Loading/disabled states for selectors *[Gap from UI spec Section 7.1]*
- [ ] Final styling adjustments

---

## 5. Core Components

### 5.1 Pipeline Selector

**File: `src/components/pipeline/pipeline-selector.tsx`**

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import type { Pipeline, PipelineType } from '@/types/api';

interface PipelineSelectorProps {
  pipelines: Record<string, Pipeline>;
}

export function PipelineSelector({ pipelines }: PipelineSelectorProps) {
  const { selectedPipeline, selectPipeline } = usePipelineStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Pipeline</CardTitle>
        <CardDescription>
          Choose the pipeline type to configure and execute
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedPipeline || ''}
          onValueChange={(value) => selectPipeline(value as PipelineType)}
          className="grid gap-4 md:grid-cols-2"
        >
          {Object.entries(pipelines).map(([key, pipeline]) => (
            <Label
              key={key}
              htmlFor={key}
              className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent ${
                selectedPipeline === key
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <RadioGroupItem value={key} id={key} className="mt-1" />
              <div className="space-y-1">
                <p className="font-medium leading-none">{pipeline.name}</p>
                <p className="text-sm text-muted-foreground">
                  {pipeline.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pipeline.stage_count} stages available
                </p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
```

---

### 5.2 Stage Selector

**File: `src/components/pipeline/stage-selector.tsx`**

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import type { Stage } from '@/types/api';

interface StageSelectorProps {
  stages: Stage[];
}

export function StageSelector({ stages }: StageSelectorProps) {
  const { selectedStages, toggleStage, stages: allStages } = usePipelineStore();

  // Find missing dependencies
  const missingDependencies = selectedStages.flatMap((stageName) => {
    const stage = allStages[stageName];
    if (!stage?.dependencies) return [];
    return stage.dependencies.filter((dep) => !selectedStages.includes(dep));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Stages</CardTitle>
        <CardDescription>
          Choose which stages to include in the pipeline execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {stages.map((stage) => (
            <Label
              key={stage.name}
              htmlFor={stage.name}
              className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-accent ${
                selectedStages.includes(stage.name)
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <Checkbox
                id={stage.name}
                checked={selectedStages.includes(stage.name)}
                onCheckedChange={() => toggleStage(stage.name)}
                className="mt-0.5"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{stage.display_name}</span>
                  {stage.has_llm && (
                    <Badge variant="secondary" className="text-xs">
                      LLM
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {stage.description}
                </p>
                {stage.dependencies.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Requires: {stage.dependencies.join(', ')}
                  </p>
                )}
              </div>
            </Label>
          ))}
        </div>

        {missingDependencies.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Missing dependencies will be auto-included:{' '}
              {missingDependencies.join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 5.3 Stage Config Panel

**File: `src/components/config/stage-config-panel.tsx`**

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { CategorySection } from './category-section';
import { useConfigStore } from '@/lib/store/config-store';
import type { StageConfigSchema } from '@/types/api';
import { cn } from '@/lib/utils/cn';

interface StageConfigPanelProps {
  stageName: string;
  schema: StageConfigSchema;
}

export function StageConfigPanel({ stageName, schema }: StageConfigPanelProps) {
  const { expandedPanels, togglePanel, resetStageConfig, configs } = useConfigStore();
  const isExpanded = expandedPanels.includes(stageName);
  const config = configs[stageName] || {};

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={() => togglePanel(stageName)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
                <CardTitle className="text-base">{schema.stage_name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {schema.field_count} fields
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetStageConfig(stageName);
                  }}
                  title="Reset to defaults"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {schema.categories.map((category) => (
              <CategorySection
                key={category.name}
                category={category}
                fields={schema.fields.filter((f) =>
                  category.fields.includes(f.name)
                )}
                stageName={stageName}
                values={config}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

---

### 5.4 Config Field

**File: `src/components/config/config-field.tsx`**

```typescript
'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useConfigStore } from '@/lib/store/config-store';
import type { ConfigField as ConfigFieldType } from '@/types/api';

interface ConfigFieldProps {
  field: ConfigFieldType;
  stageName: string;
  value: unknown;
}

export function ConfigField({ field, stageName, value }: ConfigFieldProps) {
  const { setFieldValue } = useConfigStore();

  const handleChange = (newValue: unknown) => {
    setFieldValue(stageName, field.name, newValue);
  };

  const renderInput = () => {
    switch (field.ui_type) {
      case 'checkbox':
        return (
          <Checkbox
            id={`${stageName}-${field.name}`}
            checked={Boolean(value)}
            onCheckedChange={handleChange}
          />
        );

      case 'slider':
        return (
          <div className="flex items-center gap-4">
            <Slider
              id={`${stageName}-${field.name}`}
              value={[Number(value) || field.min || 0]}
              onValueChange={([v]) => handleChange(v)}
              min={field.min ?? 0}
              max={field.max ?? 1}
              step={field.step ?? 0.1}
              className="flex-1"
            />
            <span className="text-sm font-mono w-12 text-right">
              {Number(value)?.toFixed(2) || field.default}
            </span>
          </div>
        );

      case 'select':
        return (
          <Select
            value={String(value ?? '')}
            onValueChange={handleChange}
          >
            <SelectTrigger id={`${stageName}-${field.name}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                  {option === field.recommended && ' ★'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            id={`${stageName}-${field.name}`}
            type="number"
            value={value as string | number ?? ''}
            onChange={(e) => handleChange(e.target.valueAsNumber || null)}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
          />
        );

      case 'text':
      default:
        return (
          <Input
            id={`${stageName}-${field.name}`}
            type="text"
            value={String(value ?? '')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`${stageName}-${field.name}`}
          className="text-sm font-medium"
        >
          {field.name}
        </Label>
        <Badge variant="outline" className="text-xs">
          {field.type}
        </Badge>
        {field.required && (
          <span className="text-destructive text-xs">*</span>
        )}
      </div>
      {renderInput()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
```

---

### 5.5 Execution Panel

**File: `src/components/execution/execution-panel.tsx`**

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidationResults } from './validation-results';
import { StatusMonitor } from './status-monitor';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useExecutionStore } from '@/lib/store/execution-store';
import { usePipelineExecution } from '@/hooks/use-pipeline-execution';
import { Play, CheckCircle, Loader2 } from 'lucide-react';

export function ExecutionPanel() {
  const { selectedPipeline, selectedStages } = usePipelineStore();
  const { configs } = useConfigStore();
  const {
    validationResult,
    validationLoading,
    executionLoading,
    currentPipelineId,
    pipelineStatus,
  } = useExecutionStore();

  const { validate, execute, cancel } = usePipelineExecution();

  const canValidate = selectedPipeline && selectedStages.length > 0;
  const canExecute = validationResult?.valid && !executionLoading;
  const isRunning = ['starting', 'running'].includes(pipelineStatus?.status || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution</CardTitle>
        <CardDescription>
          Validate configuration and execute the pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => validate()}
            disabled={!canValidate || validationLoading}
          >
            {validationLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Validate Configuration
          </Button>

          <Button
            onClick={() => execute()}
            disabled={!canExecute}
          >
            {executionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Execute Pipeline
          </Button>

          {isRunning && (
            <Button variant="destructive" onClick={() => cancel()}>
              Cancel
            </Button>
          )}
        </div>

        {validationResult && <ValidationResults result={validationResult} />}

        {currentPipelineId && pipelineStatus && (
          <StatusMonitor
            pipelineId={currentPipelineId}
            status={pipelineStatus}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 5.6 Status Monitor

**File: `src/components/execution/status-monitor.tsx`**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import type { PipelineStatus } from '@/types/api';

interface StatusMonitorProps {
  pipelineId: string;
  status: PipelineStatus;
}

const statusConfig = {
  starting: { icon: Loader2, color: 'bg-blue-500', text: 'Starting...' },
  running: { icon: Loader2, color: 'bg-blue-500', text: 'Running' },
  completed: { icon: CheckCircle, color: 'bg-green-500', text: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500', text: 'Failed' },
  error: { icon: XCircle, color: 'bg-red-500', text: 'Error' },
  cancelled: { icon: XCircle, color: 'bg-yellow-500', text: 'Cancelled' },
};

export function StatusMonitor({ pipelineId, status }: StatusMonitorProps) {
  const config = statusConfig[status.status];
  const Icon = config.icon;
  const isAnimated = ['starting', 'running'].includes(status.status);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <Icon
            className={`h-4 w-4 ${isAnimated ? 'animate-spin' : ''}`}
          />
          <span className="font-medium">{config.text}</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {pipelineId}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Current Stage: {status.current_stage || 'N/A'}
          </span>
          <span className="text-muted-foreground">
            {status.progress.completed_stages}/{status.progress.total_stages}
          </span>
        </div>
        <Progress value={status.progress.percent} />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Elapsed: {status.elapsed_seconds}s</span>
      </div>

      {status.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

## 6. State Management

### 6.1 Pipeline Store

**File: `src/lib/store/pipeline-store.ts`**

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Pipeline, Stage, PipelineType } from '@/types/api';

interface PipelineState {
  // Data
  pipelines: Record<string, Pipeline>;
  stages: Record<string, Stage>;
  
  // Selection
  selectedPipeline: PipelineType | null;
  selectedStages: string[];
  
  // Actions
  setPipelines: (pipelines: Record<string, Pipeline>) => void;
  setStages: (stages: Record<string, Stage>) => void;
  selectPipeline: (pipeline: PipelineType) => void;
  toggleStage: (stageName: string) => void;
  setSelectedStages: (stages: string[]) => void;
  clearSelection: () => void;
}

export const usePipelineStore = create<PipelineState>()(
  devtools(
    (set, get) => ({
      pipelines: {},
      stages: {},
      selectedPipeline: null,
      selectedStages: [],

      setPipelines: (pipelines) => set({ pipelines }),
      setStages: (stages) => set({ stages }),

      selectPipeline: (pipeline) => {
        set({ 
          selectedPipeline: pipeline,
          selectedStages: [] 
        });
      },

      toggleStage: (stageName) => {
        const { selectedStages, stages } = get();
        const isSelected = selectedStages.includes(stageName);
        
        if (isSelected) {
          set({ selectedStages: selectedStages.filter((s) => s !== stageName) });
        } else {
          // Auto-add dependencies
          const stage = stages[stageName];
          const newStages = new Set([...selectedStages, stageName]);
          
          if (stage?.dependencies) {
            stage.dependencies.forEach((dep) => newStages.add(dep));
          }
          
          set({ selectedStages: Array.from(newStages) });
        }
      },

      setSelectedStages: (stages) => set({ selectedStages: stages }),
      
      clearSelection: () => set({ 
        selectedPipeline: null, 
        selectedStages: [] 
      }),
    }),
    { name: 'pipeline-store' }
  )
);
```

---

### 6.2 Config Store

**File: `src/lib/store/config-store.ts`**

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StageConfigSchema } from '@/types/api';

interface ConfigState {
  // Schemas (cached)
  schemas: Record<string, StageConfigSchema>;
  defaults: Record<string, Record<string, unknown>>;
  
  // User configurations
  configs: Record<string, Record<string, unknown>>;
  
  // UI state
  expandedPanels: string[];
  
  // Actions
  setSchema: (stageName: string, schema: StageConfigSchema) => void;
  setDefaults: (stageName: string, defaults: Record<string, unknown>) => void;
  setFieldValue: (stageName: string, fieldName: string, value: unknown) => void;
  resetStageConfig: (stageName: string) => void;
  togglePanel: (stageName: string) => void;
  clearConfigs: () => void;
}

export const useConfigStore = create<ConfigState>()(
  devtools(
    (set, get) => ({
      schemas: {},
      defaults: {},
      configs: {},
      expandedPanels: [],

      setSchema: (stageName, schema) => {
        set((state) => ({
          schemas: { ...state.schemas, [stageName]: schema },
        }));
      },

      setDefaults: (stageName, defaults) => {
        set((state) => ({
          defaults: { ...state.defaults, [stageName]: defaults },
          // Initialize config with defaults if not set
          configs: {
            ...state.configs,
            [stageName]: state.configs[stageName] || { ...defaults },
          },
        }));
      },

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
      },

      resetStageConfig: (stageName) => {
        const { defaults } = get();
        set((state) => ({
          configs: {
            ...state.configs,
            [stageName]: { ...defaults[stageName] },
          },
        }));
      },

      togglePanel: (stageName) => {
        set((state) => ({
          expandedPanels: state.expandedPanels.includes(stageName)
            ? state.expandedPanels.filter((p) => p !== stageName)
            : [...state.expandedPanels, stageName],
        }));
      },

      clearConfigs: () => set({ configs: {}, expandedPanels: [] }),
    }),
    { name: 'config-store' }
  )
);
```

---

### 6.3 Execution Store

**File: `src/lib/store/execution-store.ts`**

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ValidationResult, PipelineStatus } from '@/types/api';

interface ExecutionState {
  // Validation
  validationResult: ValidationResult | null;
  validationLoading: boolean;
  
  // Execution
  currentPipelineId: string | null;
  pipelineStatus: PipelineStatus | null;
  executionLoading: boolean;
  
  // Errors
  errors: string[];
  
  // Actions
  setValidationResult: (result: ValidationResult | null) => void;
  setValidationLoading: (loading: boolean) => void;
  setPipelineId: (id: string | null) => void;
  setPipelineStatus: (status: PipelineStatus | null) => void;
  setExecutionLoading: (loading: boolean) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>()(
  devtools(
    (set) => ({
      validationResult: null,
      validationLoading: false,
      currentPipelineId: null,
      pipelineStatus: null,
      executionLoading: false,
      errors: [],

      setValidationResult: (result) => set({ validationResult: result }),
      setValidationLoading: (loading) => set({ validationLoading: loading }),
      setPipelineId: (id) => set({ currentPipelineId: id }),
      setPipelineStatus: (status) => set({ pipelineStatus: status }),
      setExecutionLoading: (loading) => set({ executionLoading: loading }),
      addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
      clearErrors: () => set({ errors: [] }),
      reset: () =>
        set({
          validationResult: null,
          validationLoading: false,
          currentPipelineId: null,
          pipelineStatus: null,
          executionLoading: false,
          errors: [],
        }),
    }),
    { name: 'execution-store' }
  )
);
```

---

## 7. API Integration

### 7.1 Base API Client

**File: `src/lib/api/client.ts`**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

---

### 7.2 Stages API

**File: `src/lib/api/stages.ts`**

```typescript
import { api } from './client';
import type { StagesResponse, StageConfigSchema } from '@/types/api';

export const stagesApi = {
  listStages: () => api.get<StagesResponse>('/stages'),
  
  listPipelineStages: (pipeline: string) =>
    api.get<StagesResponse>(`/stages/${pipeline}`),
  
  getStageConfig: (stageName: string) =>
    api.get<StageConfigSchema>(`/stages/${stageName}/config`),
  
  getStageDefaults: (stageName: string) =>
    api.get<Record<string, unknown>>(`/stages/${stageName}/defaults`),
};
```

---

### 7.3 Pipelines API

**File: `src/lib/api/pipelines.ts`**

```typescript
import { api } from './client';
import type { ValidationResult, ExecutionResult, PipelineStatus } from '@/types/api';

export const pipelinesApi = {
  validate: (
    pipeline: string,
    stages: string[],
    config: Record<string, Record<string, unknown>>
  ) =>
    api.post<ValidationResult>('/pipelines/validate', {
      pipeline,
      stages,
      config,
    }),

  execute: (
    pipeline: string,
    stages: string[],
    config: Record<string, Record<string, unknown>>,
    metadata?: Record<string, unknown>
  ) =>
    api.post<ExecutionResult>('/pipelines/execute', {
      pipeline,
      stages,
      config,
      metadata,
    }),

  getStatus: (pipelineId: string) =>
    api.get<PipelineStatus>(`/pipelines/${pipelineId}/status`),

  cancel: (pipelineId: string) =>
    api.post<{ success: boolean }>(`/pipelines/${pipelineId}/cancel`, {}),
};
```

---

## 8. Custom Hooks

### 8.1 useStages Hook

**File: `src/hooks/use-stages.ts`**

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

---

### 8.2 useStageConfig Hook

**File: `src/hooks/use-stage-config.ts`**

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

---

### 8.3 usePipelineExecution Hook

**File: `src/hooks/use-pipeline-execution.ts`**

```typescript
import { useCallback, useEffect, useRef } from 'react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useExecutionStore } from '@/lib/store/execution-store';
import { pipelinesApi } from '@/lib/api/pipelines';

export function usePipelineExecution() {
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

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const validate = useCallback(async () => {
    if (!selectedPipeline) return;

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

  return { validate, execute, cancel };
}
```

---

## 9. TypeScript Types

### 9.1 API Types

**File: `src/types/api.ts`**

```typescript
// Pipeline types
export type PipelineType = 'graphrag' | 'ingestion';

export interface Pipeline {
  name: string;
  description: string;
  stages: string[];
  stage_count: number;
}

export interface Stage {
  name: string;
  display_name: string;
  description: string;
  pipeline: string;
  config_class: string;
  dependencies: string[];
  has_llm: boolean;
}

// Config schema types
export interface ConfigField {
  name: string;
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array';
  python_type: string;
  default: unknown;
  required: boolean;
  optional: boolean;
  description: string;
  category: string;
  ui_type: 'text' | 'number' | 'slider' | 'checkbox' | 'select' | 'multiselect';
  is_inherited: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  placeholder?: string;
  recommended?: unknown;
}

export interface Category {
  name: string;
  fields: string[];
  field_count: number;
}

export interface StageConfigSchema {
  stage_name: string;
  config_class: string;
  description: string;
  fields: ConfigField[];
  categories: Category[];
  field_count: number;
}

// Response types
export interface StagesResponse {
  pipelines: Record<string, Pipeline>;
  stages: Record<string, Stage>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  warnings: string[];
  execution_plan?: {
    stages: string[];
    resolved_dependencies: string[];
  };
}

export interface ExecutionResult {
  pipeline_id: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface PipelineStatus {
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

## 10. Main Application

### 10.1 Root Layout

**File: `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stages API Configuration',
  description: 'Configure and execute GraphRAG and Ingestion pipelines',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 container py-6">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

---

### 10.2 Main Page

**File: `src/app/page.tsx`**

```typescript
'use client';

import { useStages } from '@/hooks/use-stages';
import { useStageConfig } from '@/hooks/use-stage-config';
import { PipelineSelector } from '@/components/pipeline/pipeline-selector';
import { StageSelector } from '@/components/pipeline/stage-selector';
import { StageConfigPanel } from '@/components/config/stage-config-panel';
import { ExecutionPanel } from '@/components/execution/execution-panel';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { Skeleton } from '@/components/ui/skeleton';

function StageConfigPanels({ stageNames }: { stageNames: string[] }) {
  const { schemas } = useConfigStore();

  return (
    <div className="space-y-4">
      {stageNames.map((stageName) => {
        // Fetch config for each selected stage
        useStageConfig(stageName);
        const schema = schemas[stageName];

        if (!schema) {
          return (
            <Skeleton key={stageName} className="h-32 w-full" />
          );
        }

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

export default function HomePage() {
  const { data, isLoading, error } = useStages();
  const { selectedPipeline, selectedStages, stages } = usePipelineStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-destructive">
          Failed to load stages
        </h2>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!data) return null;

  // Get stages for selected pipeline
  const pipelineStages = selectedPipeline
    ? Object.values(stages).filter((s) => s.pipeline === selectedPipeline)
    : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Pipeline Configuration</h1>
        <p className="text-muted-foreground">
          Configure and execute GraphRAG and Ingestion pipelines
        </p>
      </div>

      <PipelineSelector pipelines={data.pipelines} />

      {selectedPipeline && (
        <StageSelector stages={pipelineStages} />
      )}

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
        <ExecutionPanel />
      )}
    </div>
  );
}
```

---

## 11. Timeline & Deliverables

### 11.1 Implementation Timeline

| Phase | Duration | Days | Status |
|-------|----------|------|--------|
| **Phase 1: Foundation** | Day 1-2 | 2 days | ✅ Complete |
| **Phase 2: State & API** | Day 2-3 | 2 days | ✅ Complete |
| **Phase 3: Core Components** | Day 3-4 | 2 days | ⬜ Pending |
| **Phase 4: Execution** | Day 4-5 | 1.5 days | ⬜ Pending |
| **Phase 5: Hooks** | Day 5 | 0.5 days | ⬜ Pending |
| **Phase 6: Assembly** | Day 5-6 | 1 day | ⬜ Pending |
| **Phase 7: Polish** | Day 6-7 | 1 day | ⬜ Pending |

**Total Estimated Duration:** 7 days

---

### 11.2 Deliverables Checklist

#### Phase 1: Foundation ✅
- [x] Project initialized with Next.js 16+ (App Router, TypeScript, Tailwind)
- [x] Tailwind CSS v4 configured
- [x] shadcn/ui components installed (15 components)
- [x] Core dependencies installed (Zustand, TanStack Query, React Hook Form, Zod)
- [x] Environment variables configured (`.env.local`)
- [x] Root layout created with providers
- [x] Basic header/footer layout components

#### Phase 2: State & API ✅
- [x] TypeScript types defined (`src/types/api.ts`)
- [x] API client implemented (`src/lib/api/client.ts`)
- [x] Stages API module (`src/lib/api/stages.ts`)
- [x] Pipelines API module (`src/lib/api/pipelines.ts`)
- [x] Pipeline store (`src/lib/store/pipeline-store.ts`)
- [x] Config store (`src/lib/store/config-store.ts`)
- [x] Execution store (`src/lib/store/execution-store.ts`)
- [x] Utility functions (`src/lib/utils/cn.ts`)

#### Phase 3: Core Components
- [ ] Pipeline Selector component
- [ ] Stage Selector component  
- [ ] Stage Config Panel component
- [ ] Category Section component *(gap identified - needs implementation)*
- [ ] Config Field component
- [ ] All field renderers (text, number, slider, checkbox, select, **multiselect**) *(multiselect was missing)*

#### Phase 4: Execution
- [ ] Execution Panel component
- [ ] Validation Results component *(needs execution plan preview with arrows)*
- [ ] Status Monitor component *(includes progress display)*

#### Phase 5: Hooks
- [ ] useStages hook
- [ ] useStageConfig hook
- [ ] usePipelineExecution hook *(includes status polling)*

#### Phase 6: Assembly
- [ ] Main page implementation
- [ ] Component integration
- [ ] Data flow verification

#### Phase 7: Polish
- [ ] Loading states (skeletons)
- [ ] Error handling (inline field errors)
- [ ] Responsive design
- [ ] Accessibility audit
- [ ] Final styling
- [ ] Loading/disabled states for selectors

---

## 12. Best Practices Applied

### 12.1 Patterns from Reference Implementations

| Pattern | Source | Application |
|---------|--------|-------------|
| **Colocation Architecture** | ⭐⭐⭐ next-shadcn-admin-dashboard | Components organized by feature domain |
| **Zustand State Management** | ⭐⭐⭐ shadcn-next-workflows | Lightweight stores with devtools |
| **shadcn/ui Components** | ⭐⭐⭐ next-shadcn-admin-dashboard | Consistent, accessible UI |
| **TanStack Query** | ⭐⭐⭐ munia | Caching, polling, data fetching |
| **TypeScript Strict Mode** | All reference projects | Full type safety |
| **Custom Hooks** | ⭐⭐⭐ munia | Reusable data fetching logic |

---

### 12.2 Code Quality Standards

- **TypeScript Strict Mode:** All types explicitly defined
- **Component Composition:** Small, focused components
- **Single Responsibility:** Each module has one purpose
- **DRY Principle:** Shared utilities and hooks
- **Error Boundaries:** Graceful error handling
- **Accessibility:** ARIA labels, keyboard navigation

---

### 12.3 Anti-Patterns Avoided

Based on the rich-library-nextjs anti-pattern documentation:

| Anti-Pattern | Avoided By |
|--------------|------------|
| Prop drilling | Using Zustand stores |
| Inline styles | Using Tailwind CSS utilities |
| Mixed concerns | Separating API, state, and UI |
| Untyped API responses | Full TypeScript coverage |
| Missing loading states | Skeleton components |
| Missing error handling | Error boundaries and try-catch |

---

## 13. Alignment Review (UI Design Specification)

### 13.1 Review Summary

A cross-reference review between this Implementation Plan and the [UI_DESIGN_SPECIFICATION.md](./UI_DESIGN_SPECIFICATION.md) was conducted to ensure alignment.

### 13.2 Alignment Status

| Area | Implementation Plan | UI Design Spec | Status |
|------|---------------------|----------------|--------|
| **PipelineSelector** | Radio buttons with name, description, stage count | Same structure | ✅ Aligned |
| **StageSelector** | Checkboxes with LLM badge, dependencies, warnings | Same structure | ✅ Aligned |
| **StageConfigPanel** | Collapsible with categories, reset button | Same structure | ✅ Aligned |
| **ConfigField** | 5 ui_types implemented | 6 ui_types defined | ⚠️ Gap |
| **ExecutionPanel** | Validate → Execute → Status | Same flow | ✅ Aligned |
| **State Management** | 3 Zustand stores | Same schema | ✅ Aligned |

### 13.3 Identified Gaps (Resolved in Plan)

| Gap | UI Spec Reference | Resolution |
|-----|-------------------|------------|
| **Missing CategorySection** | Section 7.3 | Added to Phase 3 deliverables |
| **Missing ValidationResults code** | Section 7.5 | Added to Phase 4 with execution plan preview |
| **Missing multiselect ui_type** | Section 7.4 | Added to Phase 3 field renderers |
| **Missing field validation display** | Section 9.2 | Added to Phase 7 polish |
| **ProgressDisplay merged into StatusMonitor** | Section 7.5 | Clarified in Phase 4 |
| **Loading states for selectors** | Section 7.1 | Added to Phase 7 polish |

### 13.4 Key Implementation Notes

1. **CategorySection Component**: Simple wrapper that renders category header + field grid. Code example not in original plan but straightforward to implement.

2. **ValidationResults Component**: Must include:
   - Success/error status with icon
   - Warnings list
   - **Execution plan preview** with stage order arrows (e.g., `stage1 → stage2 → stage3`)

3. **ConfigField multiselect**: Renders as array of checkboxes for multi-value selection (see UI spec Section 8.2).

4. **useStatusPolling**: Integrated into `usePipelineExecution` hook (lines 1418-1440 of original plan). No separate hook needed.

5. **Inline Field Errors**: UI spec Section 9.2 shows red border + error message below field. Add to ConfigField in Phase 7.

---

## Quick Reference

### API Endpoints Used

| Endpoint | When Called | Purpose |
|----------|-------------|---------|
| `GET /stages` | Page load | Get all pipelines and stages |
| `GET /stages/{name}/config` | Stage selected | Get config schema for form |
| `GET /stages/{name}/defaults` | Stage selected | Get default values |
| `POST /pipelines/validate` | Validate clicked | Validate configuration |
| `POST /pipelines/execute` | Execute clicked | Start pipeline |
| `GET /pipelines/{id}/status` | Polling | Get execution status |
| `POST /pipelines/{id}/cancel` | Cancel clicked | Cancel running pipeline |

---

### Component Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| `PipelineSelector` | `components/pipeline/` | Select pipeline type |
| `StageSelector` | `components/pipeline/` | Select stages to run |
| `StageConfigPanel` | `components/config/` | Configure stage options |
| `ConfigField` | `components/config/` | Render individual fields |
| `ExecutionPanel` | `components/execution/` | Validate and execute |
| `StatusMonitor` | `components/execution/` | Show execution progress |

---

### Store Quick Reference

| Store | Purpose | Key Actions |
|-------|---------|-------------|
| `usePipelineStore` | Pipeline & stage selection | `selectPipeline`, `toggleStage` |
| `useConfigStore` | Stage configurations | `setFieldValue`, `resetStageConfig` |
| `useExecutionStore` | Validation & execution state | `setValidationResult`, `setPipelineStatus` |

---

**End of Implementation Plan**

---

## Document Metadata

**Type:** Implementation Plan  
**Status:** In Progress  
**Created:** December 9, 2025  
**Last Updated:** December 9, 2025  
**Version:** 1.1  
**Reference:** UI_DESIGN_SPECIFICATION.md  
**Methodology:** Based on rich-library-nextjs reference implementations

### Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 9, 2025 | Initial implementation plan |
| 1.1 | Dec 9, 2025 | Phase 1-2 completed; Added Section 13 (Alignment Review); Updated deliverables with gap resolutions |

