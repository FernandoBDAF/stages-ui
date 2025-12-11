// Viewer API Types
// Prefixed with "Viewer" to avoid conflicts with management.ts types

// =============================================================================
// Database and Collection Info
// =============================================================================

export interface ViewerDatabaseInfo {
  name: string;
  collections: number;
  total_documents: number;
}

export interface ViewerDatabasesResponse {
  databases: ViewerDatabaseInfo[];
  timestamp: string;
}

export interface ViewerCollectionInfo {
  name: string;
  document_count: number;
  suggested_renderer: 'long_text' | 'json' | 'table';
  text_field: string | null;
}

export interface ViewerCollectionsResponse {
  database: string;
  collections: ViewerCollectionInfo[];
  timestamp: string;
}

// =============================================================================
// Document and Query Types
// =============================================================================

export interface ViewerDocumentMetadata {
  suggested_renderer: 'long_text' | 'json' | 'table';
  text_field: string | null;
  field_count: number;
  has_nested: boolean;
}

export interface ViewerDocumentResponse {
  document: Record<string, unknown>;
  metadata: ViewerDocumentMetadata;
}

export interface ViewerQuerySort {
  field: string;
  order: 'asc' | 'desc';
}

export interface ViewerQueryRequest {
  db_name: string;
  collection_name: string;  // Backend expects collection_name
  filter?: Record<string, unknown>;
  projection?: string[];
  sort?: ViewerQuerySort[];
  skip?: number;
  limit?: number;
}

export interface ViewerQueryResponse {
  documents: Record<string, unknown>[];
  total: number;
  returned: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

// =============================================================================
// Schema Types
// =============================================================================

export interface ViewerSchemaField {
  types: string[];
  nullable: boolean;
  max_length: number;
}

export interface ViewerSchemaResponse {
  database: string;
  collection: string;
  document_count: number;
  fields: Record<string, ViewerSchemaField>;
  sample_size: number;
  suggested_renderer: 'long_text' | 'json' | 'table';
  text_field: string | null;
  timestamp: string;
}

// =============================================================================
// Renderer Types
// =============================================================================

export type ViewerRendererType = 'long_text' | 'json' | 'table' | 'chunks' | 'entity' | 'community';

export interface ViewerState {
  database: string | null;
  collection: string | null;
  documentId: string | null;
  renderer: ViewerRendererType;
}

// =============================================================================
// Collection-Specific Document Types
// =============================================================================

export interface ChunkDocument {
  _id: string;
  video_id?: string;
  chunk_index?: number;
  text?: string;
  graphrag_extraction?: { status?: string; timestamp?: string };
  graphrag_resolution?: { status?: string };
  graphrag_construction?: { status?: string };
  graphrag_communities?: { status?: string };
  [key: string]: unknown;
}

export interface EntityDocument {
  _id: string;
  name: string;
  type?: string;
  description?: string;
  aliases?: string[];
  mention_count?: number;
  [key: string]: unknown;
}

export interface CommunityDocument {
  _id: string;
  title?: string;
  summary?: string;
  level?: number;
  member_ids?: string[];
  member_count?: number;
  [key: string]: unknown;
}

// =============================================================================
// Type Aliases for page.tsx compatibility
// =============================================================================

export type RendererType = ViewerRendererType;
export type SortOption = ViewerQuerySort;
