// =============================================================================
// Comparison Types
// =============================================================================

export interface CompareResponse {
  left: Record<string, unknown>;
  right: Record<string, unknown>;
  diff: DocumentDiff;
  metrics: ComparisonMetrics;
  timestamp: string;
}

export interface DocumentDiff {
  added_fields: string[];
  removed_fields: string[];
  changed_fields: ChangedField[];
  unchanged_fields: string[];
}

export interface ChangedField {
  field: string;
  left_value: unknown;
  right_value: unknown;
  similarity?: number;
  changes?: TextChange[];
}

export interface TextChange {
  type: 'insert' | 'delete' | 'replace';
  text?: string;
  left_text?: string;
  right_text?: string;
  position?: [number, number];
  left_position?: [number, number];
  right_position?: [number, number];
}

export interface ComparisonMetrics {
  overall_similarity: number;
  field_count_delta: number;
  text_length_delta: number;
}

// =============================================================================
// Timeline Types
// =============================================================================

export interface TimelineResponse {
  source_id: string;
  collection: string;
  source_field: string;
  timeline: TimelineEntry[];
  total_versions: number;
  timestamp: string;
}

export interface TimelineEntry {
  doc_id: string;
  version: number;
  timestamp: string;
  stage_status?: Record<string, string>;
  changes_from_previous?: {
    similarity: number;
    field_count_delta: number;
  };
}

// =============================================================================
// Re-run Suggestion Types
// =============================================================================

export interface SuggestRerunRequest {
  db_name: string;
  collection_name: string;
  doc_id: string;
  issue_type?: string;
}

export interface SuggestRerunResponse {
  doc_id: string;
  collection: string;
  detected_issues: DetectedIssue[];
  suggestions: RerunSuggestion[];
  execution_link: string;
  timestamp: string;
}

export interface DetectedIssue {
  type: string;
  description: string;
  field: string;
  confidence: number;
}

export interface RerunSuggestion {
  stage: string;
  params: Record<string, unknown>;
  reason: string;
  confidence: number;
  for_issue?: string;
}

// =============================================================================
// Run History Types
// =============================================================================

export interface RunHistoryResponse {
  doc_id: string;
  collection: string;
  runs: PipelineRun[];
  total_runs: number;
  message?: string;
  timestamp: string;
}

export interface PipelineRun {
  run_id: string;
  pipeline: string;
  stage: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  params?: Record<string, unknown>;
}

// =============================================================================
// Deep Link Types
// =============================================================================

export interface ExecutionDeepLink {
  stage: string;
  input: string;
  collection: string;
  db: string;
  params?: Record<string, unknown>;
  returnTo?: string;
}

export interface GraphDashDeepLink {
  entityId: string;
  db: string;
  highlight?: boolean;
  expandRelations?: boolean;
}

export interface ManagementDeepLink {
  action: 'clean' | 'copy' | 'delete';
  db: string;
  collection: string;
  filter?: Record<string, unknown>;
  selectedIds?: string[];
}


