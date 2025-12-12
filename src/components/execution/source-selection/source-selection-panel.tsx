'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  ArrowRight, 
  Video,
  Loader2,
  Save
} from 'lucide-react';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { SOURCE_SELECTION } from '@/lib/constants/source-selection';
import { 
  useChannels, 
  usePlaylists,
  useSavedFilters, 
  useFilterPreview,
  useSaveFilter,
  useSavedFilter
} from '@/hooks/use-source-selection';
import { ChannelSelector } from './channel-selector';
import { PlaylistSelector } from './playlist-selector';
import { DateRangePresets } from './date-range-presets';
import { FilterPreview } from './filter-preview';
import { SavedFiltersList } from './saved-filters-list';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SourceSelectionPanelProps {
  onContinue: () => void;
}

export function SourceSelectionPanel({ onContinue }: SourceSelectionPanelProps) {
  // Store state - use individual selectors for better performance
  const mode = useSourceSelectionStore((state) => state.mode);
  const setMode = useSourceSelectionStore((state) => state.setMode);
  const currentFilter = useSourceSelectionStore((state) => state.currentFilter);
  const updateFilter = useSourceSelectionStore((state) => state.updateFilter);
  const selectedFilterId = useSourceSelectionStore((state) => state.selectedFilterId);
  const channels = useSourceSelectionStore((state) => state.channels);
  const preview = useSourceSelectionStore((state) => state.preview);
  const hasActiveFilter = useSourceSelectionStore((state) => state.hasActiveFilter);
  const getFilterSummary = useSourceSelectionStore((state) => state.getFilterSummary);
  const canProceedToNext = useSourceSelectionStore((state) => state.canProceedToNext);

  // Data fetching - loading states come from React Query
  const { data: channelsData, isLoading: channelsLoading } = useChannels();
  const { data: playlistsData, isLoading: playlistsLoading } = usePlaylists();
  useSavedFilters(); // Load saved filters into store
  useSavedFilter(selectedFilterId); // Load selected filter into store
  
  // Preview with debounced query (React Query handles the debounce via staleTime)
  const { isLoading: previewLoading } = useFilterPreview(
    currentFilter,
    mode === 'filtered' && hasActiveFilter()
  );

  // Save filter mutation
  const saveFilterMutation = useSaveFilter();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');

  const totalVideos = channelsData?.summary.total_videos || 0;

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Filter name is required');
      return;
    }

    await saveFilterMutation.mutateAsync({
      name: filterName.trim(),
      description: filterDescription.trim() || undefined,
      filter_definition: currentFilter,
    });

    setSaveDialogOpen(false);
    setFilterName('');
    setFilterDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Source Selection
          </CardTitle>
          <CardDescription>
            Choose which videos from raw_videos to process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <Switch
                id="filter-mode"
                checked={mode === 'filtered'}
                onCheckedChange={(checked) => setMode(checked ? 'filtered' : 'all')}
              />
              <div>
                <Label htmlFor="filter-mode" className="text-base font-medium">
                  {mode === 'all' ? 'Process All Videos' : 'Filter Videos'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {mode === 'all'
                    ? `All ${totalVideos} videos will be processed`
                    : 'Select specific videos to process'}
                </p>
              </div>
            </div>
            
            <Badge variant="secondary" className="text-lg px-4 py-1">
              <Video className="h-4 w-4 mr-2" />
              {getFilterSummary()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter Configuration (only when filtered mode) */}
      {mode === 'filtered' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Filter Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Builder</CardTitle>
              <CardDescription>
                Configure filter criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="channels">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="grouping">Grouping</TabsTrigger>
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                </TabsList>

                <TabsContent value="channels" className="mt-4">
                  <ChannelSelector
                    channels={channels}
                    selectedChannels={currentFilter.channels || []}
                    onSelectionChange={(channelIds) =>
                      updateFilter({ channels: channelIds })
                    }
                    loading={channelsLoading}
                  />
                </TabsContent>

                <TabsContent value="grouping" className="mt-4 space-y-6">
                  <PlaylistSelector
                    playlists={playlistsData?.playlists || []}
                    selectedPlaylists={currentFilter.playlist_ids || []}
                    onSelectionChange={(ids) =>
                      updateFilter({ playlist_ids: ids.length > 0 ? ids : undefined })
                    }
                    loading={playlistsLoading}
                  />

                  <Separator />

                  <DateRangePresets
                    currentRange={currentFilter.date_range}
                    onRangeChange={(range) => updateFilter({ date_range: range })}
                  />
                </TabsContent>

                <TabsContent value="engagement" className="mt-4 space-y-6">
                  {/* Min Views */}
                  <div className="space-y-2">
                    <Label>Minimum Views</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[currentFilter.engagement?.min_views || 0]}
                        onValueChange={([value]) =>
                          updateFilter({
                            engagement: {
                              ...currentFilter.engagement,
                              min_views: value || undefined,
                            },
                          })
                        }
                        max={SOURCE_SELECTION.SLIDERS.VIEWS.MAX}
                        step={SOURCE_SELECTION.SLIDERS.VIEWS.STEP}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-20 text-right">
                        {currentFilter.engagement?.min_views?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Min Engagement Score */}
                  <div className="space-y-2">
                    <Label>Minimum Engagement Score</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[
                          (currentFilter.engagement?.min_engagement_score || 0) * 100,
                        ]}
                        onValueChange={([value]) =>
                          updateFilter({
                            engagement: {
                              ...currentFilter.engagement,
                              min_engagement_score: value > 0 ? value / 100 : undefined,
                            },
                          })
                        }
                        max={SOURCE_SELECTION.SLIDERS.ENGAGEMENT.MAX}
                        step={SOURCE_SELECTION.SLIDERS.ENGAGEMENT.STEP}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-20 text-right">
                        {((currentFilter.engagement?.min_engagement_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="mt-4 space-y-6">
                  {/* Has Transcript */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requires Transcript</Label>
                      <p className="text-sm text-muted-foreground">
                        Only include videos with transcripts
                      </p>
                    </div>
                    <Switch
                      checked={currentFilter.content?.has_transcript === true}
                      onCheckedChange={(checked) =>
                        updateFilter({
                          content: {
                            ...currentFilter.content,
                            has_transcript: checked || undefined,
                          },
                        })
                      }
                    />
                  </div>

                  <Separator />

                  {/* Result Limit */}
                  <div className="space-y-2">
                    <Label>Maximum Videos</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={currentFilter.limit || ''}
                      onChange={(e) =>
                        updateFilter({
                          limit: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      min={1}
                      max={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to process all matching videos
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Filter Button */}
              <div className="mt-6 pt-4 border-t flex justify-end">
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!hasActiveFilter() || saveFilterMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Filter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter</DialogTitle>
                      <DialogDescription>
                        Save this filter configuration for future use
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="filter-name">Name</Label>
                        <Input
                          id="filter-name"
                          placeholder="e.g., High Engagement Python Videos"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-desc">Description (optional)</Label>
                        <Input
                          id="filter-desc"
                          placeholder="Describe this filter..."
                          value={filterDescription}
                          onChange={(e) => setFilterDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSaveDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveFilter}
                        disabled={saveFilterMutation.isPending}
                      >
                        {saveFilterMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Right: Preview */}
          <div className="space-y-6">
            <FilterPreview
              preview={preview}
              loading={previewLoading}
            />

            {/* Saved Filters */}
            <SavedFiltersList />
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!canProceedToNext()}
          className="min-w-[200px]"
        >
          Continue to Configuration
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

