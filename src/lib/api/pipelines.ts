import { api } from './client';
import type { ValidationResult, ExecutionResult, PipelineStatus, PipelineHistoryResponse } from '@/types/api';

export const pipelinesApi = {
  validate: (
    pipeline: string,
    stages: string[],
    config: Record<string, Record<string, unknown>>
  ) =>
    api.post<ValidationResult>('/pipelines/validate', {
      pipeline,
      stages,
      config,
    }),

  execute: (
    pipeline: string,
    stages: string[],
    config: Record<string, Record<string, unknown>>,
    metadata?: Record<string, unknown>
  ) =>
    api.post<ExecutionResult>('/pipelines/execute', {
      pipeline,
      stages,
      config,
      metadata,
    }),

  getStatus: (pipelineId: string) =>
    api.get<PipelineStatus>(`/pipelines/${pipelineId}/status`),

  cancel: (pipelineId: string) =>
    api.post<{ success: boolean }>(`/pipelines/${pipelineId}/cancel`, {}),

  getHistory: (limit: number = 10) =>
    api.get<PipelineHistoryResponse>(`/pipelines/history?limit=${limit}`),
};

