'use client';

import { useState } from 'react';
import { Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JsonViewer } from './json-viewer';
import type { CommunityDocument } from '@/types/viewer-api';

interface CommunityViewerProps {
  documents: CommunityDocument[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (skip: number) => void;
  onDocumentClick: (docId: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Colors for different community levels
const LEVEL_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-red-500',
];

export function CommunityViewer({
  documents,
  total,
  skip,
  limit,
  hasMore,
  onPageChange,
  onDocumentClick,
  isLoading = false,
  className,
}: CommunityViewerProps) {
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityDocument | null>(null);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  // Get unique levels from current page
  const levels = [...new Set(documents.map(c => c.level ?? 0))].sort((a, b) => a - b);

  // Filter communities (local filtering on current page)
  const filteredCommunities = levelFilter !== null
    ? documents.filter(c => c.level === levelFilter)
    : documents;

  // Sort by level then by member count
  const sortedCommunities = [...filteredCommunities].sort((a, b) => {
    const levelDiff = (a.level ?? 0) - (b.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return (b.member_count ?? 0) - (a.member_count ?? 0);
  });

  // Pagination
  const currentPage = Math.floor(skip / limit);
  const totalPages = Math.ceil(total / limit);
  const canGoPrev = skip > 0;
  const canGoNext = hasMore;

  const handleSelect = (community: CommunityDocument) => {
    setSelectedCommunity(community);
  };

  const handlePrevPage = () => {
    onPageChange(Math.max(0, skip - limit));
  };

  const handleNextPage = () => {
    onPageChange(skip + limit);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Community list */}
      <div className="w-96 border-r border-neutral-200 dark:border-neutral-700 flex flex-col flex-shrink-0">
        {/* Level filter */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-900">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLevelFilter(null)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                levelFilter === null
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800'
              )}
            >
              All Levels ({documents.length})
            </button>
            {levels.map(level => {
              const count = documents.filter(c => c.level === level).length;
              return (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    levelFilter === level
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800'
                  )}
                >
                  Level {level} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Community list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          ) : sortedCommunities.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500 text-center">
              No communities found
            </div>
          ) : (
            sortedCommunities.map((community) => {
              const levelColor = LEVEL_COLORS[(community.level ?? 0) % LEVEL_COLORS.length];
              
              return (
                <button
                  key={community._id}
                  onClick={() => handleSelect(community)}
                  onDoubleClick={() => onDocumentClick(community._id)}
                  className={cn(
                    'w-full p-4 text-left border-b border-neutral-100 dark:border-neutral-800',
                    'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                    selectedCommunity?._id === community._id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Level indicator */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn('w-2 h-2 rounded-full', levelColor)} />
                      <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 mt-1" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {community.title || `Community ${community._id.slice(-6)}`}
                        </span>
                      </div>
                      
                      {community.summary && (
                        <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
                          {community.summary}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                        <span>Level {community.level ?? 0}</span>
                        <span>·</span>
                        <span>{community.member_count ?? community.member_ids?.length ?? 0} members</span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })
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

      {/* Community detail */}
      <div className="flex-1 overflow-auto p-6">
        {selectedCommunity ? (
          <div className="max-w-2xl">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  LEVEL_COLORS[(selectedCommunity.level ?? 0) % LEVEL_COLORS.length]
                )} />
                <span>Level {selectedCommunity.level ?? 0}</span>
                <span>·</span>
                <span>{selectedCommunity.member_count ?? selectedCommunity.member_ids?.length ?? 0} members</span>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {selectedCommunity.title || `Community ${selectedCommunity._id.slice(-6)}`}
              </h2>
            </div>

            {/* Summary */}
            {selectedCommunity.summary && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Summary
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {selectedCommunity.summary}
                </p>
              </div>
            )}

            {/* Members preview */}
            {selectedCommunity.member_ids && selectedCommunity.member_ids.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Members ({selectedCommunity.member_ids.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCommunity.member_ids.slice(0, 20).map((id, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono"
                    >
                      {id.slice(-8)}
                    </span>
                  ))}
                  {selectedCommunity.member_ids.length > 20 && (
                    <span className="px-2 py-1 text-neutral-500 text-xs">
                      +{selectedCommunity.member_ids.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Full JSON */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Raw Data
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden">
                <JsonViewer data={selectedCommunity} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <div className="text-center">
              <p>Select a community to view details</p>
              <p className="text-xs mt-1 text-neutral-400">Double-click to open full view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
