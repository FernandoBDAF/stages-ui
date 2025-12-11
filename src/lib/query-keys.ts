/**
 * Centralized query keys for React Query
 * Helps prevent typos and enables easy cache invalidation
 */
export const queryKeys = {
  // Pipeline-related queries
  stages: ['stages'] as const,
  stageConfig: (stageName: string) => ['stage-config', stageName] as const,
  stageDefaults: (stageName: string) => ['stage-defaults', stageName] as const,
  pipelineHistory: (limit: number) => ['pipeline-history', limit] as const,

  // Management-related queries
  management: {
    all: ['management'] as const,
    databases: () => [...queryKeys.management.all, 'databases'] as const,
    operation: (id: string) => [...queryKeys.management.all, 'operation', id] as const,
    health: () => [...queryKeys.management.all, 'health'] as const,
  },

  // Graph statistics
  graphStatistics: (dbName: string) => ['graph-statistics', dbName] as const,
};

