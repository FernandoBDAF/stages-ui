/**
 * Viewer Collection Filter Types
 * 
 * These types define the filter interfaces for the Viewer module,
 * allowing users to filter documents within collections.
 */

// =============================================================================
// Base Filter Interface
// =============================================================================

export interface ViewerFilter {
  /** Text search across multiple fields */
  search?: string;
}

// =============================================================================
// Collection-Specific Filters
// =============================================================================

/**
 * Filter for entities collection
 */
export interface EntityFilter extends ViewerFilter {
  /** Entity types: PERSON, ORGANIZATION, LOCATION, etc. */
  types?: string[];
  /** Minimum trust/confidence score (0-1 range) */
  minTrustScore?: number;
  /** Minimum mention count */
  minMentions?: number;
  /** Filter by presence of description */
  hasDescription?: boolean;
}

/**
 * Filter for video_chunks collection
 */
export interface ChunkFilter extends ViewerFilter {
  /** Processing status: completed, failed, pending, warning */
  processingStatus?: ('completed' | 'failed' | 'pending' | 'warning')[];
  /** Filter by specific processing stages */
  stages?: ('extraction' | 'resolution' | 'construction' | 'communities')[];
  /** Show only chunks with errors */
  hasErrors?: boolean;
  /** Filter by video ID */
  videoId?: string;
}

/**
 * Filter for raw_videos, cleaned_transcripts, enriched_transcripts collections
 */
export interface VideoFilter extends ViewerFilter {
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Minimum view count */
  minViews?: number;
  /** Maximum view count */
  maxViews?: number;
  /** Filter by transcript presence */
  hasTranscript?: boolean;
  /** Filter by date range */
  dateRange?: {
    start?: string;  // ISO date string
    end?: string;    // ISO date string
  };
}

// =============================================================================
// Union Type
// =============================================================================

/** Union of all filter types */
export type CollectionFilter = ViewerFilter | EntityFilter | ChunkFilter | VideoFilter;

// =============================================================================
// Saved Filter Preset
// =============================================================================

export interface SavedFilter {
  id: string;
  name: string;
  collection: string;
  filter: CollectionFilter;
  createdAt: string;
}

// =============================================================================
// Filter to MongoDB Query Converter
// =============================================================================

/**
 * Convert UI filter to MongoDB query
 * 
 * @param filter - The UI filter object
 * @returns MongoDB-compatible query object
 */
