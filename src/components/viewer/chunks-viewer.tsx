'use client';

import { useState, useRef } from 'react';
import { CheckCircle, XCircle, Clock, FileText, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { ChunkItemsSkeleton } from './skeleton-loaders';
import { cn } from '@/lib/utils';
import { TextDisplay } from './text-display';
import { useViewerSettings } from '@/hooks/use-viewer-settings';
import { Button } from '@/components/ui/button';
import type { ChunkDocument } from '@/types/viewer-api';

interface ChunksViewerProps {
  documents: ChunkDocument[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (skip: number) => void;
  onDocumentClick: (docId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const STATUS_ICONS = {
  completed: CheckCircle,
  failed: XCircle,
  pending: Clock,
};

const STATUS_COLORS = {
  completed: 'text-green-500',
  failed: 'text-red-500',
  pending: 'text-amber-500',
};

function getStageStatus(chunk: ChunkDocument, stage: string): string {
  const stageData = chunk[`graphrag_${stage}`] as { status?: string } | undefined;
  return stageData?.status || 'pending';
}

export function ChunksViewer({
  documents,
  total,
  skip,
  limit,
  hasMore,
  onPageChange,
  onDocumentClick,
  isLoading = false,
  className,
}: ChunksViewerProps) {
  const [selectedChunk, setSelectedChunk] = useState<ChunkDocument | null>(null);
  const { settings } = useViewerSettings();
  const contentRef = useRef<HTMLDivElement>(null);

  const stages = ['extraction', 'resolution', 'construction', 'communities'];

  // Pagination
  const currentPage = Math.floor(skip / limit);
  const totalPages = Math.ceil(total / limit);
  const canGoPrev = skip > 0;
  const canGoNext = hasMore;

  const handleSelect = (chunk: ChunkDocument) => {
    setSelectedChunk(chunk);
  };

  const handlePrevPage = () => {
    onPageChange(Math.max(0, skip - limit));
  };

  const handleNextPage = () => {
    onPageChange(skip + limit);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Chunk list */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-700 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-900">
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
            Chunks ({total})
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <ChunkItemsSkeleton />
          ) : documents.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500 text-center">
              No chunks found
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {documents.map((chunk) => (
                <div
                  key={chunk._id}
                  className={cn(
                    'p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer',
                    selectedChunk?._id === chunk._id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => handleSelect(chunk)}
                >
                  {/* Chunk header with Open button */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {chunk.video_id || 'Unknown'} #{chunk.chunk_index ?? '?'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentClick(chunk._id);
                      }}
                    >
                      Open
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>

                  {/* Stage status badges */}
                  <div className="flex gap-1 flex-wrap">
                    {stages.map((stage) => {
                      const status = getStageStatus(chunk, stage) as keyof typeof STATUS_ICONS;
                      const Icon = STATUS_ICONS[status] || Clock;
                      const color = STATUS_COLORS[status] || 'text-neutral-400';
                      
                      return (
                        <div
                          key={stage}
                          className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs"
                          title={`${stage}: ${status}`}
                        >
                          <Icon className={cn('w-3 h-3', color)} />
                          <span className="text-neutral-600 dark:text-neutral-400 capitalize">
                            {stage.slice(0, 3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Preview text */}
                  {chunk.text && (
                    <p className="mt-2 text-xs text-neutral-500 line-clamp-2">
                      {chunk.text.slice(0, 150)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            <span className="text-xs text-neutral-500">
              {skip + 1}–{Math.min(skip + limit, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevPage}
                disabled={!canGoPrev || isLoading}
                className={cn(
                  'p-1 rounded',
                  canGoPrev && !isLoading
                    ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                    : 'opacity-50 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-600 dark:text-neutral-400 px-1">
                {currentPage + 1}/{totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!canGoNext || isLoading}
                className={cn(
                  'p-1 rounded',
                  canGoNext && !isLoading
                    ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                    : 'opacity-50 cursor-not-allowed'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chunk detail */}
      <div className="flex-1 overflow-hidden">
        {selectedChunk ? (
          <TextDisplay
            ref={contentRef}
            content={selectedChunk.text || null}
            title={`${selectedChunk.video_id || 'Chunk'} #${selectedChunk.chunk_index ?? ''}`}
            metadata={{
              source: (selectedChunk.video_id as string) || undefined,
              created_at: new Date().toISOString(),
              word_count: selectedChunk.text?.split(/\s+/).length || 0,
              char_count: selectedChunk.text?.length || 0,
            }}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            lineWidth={settings.lineWidth}
            entities={[]}
            searchMatches={[]}
            currentMatchIndex={0}
            entitySpotlightEnabled={settings.entitySpotlightEnabled}
            label="Chunk Content"
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <div className="text-center">
              <p>Select a chunk to view its content</p>
              <p className="text-xs mt-1 text-neutral-400">Click &quot;Open&quot; to view full details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
