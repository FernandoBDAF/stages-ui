import { api } from './client';
import type { StagesResponse, StageConfigSchema } from '@/types/api';

export const stagesApi = {
  listStages: () => api.get<StagesResponse>('/stages'),
  
  listPipelineStages: (pipeline: string) =>
    api.get<StagesResponse>(`/stages/${pipeline}`),
  
  getStageConfig: (stageName: string) =>
    api.get<StageConfigSchema>(`/stages/${stageName}/config`),
  
  getStageDefaults: (stageName: string) =>
    api.get<Record<string, unknown>>(`/stages/${stageName}/defaults`),
};

