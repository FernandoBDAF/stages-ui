import type { RendererType } from '@/types/viewer-api';

// Collection-specific renderer overrides
const COLLECTION_RENDERERS: Record<string, RendererType> = {
  video_chunks: 'chunks',
  entities: 'entity',
  communities: 'community',
  // Others use their suggested_renderer from the API
};

// Available renderers by collection type
const COLLECTION_AVAILABLE_RENDERERS: Record<string, RendererType[]> = {
  video_chunks: ['chunks', 'table', 'json'],
  entities: ['entity', 'table', 'json'],
  communities: ['community', 'table', 'json'],
  raw_videos: ['long_text', 'json', 'table'],
  cleaned_transcripts: ['long_text', 'json', 'table'],
};

// Default renderers for unknown collections
const DEFAULT_RENDERERS: RendererType[] = ['json', 'table', 'long_text'];

// Source field mapping for timeline (matches backend TRACKED_COLLECTIONS)
const COLLECTION_SOURCE_FIELDS: Record<string, string> = {
  video_chunks: 'video_id',
  cleaned_transcripts: 'video_id',
  enriched_transcripts: 'video_id',
  entities: 'video_id',
  communities: 'video_id',
};

/**
 * Select appropriate renderer based on collection name
 */
export function selectRenderer(collectionName: string, defaultRenderer: RendererType): RendererType {
  // Check for collection-specific renderer first
  if (collectionName in COLLECTION_RENDERERS) {
    return COLLECTION_RENDERERS[collectionName];
  }

  // Use provided default renderer
  return defaultRenderer;
}

/**
 * Get available renderers for a collection
 */
export function getAvailableRenderers(collectionName: string): RendererType[] {
  return COLLECTION_AVAILABLE_RENDERERS[collectionName] || DEFAULT_RENDERERS;
}

/**
 * Get renderer display name
 */
export function getRendererDisplayName(renderer: RendererType): string {
  const names: Record<RendererType, string> = {
    long_text: 'Text Viewer',
    json: 'JSON Tree',
    table: 'Table View',
    chunks: 'Chunks Browser',
    entity: 'Entity Cards',
    community: 'Community View',
  };
  return names[renderer] || renderer;
}

/**
 * Check if renderer supports split view (raw vs cleaned comparison)
 */
export function rendererSupportsSplitView(renderer: RendererType): boolean {
  return renderer === 'long_text';
}

/**
 * Check if renderer supports text search
 */
export function rendererSupportsSearch(renderer: RendererType): boolean {
  return renderer === 'long_text' || renderer === 'entity';
}

/**
 * Check if renderer supports entity highlighting
 */
export function rendererSupportsEntityHighlight(renderer: RendererType): boolean {
  return renderer === 'long_text' || renderer === 'chunks';
}

/**
 * Get the source field for timeline queries
 * Returns the field that groups related documents (e.g., video_id for video_chunks)
 */
export function getSourceField(collectionName: string): string | undefined {
  return COLLECTION_SOURCE_FIELDS[collectionName];
}