export function filterToMongoQuery(filter: CollectionFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  
  if (!filter) return query;
  
  // Text search - search across common text fields
  if (filter.search && filter.search.trim()) {
    const searchTerm = filter.search.trim();
    query.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { name: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { text: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { video_title: { $regex: searchTerm, $options: 'i' } },
    ];
  }
  
  // ==========================================================================
  // Entity-specific filters
  // ==========================================================================
  
  if ('types' in filter && filter.types && filter.types.length > 0) {
    query.type = { $in: filter.types };
  }
  
  if ('minTrustScore' in filter && filter.minTrustScore !== undefined && filter.minTrustScore > 0) {
    // Try both trust_score and confidence fields
    query.$and = query.$and || [];
    (query.$and as unknown[]).push({
      $or: [
        { trust_score: { $gte: filter.minTrustScore } },
        { confidence: { $gte: filter.minTrustScore } },
      ]
    });
  }
  
  if ('minMentions' in filter && filter.minMentions !== undefined && filter.minMentions > 0) {
    query.mention_count = { $gte: filter.minMentions };
  }
  
  if ('hasDescription' in filter && filter.hasDescription !== undefined) {
    if (filter.hasDescription) {
      query.description = { $exists: true, $nin: ['', null] };
    } else {
      query.$or = [
        { description: { $exists: false } },
        { description: '' },
        { description: null },
      ];
    }
  }
  
  // ==========================================================================
  // Chunk-specific filters
  // ==========================================================================
  
  if ('processingStatus' in filter && filter.processingStatus && filter.processingStatus.length > 0) {
    query['graphrag_extraction.status'] = { $in: filter.processingStatus };
  }
  
  if ('hasErrors' in filter && filter.hasErrors === true) {
    query['graphrag_extraction.error'] = { $exists: true, $ne: null };
  }
  
  if ('videoId' in filter && filter.videoId && filter.videoId.trim()) {
    query.video_id = filter.videoId.trim();
  }
  
  // ==========================================================================
  // Video-specific filters
  // ==========================================================================
  
  if ('channelIds' in filter && filter.channelIds && filter.channelIds.length > 0) {
    query.channel_id = { $in: filter.channelIds };
  }
  
  if ('minViews' in filter && filter.minViews !== undefined && filter.minViews > 0) {
    query['stats.viewCount'] = { $gte: filter.minViews };
  }
  
  if ('maxViews' in filter && filter.maxViews !== undefined) {
    const viewQuery = query['stats.viewCount'] as Record<string, number> || {};
    viewQuery.$lte = filter.maxViews;
    query['stats.viewCount'] = viewQuery;
  }
  
  if ('hasTranscript' in filter && filter.hasTranscript !== undefined) {
    if (filter.hasTranscript) {
      query.$or = [
        { transcript: { $exists: true, $nin: [null, ''] } },
        { transcript_raw: { $exists: true, $nin: [null, ''] } },
        { content: { $exists: true, $nin: [null, ''] } },
      ];
    } else {
      query.$and = query.$and || [];
      (query.$and as unknown[]).push({
        $or: [
          { transcript: { $in: [null, ''] } },
          { transcript: { $exists: false } },
        ]
      });
    }
  }
  
  if ('dateRange' in filter && filter.dateRange) {
    const { start, end } = filter.dateRange;
    if (start || end) {
      const dateQuery: Record<string, string> = {};
      if (start) dateQuery.$gte = start;
      if (end) dateQuery.$lte = end;
      query.published_at = dateQuery;
    }
  }
  
  return query;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Count active filters in a filter object
 */
export function countActiveFilters(filter: CollectionFilter): number {
  let count = 0;
  
  if (filter.search) count++;
  if ('types' in filter && filter.types?.length) count++;
  if ('minTrustScore' in filter && filter.minTrustScore && filter.minTrustScore > 0) count++;
  if ('minMentions' in filter && filter.minMentions && filter.minMentions > 0) count++;
  if ('hasDescription' in filter && filter.hasDescription !== undefined) count++;
  if ('processingStatus' in filter && filter.processingStatus?.length) count++;
  if ('hasErrors' in filter && filter.hasErrors) count++;
  if ('videoId' in filter && filter.videoId) count++;
  if ('channelIds' in filter && filter.channelIds?.length) count++;
  if ('minViews' in filter && filter.minViews && filter.minViews > 0) count++;
  if ('maxViews' in filter && filter.maxViews !== undefined) count++;
  if ('hasTranscript' in filter && filter.hasTranscript !== undefined) count++;
  if ('dateRange' in filter && (filter.dateRange?.start || filter.dateRange?.end)) count++;
  
  return count;
}

/**
 * Determine filter type based on collection name
 */
export function getFilterType(collection: string): 'entity' | 'chunk' | 'video' | 'generic' {
  if (collection === 'entities') return 'entity';
  if (collection === 'video_chunks') return 'chunk';
  if (['raw_videos', 'cleaned_transcripts', 'enriched_transcripts'].includes(collection)) return 'video';
  return 'generic';
}

/**
 * Create an empty filter for a collection type
 */
export function createEmptyFilter(collection: string): CollectionFilter {
  const type = getFilterType(collection);
  switch (type) {
    case 'entity':
      return {} as EntityFilter;
    case 'chunk':
      return {} as ChunkFilter;
    case 'video':
      return {} as VideoFilter;
    default:
      return {} as ViewerFilter;
  }
}


