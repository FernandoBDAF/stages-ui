'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  FileText,
  Calendar,
  Eye,
  ExternalLink,
  ThumbsUp
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { FilterPreviewResponse, SampleVideo, FilterPreviewChannel } from '@/types/source-selection';

interface FilterPreviewProps {
  preview: FilterPreviewResponse | null;
  loading?: boolean;
}

export function FilterPreview({ preview, loading }: FilterPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Configure a filter to see preview</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    return `${Math.round(minutes)}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Filter Preview</span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {preview.total_matching} videos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warnings */}
        {preview.warnings.length > 0 && (
          <div className="space-y-2">
            {preview.warnings.map((warning, i) => (
              <Alert key={i} variant="default" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Channels"
            value={preview.channels.length.toString()}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Total Duration"
            value={formatDuration(preview.statistics.total_duration_minutes)}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg Engagement"
            value={`${(preview.statistics.avg_engagement * 100).toFixed(1)}%`}
          />
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Has Transcript"
            value={`${preview.statistics.transcript_coverage.toFixed(0)}%`}
          />
        </div>

        {/* Timeline Indicator */}
        {preview.date_range && (
          <TimelineIndicator dateRange={preview.date_range} />
        )}

        {/* Channel Distribution */}
        {preview.channels.length > 0 && (
          <ChannelDistribution 
            channels={preview.channels} 
            total={preview.total_matching} 
          />
        )}

        {/* Sample Videos */}
        {preview.sample_videos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Sample Videos</h4>
            <div className="space-y-2">
              {preview.sample_videos.map((video) => (
                <EnhancedSampleVideoCard key={video.video_id} video={video} />
              ))}
            </div>
          </div>
        )}

        {/* Large selection warning */}
        {preview.total_matching > 100 && (
          <Alert className="py-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
              Large selection ({preview.total_matching} videos) - processing may take a while
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function TimelineIndicator({ dateRange }: { dateRange: { earliest: string; latest: string } }) {
  const start = new Date(dateRange.earliest);
  const end = new Date(dateRange.latest);
  const span = differenceInDays(end, start);
  const today = new Date();
  
  // Calculate how much of the range has passed relative to today
  const totalRange = differenceInDays(today, start);
  const progressPct = totalRange > 0 && span > 0 
    ? Math.min(100, Math.max(0, (differenceInDays(end, start) / totalRange) * 100))
    : 100;

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Timeline
      </div>

      {/* Visual bar */}
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-primary/30 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
          <span>{format(start, 'MMM dd')}</span>
          <span className="text-muted-foreground">→</span>
          <span>{format(end, 'MMM dd')}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Earliest: {format(start, 'MMM dd, yyyy')}</span>
        <span className="font-medium text-foreground">{span} days span</span>
        <span>Latest: {format(end, 'MMM dd, yyyy')}</span>
      </div>
    </div>
  );
}

function ChannelDistribution({ 
  channels, 
  total 
}: { 
  channels: FilterPreviewChannel[]; 
  total: number; 
}) {
  const top5 = channels.slice(0, 5);

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Channel Distribution
      </div>

      <div className="space-y-2">
        {top5.map((channel) => {
          const percentage = total > 0 ? (channel.count / total) * 100 : 0;
          return (
            <div key={channel.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium truncate flex-1 mr-2">{channel.title}</span>
                <span className="text-muted-foreground shrink-0">
                  {channel.count} videos ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {channels.length > 5 && (
        <div className="text-xs text-muted-foreground text-center pt-1 border-t">
          +{channels.length - 5} more channels
        </div>
      )}
    </div>
  );
}

function EnhancedSampleVideoCard({ video }: { video: SampleVideo }) {
  const formatViews = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDurationSeconds = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openVideo = () => {
    window.open(`https://youtube.com/watch?v=${video.video_id}`, '_blank');
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors group">
      {/* Thumbnail with duration overlay */}
      {video.thumbnail_url && (
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-28 h-16 object-cover rounded"
          />
          {/* Duration overlay */}
          {video.duration_seconds && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded font-mono">
              {formatDurationSeconds(video.duration_seconds)}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div 
          className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
          onClick={openVideo}
          title={video.title}
        >
          {video.title}
        </div>
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {video.channel_title}
        </div>

        {/* Metrics row */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3 w-3" />
            {formatViews(video.stats.viewCount)}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <ThumbsUp className="h-3 w-3" />
            {formatViews(video.stats.likeCount)}
          </div>
          {video.engagement_score !== undefined && (
            <Badge 
              variant="secondary" 
              className="text-xs h-5 px-1.5"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {(video.engagement_score * 100).toFixed(0)}%
            </Badge>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(video.published_at), 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      {/* Action button */}
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center"
        onClick={openVideo}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}
