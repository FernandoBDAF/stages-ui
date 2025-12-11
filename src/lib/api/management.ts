import { api } from './client';
import type {
  InspectDatabasesResponse,
  OperationStatus,
  CopyCollectionParams,
  CopyCollectionResponse,
  CleanGraphRAGParams,
  CleanGraphRAGResponse,
  CleanStageStatusParams,
  CleanStageStatusResponse,
  SetupTestDBParams,
  SetupTestDBResponse,
  RebuildIndexesParams,
  RebuildIndexesResponse,
  HealthStatus,
} from '@/types/management';

/**
 * Management API client
 * Uses the existing api client with retry logic
 */
export const managementApi = {
  /** Inspect all databases and their collections */
  inspectDatabases: () =>
    api.get<InspectDatabasesResponse>('/management/inspect-databases'),

  /** Get status of a long-running operation */
  getOperationStatus: (operationId: string) =>
    api.get<OperationStatus>(`/management/operations/${operationId}`),

  /** Copy a collection from one database to another */
  copyCollection: (params: CopyCollectionParams) =>
    api.post<CopyCollectionResponse>('/management/copy-collection', params),

  /** Clean GraphRAG data from a database */
  cleanGraphRAGData: (params: CleanGraphRAGParams) =>
    api.post<CleanGraphRAGResponse>('/management/clean-graphrag', params),

  /** Clean stage processing status from chunks */
  cleanStageStatus: (params: CleanStageStatusParams) =>
    api.post<CleanStageStatusResponse>('/management/clean-stage-status', params),

  /** Setup a test database with diverse chunks */
  setupTestDatabase: (params: SetupTestDBParams) =>
    api.post<SetupTestDBResponse>('/management/setup-test-db', params),

  /** Rebuild indexes for collections */
  rebuildIndexes: (params: RebuildIndexesParams) =>
    api.post<RebuildIndexesResponse>('/management/rebuild-indexes', params),

  /** Get observability health status */
  getObservabilityHealth: () =>
    api.get<HealthStatus>('/observability/health'),
};

