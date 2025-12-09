'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ValidationResult } from '@/types/api';

interface ValidationResultsProps {
  result: ValidationResult;
}

// Helper to convert any error value to displayable string(s)
function formatError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    // Handle common error object shapes
    if ('message' in error) return String((error as { message: unknown }).message);
    if ('msg' in error) return String((error as { msg: unknown }).msg);
    if ('error' in error) return String((error as { error: unknown }).error);
    // Fallback: JSON stringify for debugging
    return JSON.stringify(error);
  }
  return String(error);
}

// Normalize errors to always be an array of strings
function normalizeErrors(errors: unknown): string[] {
  if (Array.isArray(errors)) {
    return errors.map(formatError);
  }
  return [formatError(errors)];
}

export function ValidationResults({ result }: ValidationResultsProps) {
  if (!result) return null;

  return (
    <div className="space-y-3">
      {/* Status */}
      <Alert variant={result.valid ? 'default' : 'destructive'}>
        {result.valid ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {result.valid ? 'Configuration Valid' : 'Configuration Invalid'}
        </AlertTitle>
        <AlertDescription>
          {result.valid
            ? 'All configuration fields are valid and ready for execution.'
            : 'Please fix the errors below before executing.'}
        </AlertDescription>
      </Alert>

      {/* Errors */}
      {result.errors && Object.keys(result.errors).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">Errors:</h4>
          {Object.entries(result.errors).map(([stage, errors]) => (
            <Alert key={stage} variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">{stage}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {normalizeErrors(errors).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
            Warnings:
          </h4>
          {result.warnings.map((warning, idx) => (
            <Alert key={idx}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Execution Plan */}
      {result.execution_plan && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-semibold">Execution Plan:</h4>
          <div className="flex items-center gap-2 flex-wrap text-sm font-mono">
            {result.execution_plan.stages.map((stage, idx) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="px-2 py-1 bg-primary/10 rounded">
                  {stage}
                </span>
                {idx < result.execution_plan!.stages.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          {result.execution_plan.resolved_dependencies?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Auto-included dependencies:{' '}
              {result.execution_plan.resolved_dependencies.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

