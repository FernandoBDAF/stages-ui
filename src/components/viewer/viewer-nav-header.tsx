'use client';

import { Database, ChevronDown, ArrowLeft, FileText, Code, Table as TableIcon, Search, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useViewerDatabases, useViewerCollections } from '@/hooks/use-viewer-data';
import { selectRenderer, getAvailableRenderers, getRendererDisplayName } from '@/lib/viewer/renderer-selector';
import type { RendererType } from '@/types/viewer-api';

interface ViewerNavHeaderProps {
  selectedDatabase: string | null;
  selectedCollection: string | null;
  selectedDocumentId: string | null;
  currentRenderer: RendererType;
  availableRenderers: RendererType[];
  totalDocuments?: number;
  onDatabaseChange: (db: string) => void;
  onCollectionChange: (coll: string, renderer: RendererType) => void;
  onRendererChange: (renderer: RendererType) => void;
  onBackToCollection: () => void;
  onOpenBrowser: () => void;
  className?: string;
}

export function ViewerNavHeader({
  selectedDatabase,
  selectedCollection,
  selectedDocumentId,
  currentRenderer,
  availableRenderers,
  totalDocuments,
  onDatabaseChange,
  onCollectionChange,
  onRendererChange,
  onBackToCollection,
  onOpenBrowser,
  className,
}: ViewerNavHeaderProps) {
  // Data fetching
  const { data: databases, isLoading: isLoadingDatabases } = useViewerDatabases();
  const { data: collections, isLoading: isLoadingCollections } = useViewerCollections(selectedDatabase);

  // Get renderer icon
  const renderIcon = () => {
    switch (currentRenderer) {
      case 'long_text':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <Code className="h-4 w-4" />;
      case 'table':
        return <TableIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      'border-b border-neutral-200 dark:border-neutral-800 px-6 py-3',
      'flex items-center gap-4',
      className
    )}>
      {/* Database Selector */}
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-neutral-400" />
        <Select
          value={selectedDatabase || undefined}
          onValueChange={onDatabaseChange}
          disabled={isLoadingDatabases}
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Database" />
          </SelectTrigger>
          <SelectContent>
            {databases?.databases.map((db) => (
              <SelectItem key={db.name} value={db.name}>
                {db.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Separator */}
      <span className="text-neutral-300 dark:text-neutral-700">/</span>

      {/* Collection Selector */}
      <Select
        value={selectedCollection || undefined}
        onValueChange={(coll) => {
          const renderer = selectRenderer(coll, 'json');
          onCollectionChange(coll, renderer);
        }}
        disabled={!selectedDatabase || isLoadingCollections}
      >
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue placeholder="Collection" />
        </SelectTrigger>
        <SelectContent>
          {collections?.collections.map((coll) => (
            <SelectItem key={coll.name} value={coll.name}>
              <span className="flex items-center gap-2">
                {coll.name}
                <span className="text-xs text-neutral-400">
                  ({coll.document_count.toLocaleString()})
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Document Breadcrumb (when viewing single document) */}
      {selectedDocumentId && (
        <>
          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToCollection}
              className="h-8 gap-1 text-sm"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
            <span className="text-sm font-mono text-neutral-500 max-w-[200px] truncate">
              {selectedDocumentId}
            </span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Document count */}
      {totalDocuments !== undefined && !selectedDocumentId && (
        <span className="text-sm text-neutral-500">
          {totalDocuments.toLocaleString()} docs
        </span>
      )}

      {/* Renderer Selector (only when viewing collection, not single document) */}
      {availableRenderers.length > 1 && !selectedDocumentId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-sm">
              {renderIcon()}
              {getRendererDisplayName(currentRenderer)}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableRenderers.map((renderer) => (
              <DropdownMenuItem
                key={renderer}
                onClick={() => onRendererChange(renderer)}
              >
                {getRendererDisplayName(renderer)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Full Browser Button */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 text-sm"
        onClick={onOpenBrowser}
      >
        <FolderOpen className="h-4 w-4" />
        Browse
      </Button>
    </div>
  );
}


