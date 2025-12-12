'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Video, Eye, TrendingUp } from 'lucide-react';
import type { ChannelInfo } from '@/types/source-selection';

interface ChannelSelectorProps {
  channels: ChannelInfo[];
  selectedChannels: string[];
  onSelectionChange: (channelIds: string[]) => void;
  loading?: boolean;
}

export function ChannelSelector({
  channels,
  selectedChannels,
  onSelectionChange,
  loading = false,
}: ChannelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter(
      (c) =>
        c.channel_title.toLowerCase().includes(query) ||
        c.channel_id.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  const handleToggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      onSelectionChange(selectedChannels.filter((id) => id !== channelId));
    } else {
      onSelectionChange([...selectedChannels, channelId]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredChannels.map((c) => c.channel_id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Channels ({selectedChannels.length} / {channels.length})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={selectedChannels.length === filteredChannels.length}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedChannels.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Channel List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredChannels.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No channels found
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = selectedChannels.includes(channel.channel_id);
              
              return (
                <div
                  key={channel.channel_id}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleToggleChannel(channel.channel_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggleChannel(channel.channel_id);
                    }
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleChannel(channel.channel_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {channel.channel_title}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {channel.video_count} videos
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(channel.total_views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {(channel.avg_engagement * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {channel.transcript_coverage < 80 && (
                    <Badge variant="outline" className="text-xs">
                      {channel.transcript_coverage.toFixed(0)}% transcripts
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

