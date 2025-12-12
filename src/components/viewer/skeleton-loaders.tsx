'use client';

import { cn } from '@/lib/utils';

/**
 * Base skeleton component with shimmer animation
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800',
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton for document view - shows JSON structure placeholder
 */
export function DocumentSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Document header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* JSON-like structure */}
      <div className="space-y-3 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
        <Skeleton className="h-4 w-32" />
        <div className="pl-4 space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-4 w-40" />
        <div className="pl-4 space-y-2">
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-4 w-36" />
        <div className="pl-4 space-y-2">
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for collection list - shows multiple document cards
 */
export function CollectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 p-6">
      {/* Header info */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      
      {/* Document cards */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
        >
          {/* Card header */}
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Card content preview */}
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for timeline view - horizontal timeline with dots
 */
export function TimelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex items-center justify-center gap-2 min-w-max">
          {/* Date group */}
          <div className="flex flex-col items-center">
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="flex items-center">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center">
                  {i > 0 && <Skeleton className="h-0.5 w-12" />}
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-3 w-12 mt-2" />
                    <Skeleton className="h-2 w-10 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <Skeleton className="h-3 w-64 mx-auto" />
      </div>
    </div>
  );
}

/**
 * Skeleton for compare view - side by side comparison
 */
export function CompareSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Compare panels */}
      <div className="flex-1 flex">
        {/* Left panel */}
        <div className="flex-1 border-r border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for chunks viewer - list with detail panel
 */
export function ChunkListSkeleton() {
  return (
    <div className="flex h-full">
      {/* Chunk list panel */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <Skeleton className="h-5 w-24" />
        </div>

        {/* Chunk items */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border-b border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-12" />
                ))}
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5 mt-1" />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-3 w-36 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for breadcrumb navigation
 */
export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-16" />
      <span className="text-neutral-300">/</span>
      <Skeleton className="h-5 w-24" />
      <span className="text-neutral-300">/</span>
      <Skeleton className="h-5 w-32" />
    </div>
  );
}

/**
 * Generic loading skeleton with customizable rows
 */
export function GenericSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${50 + Math.random() * 50}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for just the chunk items (used inside chunks-viewer list)
 */
export function ChunkItemsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="flex gap-1 mb-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-5 w-12" />
            ))}
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5 mt-1" />
        </div>
      ))}
    </div>
  );
}

