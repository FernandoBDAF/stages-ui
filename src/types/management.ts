// Management API Types

export interface CollectionInfo {
  name: string;
  count: number;
}

export interface DatabaseInfo {
  name: string;
  collections: CollectionInfo[];
}

export interface InspectDatabasesResponse {
  databases: DatabaseInfo[];
  timestamp: string;
}

export interface OperationProgress {
  processed: number;
  total: number;
  percent: number;
}

export type OperationStatusType = 'pending' | 'running' | 'completed' | 'failed';

export interface OperationStatus {
  operation_id: string;
  type: string;
  status: OperationStatusType;
  progress: OperationProgress;
  started_at: string;
  completed_at?: string;
  error?: string;
  params: Record<string, unknown>;
}

// Copy Collection
export interface CopyCollectionParams {
  source_db: string;
  target_db: string;
  collection: string;
  max_documents?: number | null;
  clear_target?: boolean;
}

export interface CopyCollectionResponse {
  operation_id?: string;
  status: string;
  documents_copied?: number;
  message?: string;
}

// Clean GraphRAG
export interface CleanGraphRAGParams {
  db_name: string;
  drop_collections?: string[];
  clear_chunk_metadata?: boolean;
}

export interface DroppedCollection {
  name: string;
  documents_deleted: number;
}

export interface CleanGraphRAGResponse {
  db_name: string;
  dropped_collections: DroppedCollection[];
  chunks_updated: number;
  success: boolean;
  timestamp: string;
}

// Clean Stage Status
export interface CleanStageStatusParams {
  db_name: string;
  stages: string[];
}

export interface CleanStageStatusResponse {
  db_name: string;
  stages_cleaned: string[];
  chunks_modified: number;
  success: boolean;
  timestamp: string;
}

// Setup Test DB
export interface SetupTestDBParams {
  source_db: string;
  target_db: string;
  chunk_count?: number;
  diversity_mode?: boolean;
}

export interface SetupTestDBResponse {
  source_db: string;
  target_db: string;
  chunks_selected: number;
  unique_videos: number;
  diversity_mode: boolean;
  success: boolean;
  timestamp: string;
}

// Rebuild Indexes
export interface RebuildIndexesParams {
  db_name: string;
  collections?: string[];
}

export interface IndexedCollection {
  name: string;
  indexes_created: string[];
}

export interface RebuildIndexesResponse {
  db_name: string;
  collections_indexed: IndexedCollection[];
  success: boolean;
  timestamp: string;
}

// Observability Health
export type ServiceStatus = 'healthy' | 'down' | 'degraded' | 'unknown';

export interface ServiceHealth {
  status: ServiceStatus;
  url: string;
  error?: string;
}

export interface HealthStatus {
  overall: ServiceStatus;
  services: {
    prometheus: ServiceHealth;
    grafana: ServiceHealth;
    loki: ServiceHealth;
  };
  timestamp: string;
}

// Graph Statistics (from Graph API)
export interface GraphStatistics {
  entities?: {
    total: number;
    by_type?: Record<string, number>;
  };
  relationships?: {
    total: number;
    by_type?: Record<string, number>;
  };
  communities?: {
    total: number;
    levels?: number[];
  };
  graph?: {
    avg_degree: number;
    max_degree: number;
    density: number;
    isolated_nodes: number;
    connected_components: number;
  };
}

