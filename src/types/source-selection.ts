/**
 * Source Selection Module Types
 * 
 * Types for filtering raw_videos before pipeline execution.
 */

// ============================================================
// Filter Definition Types
// ============================================================

export interface FilterDefinition {
  /** Array of channel_ids to include */
  channels?: string[];
  
  /** Date range filter on published_at */
  date_range?: {
    start?: string;  // ISO date string
    end?: string;
  };
  
  /** Engagement metrics filters */
  engagement?: {
    min_views?: number;
    max_views?: number;
    min_engagement_score?: number;
  };
  
  /** Content-based filters */
  content?: {
    keywords_any?: string[];   // Match any keyword
    keywords_all?: string[];   // Match all keywords
    has_transcript?: boolean;
  };
  
  /** Duration filter in seconds */
  duration?: {
    min_seconds?: number;
    max_seconds?: number;
  };
  
  /** Playlist filter */
  playlist_ids?: string[];
  
  /** Sort configuration */
  sort?: {
    field: 'published_at' | 'engagement_score' | 'stats.viewCount';
    order: 'asc' | 'desc';
  };
  
  /** Maximum videos to process */
  limit?: number;
}

// ============================================================
// Channel Statistics Types
// ============================================================

export interface ChannelInfo {
  channel_id: string;
  channel_title: string;
  video_count: number;
  total_views: number;
  total_likes: number;
  avg_engagement: number;
  avg_duration_minutes: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  transcript_coverage: number;
}

export interface ChannelsResponse {
  db_name: string;
  source_db?: string;
  collection: string;
  channels: ChannelInfo[];
  summary: {
    total_videos: number;
    total_channels: number;
  };
  timestamp: string;
}

// ============================================================
// Playlist Types
// ============================================================

export interface PlaylistInfo {
  playlist_id: string;
  playlist_title: string;
  channel_id: string;
  channel_title: string;
  video_count: number;
  avg_engagement: number;
  date_range: {
    earliest: string;
    latest: string;
  };
}

export interface PlaylistsResponse {
  db_name: string;
  source_db: string;
  playlists: PlaylistInfo[];
  total_playlists: number;
  timestamp: string;
}

// ============================================================
// Filter Preview Types
// ============================================================

export interface FilterPreviewChannel {
  id: string;
  title: string;
  count: number;
}

export interface SampleVideo {
  video_id: string;
  title: string;
  channel_title: string;
  channel_id: string;
  published_at: string;
  thumbnail_url: string;
  stats: {
    viewCount: number;
    likeCount: number;
  };
  duration_seconds?: number;
  engagement_score?: number;
}

export interface FilterPreviewResponse {
  total_matching: number;
  channels: FilterPreviewChannel[];
  date_range: {
    earliest: string;
    latest: string;
  } | null;
  statistics: {
    total_duration_minutes: number;
    avg_engagement: number;
    avg_views: number;
    transcript_coverage: number;
  };
  sample_videos: SampleVideo[];
  warnings: string[];
  query?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================
// Saved Filter Types
// ============================================================

export interface SavedFilterSummary {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  use_count: number;
}

export interface SavedFilter extends SavedFilterSummary {
  filter_definition: FilterDefinition;
}

export interface SavedFiltersResponse {
  db_name: string;
  filters: SavedFilterSummary[];
  count: number;
  timestamp: string;
}

export interface SaveFilterResponse {
  db_name: string;
  filter: SavedFilter;
  message: string;
}

// ============================================================
// Resolution Types
// ============================================================

export interface ResolveFilterResponse {
  db_name: string;
  video_ids: string[];
  count: number;
  filter_applied: boolean;
  timestamp: string;
}

// ============================================================
// Store Types
// ============================================================

export type SelectionMode = 'all' | 'filtered';

export type WizardStep = 'source_selection' | 'configuration' | 'execution';

// Note: Loading states are NOT included here - they come from React Query's
// isLoading/isPending states. This avoids duplicate state management.

// ============================================================
// Error Response Types
// ============================================================

export interface SourceSelectionErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================
// API Request Types
// ============================================================

export interface PreviewFilterRequest {
  db_name: string;
  filter: FilterDefinition;
  sample_limit?: number;
}

export interface SaveFilterRequest {
  name: string;
  description?: string;
  filter_definition: FilterDefinition;
}

export interface ResolveFilterRequest {
  db_name: string;
  filter_id?: string;
  filter_definition?: FilterDefinition;
}

