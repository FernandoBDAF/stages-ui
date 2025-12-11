'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managementApi } from '@/lib/api/management';
import { queryKeys } from '@/lib/query-keys';
import type {
  OperationStatus,
  CopyCollectionParams,
  CleanGraphRAGParams,
  CleanStageStatusParams,
  SetupTestDBParams,
  RebuildIndexesParams,
  GraphStatistics,
} from '@/types/management';

const GRAPH_API_URL = process.env.NEXT_PUBLIC_GRAPH_API_URL || 'http://localhost:8081';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook for fetching database information
 */
export function useDatabaseInspector() {
  return useQuery({
    queryKey: queryKeys.management.databases(),
    queryFn: managementApi.inspectDatabases,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
}

/**
 * Hook for polling operation status
 */
export function useOperationStatus(operationId: string | null) {
  return useQuery({
    queryKey: queryKeys.management.operation(operationId || ''),
    queryFn: () => managementApi.getOperationStatus(operationId!),
    enabled: !!operationId,
    refetchInterval: (query) => {
      const data = query.state.data as OperationStatus | undefined;
      // Stop polling when operation completes or fails
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 1000; // Poll every second while running
    },
  });
}

/**
 * Hook for observability health status
 */
export function useObservabilityHealth() {
  return useQuery({
    queryKey: queryKeys.management.health(),
    queryFn: managementApi.getObservabilityHealth,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000,
  });
}

/**
 * Hook for fetching graph statistics from Graph API
 */
export function useGraphStatistics(dbName: string | null) {
  return useQuery({
    queryKey: queryKeys.graphStatistics(dbName || ''),
    queryFn: async () => {
      const response = await fetch(`${GRAPH_API_URL}/api/statistics?db_name=${dbName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      return response.json() as Promise<GraphStatistics>;
    },
    enabled: !!dbName,
    staleTime: 30000,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for copying collections
 */
export function useCopyCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CopyCollectionParams) => managementApi.copyCollection(params),
    onSuccess: () => {
      // Invalidate database inspection to show new data
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases() });
    },
  });
}

/**
 * Hook for cleaning GraphRAG data
 */
export function useCleanGraphRAG() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CleanGraphRAGParams) => managementApi.cleanGraphRAGData(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases() });
    },
  });
}

/**
 * Hook for cleaning stage status
 */
export function useCleanStageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CleanStageStatusParams) => managementApi.cleanStageStatus(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases() });
    },
  });
}

/**
 * Hook for setting up test database
 */
export function useSetupTestDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SetupTestDBParams) => managementApi.setupTestDatabase(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.management.databases() });
    },
  });
}

/**
 * Hook for rebuilding indexes
 */
export function useRebuildIndexes() {
  return useMutation({
    mutationFn: (params: RebuildIndexesParams) => managementApi.rebuildIndexes(params),
  });
}

