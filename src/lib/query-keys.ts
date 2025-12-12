/**
 * Centralized query keys for React Query
 * Helps prevent typos and enables easy cache invalidation
 */

/**
 * Create a stable cache key for filter objects.
 * Ensures consistent key generation regardless of property order.
 */
function createFilterCacheKey(filter: Record<string, unknown>): string {
  const sortedKeys = Object.keys(filter).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = filter[key];
  }
  return JSON.stringify(sortedObj);
}

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

  // Viewer-related queries
  viewer: {
    all: ['viewer'] as const,
    databases: () => [...queryKeys.viewer.all, 'databases'] as const,
    collections: (dbName: string) => [...queryKeys.viewer.all, 'collections', dbName] as const,
    document: (dbName: string, collectionName: string, documentId: string) => 
      [...queryKeys.viewer.all, 'document', dbName, collectionName, documentId] as const,
    query: (dbName: string, collectionName: string) => 
      [...queryKeys.viewer.all, 'query', dbName, collectionName] as const,
    schema: (dbName: string, collectionName: string) => 
      [...queryKeys.viewer.all, 'schema', dbName, collectionName] as const,
  },

  // Iteration-related queries (compare, timeline, suggestions)
  iteration: {
    all: ['iteration'] as const,
    compare: (db: string, coll: string, id1: string, id2: string) => 
      [...queryKeys.iteration.all, 'compare', db, coll, id1, id2] as const,
    timeline: (db: string, coll: string, sourceId: string) => 
      [...queryKeys.iteration.all, 'timeline', db, coll, sourceId] as const,
    suggestions: (db: string, coll: string, docId: string, issueType?: string) => 
      [...queryKeys.iteration.all, 'suggestions', db, coll, docId, issueType] as const,
    history: (db: string, coll: string, docId: string) => 
      [...queryKeys.iteration.all, 'history', db, coll, docId] as const,
  },

  // Source Selection queries
  sourceSelection: {
    all: ['source-selection'] as const,
    channels: (dbName: string) => 
      [...queryKeys.sourceSelection.all, 'channels', dbName] as const,
    playlists: (dbName: string) => 
      [...queryKeys.sourceSelection.all, 'playlists', dbName] as const,
    filters: (dbName: string) => 
      [...queryKeys.sourceSelection.all, 'filters', dbName] as const,
    filter: (dbName: string, filterId: string) => 
      [...queryKeys.sourceSelection.filters(dbName), filterId] as const,
    preview: (dbName: string, filter: Record<string, unknown>) => 
      [...queryKeys.sourceSelection.all, 'preview', dbName, createFilterCacheKey(filter)] as const,
  },

  // Graph statistics
  graphStatistics: (dbName: string) => ['graph-statistics', dbName] as const,
};

