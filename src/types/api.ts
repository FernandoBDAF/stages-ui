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

export interface PipelineStatus {
  pipeline_id: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'error' | 'cancelled';
  current_stage: string | null;
  progress: {
    completed_stages: number;
    total_stages: number;
    percent: number;
  };
  elapsed_seconds: number;
  error?: string;
}

