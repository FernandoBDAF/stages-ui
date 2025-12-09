// Pipeline types
export type PipelineType = 'graphrag' | 'ingestion';

export interface Pipeline {
  name: string;
  description: string;
  stages: string[];
  stage_count: number;
}

export interface Stage {
  name: string;
  display_name: string;
  description: string;
  pipeline: string;
  config_class: string;
  dependencies: string[];
  has_llm: boolean;
}

// Config schema types
export interface ConfigField {
  name: string;
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array';
  python_type: string;
  default: unknown;
  required: boolean;
  optional: boolean;
  description: string;
  category: string;
  ui_type: 'text' | 'number' | 'slider' | 'checkbox' | 'select' | 'multiselect';
  is_inherited: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  placeholder?: string;
  recommended?: unknown;
}

export interface Category {
  name: string;
  fields: string[];
  field_count: number;
}

export interface StageConfigSchema {
  stage_name: string;
  config_class: string;
  description: string;
  fields: ConfigField[];
  categories: Category[];
  field_count: number;
}

// Response types
export interface StagesResponse {
  pipelines: Record<string, Pipeline>;
  stages: Record<string, Stage>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  warnings: string[];
  execution_plan?: {
    stages: string[];
    resolved_dependencies: string[];
  };
}

export interface ExecutionResult {
  pipeline_id: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface HistoricalStats {
  avg: number;
  min: number;
  max: number;
  p90: number;
}

export interface HistoricalContext {
  sample_size: number;
  duration: HistoricalStats;
  cost: HistoricalStats;
  tokens: HistoricalStats;
}

export interface PipelineInsight {
  type: 'performance' | 'cost' | 'quality' | 'error' | 'info';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  suggestion?: string;
  config_change?: Record<string, unknown>;
  impact?: string;
}

export interface PipelineStatus {
  pipeline_id: string;
  pipeline?: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'error' | 'cancelled';
  current_stage: string | null;
  progress: {
    completed_stages: number;
    total_stages: number;
    percent: number;
  };
  elapsed_seconds: number;
  error?: string;
  // Historical context from Week 2
  context?: {
    historical: HistoricalContext;
    comparison: {
      vs_average: {
        trend: 'faster' | 'slower' | 'normal' | 'unknown';
        percent_diff: number;
      };
      percentile: number;
    };
  };
  insights?: PipelineInsight[];
}

// Health check types
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  version: string;
  timestamp: string;
  active_pipelines: number;
}

// Pipeline history types
export interface PipelineHistoryItem {
  pipeline_id: string;
  pipeline: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  stages: string[];
  progress: {
    total_stages: number;
    completed_stages: number;
    percent: number;
  };
  // Additional details
  duration_seconds?: number;
  exit_code?: number;
  error?: string;
  error_stage?: string;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PipelineHistoryResponse {
  total: number;
  returned: number;
  pipelines: PipelineHistoryItem[];
}

