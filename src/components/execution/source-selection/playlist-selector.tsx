'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { Search, ListVideo, X } from 'lucide-react';
import type { PlaylistInfo } from '@/types/source-selection';

interface PlaylistSelectorProps {
  playlists: PlaylistInfo[];
  selectedPlaylists: string[];
  onSelectionChange: (playlistIds: string[]) => void;
  loading?: boolean;
}

export function PlaylistSelector({
  playlists,
  selectedPlaylists,
  onSelectionChange,
  loading,
}: PlaylistSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const query = searchQuery.toLowerCase();
    return playlists.filter(
      (playlist) =>
        playlist.playlist_title.toLowerCase().includes(query) ||
        playlist.channel_title.toLowerCase().includes(query)
    );
  }, [playlists, searchQuery]);

  const togglePlaylist = (playlistId: string) => {
    if (selectedPlaylists.includes(playlistId)) {
      onSelectionChange(selectedPlaylists.filter((id) => id !== playlistId));
    } else {
      onSelectionChange([...selectedPlaylists, playlistId]);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Label>Select Playlists</Label>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="space-y-3">
        <Label>Select Playlists</Label>
        <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
          <ListVideo className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No playlists found</p>
          <p className="text-xs mt-1">Videos may not have playlist information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Select Playlists</Label>
        {selectedPlaylists.length > 0 && (
          <button
            onClick={clearSelection}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear ({selectedPlaylists.length})
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Videos from selected playlists will be included
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search playlists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected count */}
      {selectedPlaylists.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPlaylists.slice(0, 3).map((id) => {
            const playlist = playlists.find((p) => p.playlist_id === id);
            return (
              <Badge key={id} variant="secondary" className="text-xs">
                {playlist?.playlist_title || id}
              </Badge>
            );
          })}
          {selectedPlaylists.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{selectedPlaylists.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Playlist list */}
      <ScrollArea className="h-72 pr-4">
        <div className="space-y-2">
          {filteredPlaylists.map((playlist) => {
            const isSelected = selectedPlaylists.includes(playlist.playlist_id);
            return (
              <div
                key={playlist.playlist_id}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => togglePlaylist(playlist.playlist_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {playlist.playlist_title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {playlist.channel_title}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {playlist.video_count} videos
                      </span>
                      <span>
                        {(playlist.avg_engagement * 100).toFixed(0)}% avg engagement
                      </span>
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => togglePlaylist(playlist.playlist_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Filter results */}
      {searchQuery && filteredPlaylists.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No playlists match "{searchQuery}"
        </div>
      )}

      {searchQuery && filteredPlaylists.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Showing {filteredPlaylists.length} of {playlists.length} playlists
        </div>
      )}
    </div>
  );
}

