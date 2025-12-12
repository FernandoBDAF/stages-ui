/**
 * Prompts API Client
 * 
 * API methods for managing agent prompts.
 */

import { api } from './client';

// ============================================================================
// Types
// ============================================================================

export interface PromptPerformanceMetrics {
  avg_quality_score?: number;
  avg_latency_ms?: number;
  sample_size?: number;
}

export interface PromptSummary {
  prompt_id: string;
  name: string;
  description: string;
  version: string;
  is_default: boolean;
  tags: string[];
  performance_metrics?: PromptPerformanceMetrics;
}

export interface PromptDetail extends PromptSummary {
  agent_type: string;
  system_prompt: string;
  user_prompt_template: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PromptsListResponse {
  prompts_by_agent: Record<string, PromptSummary[]>;
  agent_types: string[];
  total: number;
  cache_info?: {
    loaded: boolean;
    last_load: string | null;
    total_prompts: number;
    agent_types: string[];
    prompts_per_agent: Record<string, number>;
  };
  timestamp: string;
}

export interface AgentPromptsResponse {
  agent_type: string;
  prompts: PromptSummary[];
  total: number;
  timestamp: string;
}

export interface PromptDetailResponse {
  prompt: PromptDetail;
  timestamp: string;
}

export interface TestPromptRequest {
  test_input: Record<string, string>;
  model_name?: string;
}

export interface TestPromptResponse {
  prompt_id: string;
  agent_type: string;
  model_used?: string;
  test_input: Record<string, string>;
  rendered_prompts: {
    system_prompt: string;
    user_prompt: string;
  };
  output: string | null;
  output_length: number;
  elapsed_seconds: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ReloadPromptsResponse {
  message: string;
  cache_info: {
    loaded: boolean;
    last_load: string | null;
    total_prompts: number;
    agent_types: string[];
    prompts_per_agent: Record<string, number>;
  };
  timestamp: string;
}

// ============================================================================
// API Methods
// ============================================================================

const BASE_PATH = '/prompts';

export const promptsApi = {
  /**
   * List all prompts grouped by agent type
   */
  list: async (): Promise<PromptsListResponse> => {
    return api.get<PromptsListResponse>(BASE_PATH);
  },

  /**
   * List prompts for a specific agent type
   */
  listForAgent: async (agentType: string): Promise<AgentPromptsResponse> => {
    return api.get<AgentPromptsResponse>(`${BASE_PATH}/${agentType}`);
  },

  /**
   * Get full details for a specific prompt
   */
  getDetail: async (promptId: string): Promise<PromptDetailResponse> => {
    return api.get<PromptDetailResponse>(`${BASE_PATH}/detail/${promptId}`);
  },

  /**
   * Test a prompt with sample input
   */
  test: async (
    promptId: string,
    testInput: Record<string, string>,
    modelName?: string
  ): Promise<TestPromptResponse> => {
    const request: TestPromptRequest = {
      test_input: testInput,
      model_name: modelName,
    };
    return api.post<TestPromptResponse>(`${BASE_PATH}/${promptId}/test`, request);
  },

  /**
   * Force reload prompts from database
   */
  reload: async (): Promise<ReloadPromptsResponse> => {
    return api.post<ReloadPromptsResponse>(`${BASE_PATH}/reload`, {});
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map stage name to agent type for prompt lookup
 */
export function getAgentTypeForStage(stageName: string): string | null {
  const stageToAgent: Record<string, string> = {
    'clean': 'TranscriptCleanAgent',
    'enrich': 'TranscriptEnrichAgent',
    'chunk': 'ChunkingAgent',
    'graph_extraction': 'GraphExtractionAgent',
    'entity_resolution': 'EntityResolutionAgent',
    // Add more mappings as needed
  };
  
  return stageToAgent[stageName] || null;
}

/**
 * Check if a stage supports prompt selection
 */
export function stageSupportsPromptSelection(stageName: string): boolean {
  return getAgentTypeForStage(stageName) !== null;
}

