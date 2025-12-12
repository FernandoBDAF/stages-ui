'use client';

import { useState, useEffect } from 'react';
import { Filter, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { 
  CollectionFilter, 
  EntityFilter, 
  ChunkFilter, 
  VideoFilter 
} from '@/types/viewer-filter';
import { countActiveFilters, getFilterType } from '@/types/viewer-filter';

interface CollectionFilterPanelProps {
  collection: string;
  currentFilter: CollectionFilter;
  onFilterChange: (filter: CollectionFilter) => void;
  onClear: () => void;
  className?: string;
}

// Entity types available for filtering
const ENTITY_TYPES = ['PERSON', 'ORGANIZATION', 'LOCATION', 'TECHNOLOGY', 'EVENT', 'CONCEPT'];

// Processing statuses for chunks
const PROCESSING_STATUSES = ['completed', 'failed', 'pending', 'warning'] as const;

export function CollectionFilterPanel({
  collection,
  currentFilter,
  onFilterChange,
  onClear,
  className,
}: CollectionFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const filterType = getFilterType(collection);
  const activeCount = countActiveFilters(currentFilter);

  // Local state for controlled inputs
  const [searchInput, setSearchInput] = useState(currentFilter.search || '');
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentFilter.search) {
        onFilterChange({ ...currentFilter, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, currentFilter, onFilterChange]);

  // Update local search when filter changes externally
  useEffect(() => {
    setSearchInput(currentFilter.search || '');
  }, [currentFilter.search]);

  return (
    <div className={cn('border-b border-neutral-200 dark:border-neutral-800', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 px-6 py-3">
          {/* Search input - always visible */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              data-viewer-search
              placeholder="Search documents... (⌘/)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter toggle */}
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          {/* Clear filters */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                onClear();
              }}
              className="text-neutral-500"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <Card className="mx-6 mb-4 rounded-lg">
            <CardContent className="pt-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Entity-specific filters */}
                {filterType === 'entity' && (
                  <EntityFilters
                    filter={currentFilter as EntityFilter}
                    onChange={(updates) => onFilterChange({ ...currentFilter, ...updates })}
                  />
                )}

                {/* Chunk-specific filters */}
                {filterType === 'chunk' && (
                  <ChunkFilters
                    filter={currentFilter as ChunkFilter}
                    onChange={(updates) => onFilterChange({ ...currentFilter, ...updates })}
                  />
                )}

                {/* Video/transcript-specific filters */}
                {filterType === 'video' && (
                  <VideoFilters
                    filter={currentFilter as VideoFilter}
                    onChange={(updates) => onFilterChange({ ...currentFilter, ...updates })}
                  />
                )}

                {/* Generic filters for unknown collections */}
                {filterType === 'generic' && (
                  <div className="col-span-full text-sm text-neutral-500">
                    Use the search box above to filter documents by text content.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// =============================================================================
// Entity Filters
// =============================================================================

interface EntityFiltersProps {
  filter: EntityFilter;
  onChange: (updates: Partial<EntityFilter>) => void;
}

function EntityFilters({ filter, onChange }: EntityFiltersProps) {
  return (
    <>
      {/* Entity Type Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Entity Types</Label>
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filter.types?.includes(type) || false}
                onCheckedChange={(checked) => {
                  const current = filter.types || [];
                  const updated = checked
                    ? [...current, type]
                    : current.filter((t) => t !== type);
                  onChange({ types: updated.length > 0 ? updated : undefined });
                }}
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Trust Score Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min Trust Score</Label>
          <span className="text-sm font-mono text-neutral-500">
            {(filter.minTrustScore || 0).toFixed(1)}
          </span>
        </div>
        <Slider
          value={[(filter.minTrustScore || 0) * 100]}
          onValueChange={([value]) => 
            onChange({ minTrustScore: value > 0 ? value / 100 : undefined })
          }
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Mention Count */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min Mentions</Label>
          <span className="text-sm font-mono text-neutral-500">
            {filter.minMentions || 0}
          </span>
        </div>
        <Slider
          value={[filter.minMentions || 0]}
          onValueChange={([value]) => 
            onChange({ minMentions: value > 0 ? value : undefined })
          }
          max={50}
          step={1}
          className="w-full"
        />
      </div>

      {/* Has Description */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={filter.hasDescription === true}
          onCheckedChange={(checked) => 
            onChange({ hasDescription: checked ? true : undefined })
          }
        />
        <span className="text-sm">Has description</span>
      </label>
    </>
  );
}

// =============================================================================
// Chunk Filters
// =============================================================================

interface ChunkFiltersProps {
  filter: ChunkFilter;
  onChange: (updates: Partial<ChunkFilter>) => void;
}

function ChunkFilters({ filter, onChange }: ChunkFiltersProps) {
  return (
    <>
      {/* Processing Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Processing Status</Label>
        <div className="space-y-1">
          {PROCESSING_STATUSES.map((status) => (
            <label key={status} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filter.processingStatus?.includes(status) || false}
                onCheckedChange={(checked) => {
                  const current = filter.processingStatus || [];
                  const updated = checked
                    ? [...current, status]
                    : current.filter((s) => s !== status);
                  onChange({ processingStatus: updated.length > 0 ? updated : undefined });
                }}
              />
              <span className="text-sm capitalize">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Has Errors Toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Error Filter</Label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={filter.hasErrors === true}
            onCheckedChange={(checked) => 
              onChange({ hasErrors: checked ? true : undefined })
            }
          />
          <span className="text-sm">Show only chunks with errors</span>
        </label>
      </div>

      {/* Video ID Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Video ID</Label>
        <Input
          placeholder="Filter by video_id..."
          value={filter.videoId || ''}
          onChange={(e) => 
            onChange({ videoId: e.target.value || undefined })
          }
        />
      </div>
    </>
  );
}

// =============================================================================
// Video Filters
// =============================================================================

interface VideoFiltersProps {
  filter: VideoFilter;
  onChange: (updates: Partial<VideoFilter>) => void;
}

function VideoFilters({ filter, onChange }: VideoFiltersProps) {
  return (
    <>
      {/* Min Views */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min Views</Label>
          <span className="text-sm font-mono text-neutral-500">
            {(filter.minViews || 0).toLocaleString()}
          </span>
        </div>
        <Slider
          value={[filter.minViews || 0]}
          onValueChange={([value]) => 
            onChange({ minViews: value > 0 ? value : undefined })
          }
          max={100000}
          step={1000}
          className="w-full"
        />
      </div>

      {/* Has Transcript */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Transcript</Label>
        <Select
          value={filter.hasTranscript === undefined ? 'any' : filter.hasTranscript ? 'yes' : 'no'}
          onValueChange={(value) => {
            onChange({
              hasTranscript: value === 'any' ? undefined : value === 'yes',
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="yes">Has transcript</SelectItem>
            <SelectItem value="no">No transcript</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range - Start */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Published After</Label>
        <Input
          type="date"
          value={filter.dateRange?.start || ''}
          onChange={(e) => 
            onChange({
              dateRange: {
                ...filter.dateRange,
                start: e.target.value || undefined,
              },
            })
          }
        />
      </div>

      {/* Date Range - End */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Published Before</Label>
        <Input
          type="date"
          value={filter.dateRange?.end || ''}
          onChange={(e) => 
            onChange({
              dateRange: {
                ...filter.dateRange,
                end: e.target.value || undefined,
              },
            })
          }
        />
      </div>
    </>
  );
}


