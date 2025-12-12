'use client';

import { ChevronRight, Database, FileText, FolderOpen, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewerBreadcrumbProps {
  database: string | null;
  collection: string | null;
  documentId: string | null;
  viewMode: 'browse' | 'compare' | 'timeline';
  onNavigate: (level: 'home' | 'database' | 'collection' | 'document') => void;
}

export function ViewerBreadcrumb({
  database,
  collection,
  documentId,
  viewMode,
  onNavigate,
}: ViewerBreadcrumbProps) {
  // Truncate document ID for display
  const truncatedDocId = documentId && documentId.length > 16
    ? `${documentId.slice(0, 8)}...${documentId.slice(-4)}`
    : documentId;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {/* Home/Viewer */}
      <button
        onClick={() => onNavigate('home')}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        )}
      >
        <Home className="h-3.5 w-3.5" />
        <span>Viewer</span>
      </button>

      {database && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
          <button
            onClick={() => onNavigate('database')}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              collection
                ? "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                : "text-neutral-900 dark:text-neutral-100 font-medium"
            )}
          >
            <Database className="h-3.5 w-3.5" />
            <span>{database}</span>
          </button>
        </>
      )}

      {collection && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
          <button
            onClick={() => onNavigate('collection')}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              documentId
                ? "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                : "text-neutral-900 dark:text-neutral-100 font-medium"
            )}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>{collection}</span>
          </button>
        </>
      )}

      {documentId && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
          <button
            onClick={() => onNavigate('document')}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              viewMode !== 'browse'
                ? "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                : "text-neutral-900 dark:text-neutral-100 font-medium"
            )}
            title={documentId}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="font-mono">{truncatedDocId}</span>
          </button>
        </>
      )}

      {viewMode !== 'browse' && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600" />
          <span className={cn(
            "px-2 py-1 rounded-md font-medium",
            "text-neutral-900 dark:text-neutral-100",
            viewMode === 'compare' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
            viewMode === 'timeline' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          )}>
            {viewMode === 'compare' ? 'Compare' : 'Timeline'}
          </span>
        </>
      )}
    </nav>
  );
}


