# Phase 7: Polish Implementation Guide

**Version:** 1.0  
**Created:** December 9, 2025  
**Status:** Ready for Implementation  
**Prerequisite:** Phases 1-6 Complete  
**Estimated Duration:** 2-3 hours

---

## Table of Contents

1. [Overview](#1-overview)
2. [Implementation Items](#2-implementation-items)
3. [Item 1: Inline Field Validation Errors](#3-item-1-inline-field-validation-errors)
4. [Item 2: Loading/Disabled States for Selectors](#4-item-2-loadingdisabled-states-for-selectors)
5. [Item 3: Error Boundaries](#5-item-3-error-boundaries)
6. [Implementation Checklist](#6-implementation-checklist)
7. [Testing Guide](#7-testing-guide)

---

## 1. Overview

### 1.1 Purpose

This document provides detailed implementation specifications for Phase 7 (Polish) of the Stages-UI project. These enhancements improve user experience by providing better feedback for validation errors, clearer loading states, and graceful error handling.

### 1.2 Scope

| Item | Description | Files Affected |
|------|-------------|----------------|
| **Inline Field Validation** | Red borders and error messages below invalid fields | `config-field.tsx`, `config-store.ts`, `validation-results.tsx` |
| **Loading/Disabled States** | Visual feedback during data fetching | `pipeline-selector.tsx`, `stage-selector.tsx` |
| **Error Boundaries** | Graceful error handling at component level | New: `error-boundary.tsx`, `layout.tsx`, `page.tsx` |

### 1.3 Reference

- [UI Design Specification](./UI_DESIGN_SPECIFICATION.md) - Section 9.2 (Validation & Error Handling)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Section 13.3 (Identified Gaps)

---

## 2. Implementation Items

### Summary

| # | Item | Priority | Complexity | Est. Time |
|---|------|----------|------------|-----------|
| 1 | Inline Field Validation Errors | High | Medium | 45 min |
| 2 | Loading/Disabled States | Medium | Low | 30 min |
| 3 | Error Boundaries | High | Medium | 45 min |

**Total Estimated Time:** ~2 hours

---

## 3. Item 1: Inline Field Validation Errors

### 3.1 Objective

Display validation errors directly below the field that has the error, with a red border around the input and an error message.

### 3.2 UI Design (from UI Spec Section 9.2)

```
┌─────────────────────────────────────┐
│  Temperature                        │
│  ┌─────────────────────────────────┐│
│  │ 2.5                         [!] ││  ← Red border
│  └─────────────────────────────────┘│
│  ✕ Temperature must be between 0-2  │  ← Red error message
└─────────────────────────────────────┘
```

### 3.3 Implementation Steps

#### Step 1: Update Config Store to Track Field Errors

**File:** `src/lib/store/config-store.ts`

Add field errors tracking to the config store:

```typescript
// Add to ConfigState interface
interface ConfigState {
  // ... existing fields ...
  
  // Field-level validation errors
  fieldErrors: Record<string, Record<string, string>>; // { stageName: { fieldName: errorMessage } }
  
  // Actions
  setFieldError: (stageName: string, fieldName: string, error: string | null) => void;
  clearFieldErrors: (stageName: string) => void;
  clearAllFieldErrors: () => void;
}

// Add to store implementation
export const useConfigStore = create<ConfigState>()(
  devtools(
    (set, get) => ({
      // ... existing state ...
      fieldErrors: {},

      setFieldError: (stageName, fieldName, error) => {
        set((state) => {
          const stageErrors = { ...state.fieldErrors[stageName] };
          if (error) {
            stageErrors[fieldName] = error;
          } else {
            delete stageErrors[fieldName];
          }
          return {
            fieldErrors: {
              ...state.fieldErrors,
              [stageName]: stageErrors,
            },
          };
        });
      },

      clearFieldErrors: (stageName) => {
        set((state) => {
          const { [stageName]: _, ...rest } = state.fieldErrors;
          return { fieldErrors: rest };
        });
      },

      clearAllFieldErrors: () => set({ fieldErrors: {} }),
    }),
    { name: 'config-store' }
  )
);
```

#### Step 2: Create Field Validation Utility

**File:** `src/lib/validation/field-validator.ts` (new file)

```typescript
import type { ConfigField } from '@/types/api';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateField(field: ConfigField, value: unknown): string | null {
  // Required check
  if (field.required && (value === null || value === undefined || value === '')) {
    return `${field.name} is required`;
  }

  // Skip further validation if empty and optional
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Type validation
  switch (field.type) {
    case 'integer':
      if (!Number.isInteger(Number(value))) {
        return `${field.name} must be an integer`;
      }
      break;
    case 'number':
      if (isNaN(Number(value))) {
        return `${field.name} must be a number`;
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${field.name} must be true or false`;
      }
      break;
  }

  // Range validation for numbers
  const numValue = Number(value);
  if (field.type === 'number' || field.type === 'integer') {
    if (field.min !== undefined && numValue < field.min) {
      return `${field.name} must be at least ${field.min}`;
    }
    if (field.max !== undefined && numValue > field.max) {
      return `${field.name} must be at most ${field.max}`;
    }
  }

  // Options validation for select/multiselect
  if (field.options && field.options.length > 0) {
    if (field.ui_type === 'select' && !field.options.includes(String(value))) {
      return `${field.name} must be one of: ${field.options.join(', ')}`;
    }
    if (field.ui_type === 'multiselect' && Array.isArray(value)) {
      const invalidOptions = value.filter((v) => !field.options!.includes(v));
      if (invalidOptions.length > 0) {
        return `Invalid options: ${invalidOptions.join(', ')}`;
      }
    }
  }

  return null;
}

export function validateStageConfig(
  fields: ConfigField[],
  values: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const field of fields) {
    const error = validateField(field, values[field.name]);
    if (error) {
      errors[field.name] = error;
    }
  }
  
  return errors;
}
```

#### Step 3: Update ConfigField Component with Error Display

**File:** `src/components/config/config-field.tsx`

Replace the existing component with error handling:

```typescript
'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useConfigStore } from '@/lib/store/config-store';
import { validateField } from '@/lib/validation/field-validator';
import type { ConfigField as ConfigFieldType } from '@/types/api';
import { cn } from '@/lib/utils/cn';
import { AlertCircle } from 'lucide-react';

interface ConfigFieldProps {
  field: ConfigFieldType;
  stageName: string;
  value: unknown;
}

export function ConfigField({ field, stageName, value }: ConfigFieldProps) {
  const { setFieldValue, fieldErrors, setFieldError } = useConfigStore();
  const error = fieldErrors[stageName]?.[field.name];

  const handleChange = (newValue: unknown) => {
    setFieldValue(stageName, field.name, newValue);
    
    // Validate on change
    const validationError = validateField(field, newValue);
    setFieldError(stageName, field.name, validationError);
  };

  // Blur validation for fields that might not trigger onChange
  const handleBlur = () => {
    const validationError = validateField(field, value);
    setFieldError(stageName, field.name, validationError);
  };

  const inputClassName = cn(
    error && 'border-destructive focus-visible:ring-destructive'
  );

  const renderInput = () => {
    switch (field.ui_type) {
      case 'checkbox':
        return (
          <Checkbox
            id={`${stageName}-${field.name}`}
            checked={Boolean(value)}
            onCheckedChange={handleChange}
            className={cn(error && 'border-destructive')}
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
              className={cn('flex-1', error && '[&_[role=slider]]:border-destructive')}
            />
            <span className="text-sm font-mono w-12 text-right">
              {Number(value)?.toFixed(2) || String(field.default)}
            </span>
          </div>
        );

      case 'select':
        return (
          <Select
            value={String(value ?? '')}
            onValueChange={handleChange}
          >
            <SelectTrigger 
              id={`${stageName}-${field.name}`}
              className={inputClassName}
            >
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

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className={cn(
            'space-y-2 rounded-md border p-3',
            error && 'border-destructive'
          )}>
            {field.options?.map((option) => (
              <Label
                key={option}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValue = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    handleChange(newValue);
                  }}
                />
                <span className="text-sm">{option}</span>
              </Label>
            ))}
          </div>
        );

      case 'number':
        return (
          <Input
            id={`${stageName}-${field.name}`}
            type="number"
            value={value as string | number ?? ''}
            onChange={(e) => handleChange(e.target.valueAsNumber || null)}
            onBlur={handleBlur}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            className={inputClassName}
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
            onBlur={handleBlur}
            placeholder={field.placeholder}
            className={inputClassName}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`${stageName}-${field.name}`}
          className={cn('text-sm font-medium', error && 'text-destructive')}
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
      
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-destructive text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Description (show below error if exists) */}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
```

#### Step 4: Integrate Validation into usePipelineExecution Hook

**File:** `src/hooks/use-pipeline-execution.ts`

Add client-side validation before server validation:

```typescript
// Add import at top
import { useConfigStore } from '@/lib/store/config-store';
import { validateStageConfig } from '@/lib/validation/field-validator';

// In validate function, add client-side validation first:
const validate = useCallback(async () => {
  if (!selectedPipeline) return;

  // Clear previous errors
  useConfigStore.getState().clearAllFieldErrors();

  // Client-side validation first
  const schemas = useConfigStore.getState().schemas;
  let hasClientErrors = false;

  for (const stageName of selectedStages) {
    const schema = schemas[stageName];
    if (schema) {
      const stageConfig = configs[stageName] || {};
      const errors = validateStageConfig(schema.fields, stageConfig);
      
      Object.entries(errors).forEach(([fieldName, error]) => {
        useConfigStore.getState().setFieldError(stageName, fieldName, error);
        hasClientErrors = true;
      });
    }
  }

  if (hasClientErrors) {
    // Don't call server if client validation fails
    setValidationResult({
      valid: false,
      errors: { _client: ['Please fix the highlighted field errors'] },
      warnings: [],
    });
    setValidationLoading(false);
    return;
  }

  // Continue with server validation...
  setValidationLoading(true);
  // ... rest of existing code
}, [/* dependencies */]);
```

---

## 4. Item 2: Loading/Disabled States for Selectors

### 4.1 Objective

Add visual feedback when data is being fetched, and disable interaction during loading.

### 4.2 UI Design

**Pipeline Selector Loading:**
```
┌─────────────────────────────────────┐
│  Select Pipeline                     │
│  Loading pipelines...          [○○○] │  ← Skeleton pulse
└─────────────────────────────────────┘
```

**Stage Selector Loading:**
```
┌─────────────────────────────────────┐
│  Select Stages                       │
│  ┌───────────────┐  ┌───────────────┐│
│  │  Loading...   │  │  Loading...   ││  ← Disabled + opacity
│  └───────────────┘  └───────────────┘│
└─────────────────────────────────────┘
```

### 4.3 Implementation Steps

#### Step 1: Update Pipeline Selector

**File:** `src/components/pipeline/pipeline-selector.tsx`

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import type { Pipeline, PipelineType } from '@/types/api';
import { cn } from '@/lib/utils/cn';

interface PipelineSelectorProps {
  pipelines: Record<string, Pipeline>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PipelineSelector({ 
  pipelines, 
  isLoading = false,
  disabled = false 
}: PipelineSelectorProps) {
  const { selectedPipeline, selectPipeline } = usePipelineStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Pipeline</CardTitle>
          <CardDescription>
            Choose the pipeline type to configure and execute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(disabled && 'opacity-60 pointer-events-none')}>
      <CardHeader>
        <CardTitle>Select Pipeline</CardTitle>
        <CardDescription>
          Choose the pipeline type to configure and execute
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedPipeline || ''}
          onValueChange={(value) => !disabled && selectPipeline(value as PipelineType)}
          disabled={disabled}
          className="grid gap-4 md:grid-cols-2"
        >
          {Object.entries(pipelines).map(([key, pipeline]) => (
            <Label
              key={key}
              htmlFor={key}
              className={cn(
                'flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors',
                !disabled && 'hover:bg-accent',
                selectedPipeline === key
                  ? 'border-primary bg-primary/5'
                  : 'border-border',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              <RadioGroupItem 
                value={key} 
                id={key} 
                className="mt-1" 
                disabled={disabled}
              />
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

#### Step 2: Update Stage Selector

**File:** `src/components/pipeline/stage-selector.tsx`

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import type { Stage } from '@/types/api';
import { cn } from '@/lib/utils/cn';

interface StageSelectorProps {
  stages: Stage[];
  isLoading?: boolean;
  disabled?: boolean;
}

export function StageSelector({ 
  stages, 
  isLoading = false,
  disabled = false 
}: StageSelectorProps) {
  const { selectedStages, toggleStage, stages: allStages } = usePipelineStore();

  // Find missing dependencies
  const missingDependencies = selectedStages.flatMap((stageName) => {
    const stage = allStages[stageName];
    if (!stage?.dependencies) return [];
    return stage.dependencies.filter((dep) => !selectedStages.includes(dep));
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Select Stages
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
          <CardDescription>
            Loading available stages...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(disabled && 'opacity-60')}>
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
              className={cn(
                'flex items-start space-x-3 rounded-lg border p-3 transition-colors',
                !disabled && 'cursor-pointer hover:bg-accent',
                selectedStages.includes(stage.name)
                  ? 'border-primary bg-primary/5'
                  : 'border-border',
                disabled && 'cursor-not-allowed opacity-70'
              )}
            >
              <Checkbox
                id={stage.name}
                checked={selectedStages.includes(stage.name)}
                onCheckedChange={() => !disabled && toggleStage(stage.name)}
                disabled={disabled}
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

#### Step 3: Update Main Page to Pass Loading States

**File:** `src/app/page.tsx`

Add loading prop to selectors and disable during execution:

```typescript
// In the render, pass loading/disabled props:
const isExecuting = ['starting', 'running'].includes(pipelineStatus?.status || '');

// ...

<PipelineSelector 
  pipelines={data.pipelines} 
  isLoading={isLoading}
  disabled={isExecuting}
/>

{selectedPipeline && (
  <StageSelector 
    stages={pipelineStages} 
    disabled={isExecuting}
  />
)}
```

---

## 5. Item 3: Error Boundaries

### 5.1 Objective

Implement React Error Boundaries to catch and gracefully display errors that occur in component rendering, preventing the entire app from crashing.

### 5.2 UI Design

**Error Boundary Display:**
```
┌─────────────────────────────────────────┐
│  ⚠️ Something went wrong                 │
│                                          │
│  An error occurred while rendering this  │
│  section. Please try refreshing the      │
│  page.                                   │
│                                          │
│  [Show Details]  [Refresh Page]          │
└─────────────────────────────────────────┘
```

### 5.3 Implementation Steps

#### Step 1: Create Error Boundary Component

**File:** `src/components/error-boundary.tsx` (new file)

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    this.props.onReset?.();
  };

  handleRefresh = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">
                Something went wrong
              </AlertTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              An error occurred while rendering this section. You can try
              refreshing the page or contact support if the problem persists.
            </p>

            {this.state.error && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertDescription className="font-mono text-xs">
                  {this.state.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Collapsible Details */}
            <Button
              variant="ghost"
              size="sm"
              onClick={this.toggleDetails}
              className="text-xs text-muted-foreground p-0 h-auto"
            >
              {this.state.showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Details
                </>
              )}
            </Button>

            {this.state.showDetails && this.state.errorInfo && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40 text-muted-foreground">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </CardContent>
          <CardFooter className="gap-2 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
            >
              Try Again
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={this.handleRefresh}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
```

#### Step 2: Create Section-Level Error Boundary Wrapper

**File:** `src/components/section-error-boundary.tsx` (new file)

```typescript
'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
}

export function SectionErrorBoundary({ 
  children, 
  sectionName 
}: SectionErrorBoundaryProps) {
  const fallback = (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Error loading {sectionName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Failed to load this section. Please refresh the page.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
```

#### Step 3: Apply Error Boundaries to Main Page

**File:** `src/app/page.tsx`

Wrap each major section with error boundaries:

```typescript
import { SectionErrorBoundary } from '@/components/section-error-boundary';

// In the render:
export default function HomePage() {
  // ... existing code ...

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Pipeline Configuration</h1>
        <p className="text-muted-foreground">
          Configure and execute GraphRAG and Ingestion pipelines
        </p>
      </div>

      {/* Pipeline Selector with Error Boundary */}
      <SectionErrorBoundary sectionName="Pipeline Selector">
        <PipelineSelector 
          pipelines={data.pipelines} 
          disabled={isExecuting}
        />
      </SectionErrorBoundary>

      {/* Stage Selector with Error Boundary */}
      {selectedPipeline && (
        <SectionErrorBoundary sectionName="Stage Selector">
          <StageSelector 
            stages={pipelineStages} 
            disabled={isExecuting}
          />
        </SectionErrorBoundary>
      )}

      {/* Config Panels with Error Boundary */}
      {selectedStages.length > 0 && (
        <SectionErrorBoundary sectionName="Stage Configuration">
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Stage Configuration</h2>
              <p className="text-muted-foreground text-sm">
                Configure each selected stage. Expand panels to modify settings.
              </p>
            </div>
            <StageConfigPanels stageNames={selectedStages} />
          </>
        </SectionErrorBoundary>
      )}

      {/* Execution Panel with Error Boundary */}
      {selectedPipeline && selectedStages.length > 0 && (
        <SectionErrorBoundary sectionName="Execution Panel">
          <ExecutionPanel />
        </SectionErrorBoundary>
      )}
    </div>
  );
}
```

#### Step 4: Add Global Error Boundary to Layout

**File:** `src/app/layout.tsx`

Add a top-level error boundary:

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

// Wrap the main content:
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background antialiased`}>
        <Providers>
          <ErrorBoundary>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 container py-6">{children}</main>
              <Footer />
            </div>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
```

---

## 6. Implementation Checklist

### Pre-Implementation
- [ ] Review current codebase state
- [ ] Ensure Phase 1-6 build passes
- [ ] Create git branch for Phase 7

### Item 1: Inline Field Validation
- [ ] Update `config-store.ts` with fieldErrors state
- [ ] Create `src/lib/validation/field-validator.ts`
- [ ] Update `config-field.tsx` with error display
- [ ] Update `use-pipeline-execution.ts` with client validation
- [ ] Test all 6 field types show errors correctly
- [ ] Verify errors clear when fixed

### Item 2: Loading/Disabled States
- [ ] Update `pipeline-selector.tsx` with loading prop
- [ ] Update `stage-selector.tsx` with loading prop
- [ ] Update `page.tsx` to pass loading states
- [ ] Test loading skeletons display correctly
- [ ] Test disabled state during execution

### Item 3: Error Boundaries
- [ ] Create `src/components/error-boundary.tsx`
- [ ] Create `src/components/section-error-boundary.tsx`
- [ ] Update `page.tsx` with section error boundaries
- [ ] Update `layout.tsx` with global error boundary
- [ ] Test error recovery (try again button)
- [ ] Test error details toggle

### Post-Implementation
- [ ] Run `npm run build` - no errors
- [ ] Run `npm run lint` - no errors
- [ ] Test complete user flow
- [ ] Update IMPLEMENTATION_PLAN.md Phase 7 status

---

## 7. Testing Guide

### 7.1 Field Validation Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Required field empty | Leave required field empty, click validate | Red border, error message "X is required" |
| Number out of range | Enter value outside min/max | Red border, error "must be between X and Y" |
| Invalid number | Enter text in number field | Red border, error "must be a number" |
| Error clears | Fix the error, change value | Red border and error disappear |
| Multiple errors | Multiple invalid fields | All show individual errors |

### 7.2 Loading States Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Initial load | Refresh page | Skeleton loaders in selectors |
| During execution | Start pipeline execution | Selectors disabled with opacity |
| After completion | Pipeline completes | Selectors re-enabled |

### 7.3 Error Boundary Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Component error | Introduce render error | Error card shows with message |
| Show details | Click "Show Details" | Stack trace visible |
| Try again | Click "Try Again" | Component attempts re-render |
| Refresh | Click "Refresh Page" | Full page reload |

### 7.4 Commands for Testing

```bash
# Build test
npm run build

# Start dev server
npm run dev

# Lint check
npm run lint
```

---

## Document Metadata

**Type:** Technical Implementation Guide  
**Phase:** 7 (Polish)  
**Prerequisites:** Phases 1-6 Complete  
**Estimated Time:** 2-3 hours  
**Complexity:** Medium

---

**End of Phase 7 Polish Implementation Guide**

