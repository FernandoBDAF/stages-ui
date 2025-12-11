'use client';

import { useState } from 'react';
import { User, MapPin, Building, Tag, Hash, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JsonViewer } from './json-viewer';
import type { EntityDocument } from '@/types/viewer-api';

interface EntityViewerProps {
  documents: EntityDocument[];
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
  onPageChange: (skip: number) => void;
  onDocumentClick: (docId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const TYPE_ICONS: Record<string, typeof User> = {
  person: User,
  location: MapPin,
  organization: Building,
  concept: Tag,
  default: Hash,
};

const TYPE_COLORS: Record<string, string> = {
  person: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  location: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  organization: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  concept: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
};

export function EntityViewer({
  documents,
  total,
  skip,
  limit,
  hasMore,
  onPageChange,
  onDocumentClick,
  isLoading = false,
  className,
}: EntityViewerProps) {
  const [selectedEntity, setSelectedEntity] = useState<EntityDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Get unique types from current page
  const types = [...new Set(documents.map(e => e.type || 'unknown'))];

  // Filter entities (local filtering on current page)
  const filteredEntities = documents.filter(entity => {
    if (typeFilter && entity.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Pagination
  const currentPage = Math.floor(skip / limit);
  const totalPages = Math.ceil(total / limit);
  const canGoPrev = skip > 0;
  const canGoNext = hasMore;

  const handleSelect = (entity: EntityDocument) => {
    setSelectedEntity(entity);
  };

  const handlePrevPage = () => {
    onPageChange(Math.max(0, skip - limit));
  };

  const handleNextPage = () => {
    onPageChange(skip + limit);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Entity list */}
      <div className="w-96 border-r border-neutral-200 dark:border-neutral-700 flex flex-col flex-shrink-0">
        {/* Search & filters */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-3 sticky top-0 bg-white dark:bg-neutral-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter(null)}
              className={cn(
                'px-2 py-1 text-xs rounded-full transition-colors',
                !typeFilter 
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              )}
            >
              All ({documents.length})
            </button>
            {types.map(type => {
              const count = documents.filter(e => e.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-full capitalize transition-colors',
                    typeFilter === type
                      ? TYPE_COLORS[type] || TYPE_COLORS.default
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  )}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Entity list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500 text-center">
              No entities found
            </div>
          ) : (
            filteredEntities.map((entity) => {
              const Icon = TYPE_ICONS[entity.type || ''] || TYPE_ICONS.default;
              
              return (
                <button
                  key={entity._id}
                  onClick={() => handleSelect(entity)}
                  onDoubleClick={() => onDocumentClick(entity._id)}
                  className={cn(
                    'w-full p-4 text-left border-b border-neutral-100 dark:border-neutral-800',
                    'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                    selectedEntity?._id === entity._id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      TYPE_COLORS[entity.type || ''] || TYPE_COLORS.default
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {entity.name}
                      </div>
                      {entity.description && (
                        <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
                          {entity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                        {entity.type && (
                          <span className="capitalize">{entity.type}</span>
                        )}
                        {entity.mention_count !== undefined && entity.mention_count > 0 && (
                          <>
                            <span>·</span>
                            <span>{entity.mention_count} mentions</span>
                          </>
                        )}
                      </div>
                    </div>
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

      {/* Entity detail */}
      <div className="flex-1 overflow-auto p-6">
        {selectedEntity ? (
          <div className="max-w-2xl">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                TYPE_COLORS[selectedEntity.type || ''] || TYPE_COLORS.default
              )}>
                {(() => {
                  const Icon = TYPE_ICONS[selectedEntity.type || ''] || TYPE_ICONS.default;
                  return <Icon className="w-6 h-6" />;
                })()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedEntity.name}
                </h2>
                <p className="text-neutral-500 capitalize">{selectedEntity.type || 'Unknown type'}</p>
              </div>
            </div>

            {/* Description */}
            {selectedEntity.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {selectedEntity.description}
                </p>
              </div>
            )}

            {/* Aliases */}
            {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Also known as
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedEntity.aliases.map((alias, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-sm"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full JSON */}
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Raw Data
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden">
                <JsonViewer data={selectedEntity} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <div className="text-center">
              <p>Select an entity to view details</p>
              <p className="text-xs mt-1 text-neutral-400">Double-click to open full view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
