import { api } from './client';

// Types for metrics response
export interface PipelineMetrics {
  timestamp: string;
  pipeline_id: string | null;
  
  pipeline: {
    active_count: number;
    total_executions: number;
    success_rate: number;
  };
  
  llm: {
    total_calls: number;
    total_cost_usd: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
  
  processing: {
    documents_processed: number;
    documents_failed: number;
    entities_extracted: number;
    relationships_created: number;
  };
  
  stages: Record<string, {
    duration: number;
    executions: number;
    errors: number;
    status: string;
  }>;
  
  errors: {
    total: number;
    by_type: Record<string, number>;
  };
}

export interface LiveMetrics {
  cost_usd: number;
  tokens_used: number;
  documents_processed: number;
  current_stage_duration: number;
  is_faster_than_average: boolean;
  percent_vs_average: number;
}

// API functions
export const metricsApi = {
  /**
   * Get global metrics (all pipelines)
   */
  getGlobal: () => 
    api.get<PipelineMetrics>('/metrics'),
  
  /**
   * Get metrics for specific pipeline
   */
  getForPipeline: (pipelineId: string) =>
    api.get<PipelineMetrics>(`/metrics/${pipelineId}`),
  
  /**
   * Get live metrics for running pipeline (combines status + metrics)
   */
  getLive: async (pipelineId: string): Promise<LiveMetrics> => {
    try {
      const metrics = await api.get<PipelineMetrics>(`/metrics/${pipelineId}`);
      
      return {
        cost_usd: metrics.llm.total_cost_usd,
        tokens_used: metrics.llm.tokens.total,
        documents_processed: metrics.processing.documents_processed,
        current_stage_duration: 0, // Duration is tracked via status polling
        is_faster_than_average: false, // TODO: implement historical comparison
        percent_vs_average: 0,
      };
    } catch {
      // Return default values if metrics not available
      return {
        cost_usd: 0,
        tokens_used: 0,
        documents_processed: 0,
        current_stage_duration: 0,
        is_faster_than_average: false,
        percent_vs_average: 0,
      };
    }
  }
};

