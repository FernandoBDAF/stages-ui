/**
 * Source Selection Hooks
 * 
 * React Query hooks for fetching source selection data.
 * 
 * Note: Loading states come from React Query (isLoading, isPending).
 * We don't duplicate them in Zustand store.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sourceSelectionApi } from '@/lib/api/source-selection';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { queryKeys } from '@/lib/query-keys';
import { SOURCE_SELECTION } from '@/lib/constants/source-selection';
import type {
  FilterDefinition,
  SaveFilterRequest,
} from '@/types/source-selection';
import { toast } from 'sonner';

/**
 * Get database name from environment or use fallback
 */
const getDbName = () => 
  process.env.NEXT_PUBLIC_DB_NAME || SOURCE_SELECTION.DEFAULT_DB_NAME;

/**
 * Hook to fetch channel statistics
 */
export function useChannels(dbName?: string) {
  const db = dbName || getDbName();
  const setChannels = useSourceSelectionStore((state) => state.setChannels);

  return useQuery({
    queryKey: queryKeys.sourceSelection.channels(db),
    queryFn: async () => {
      const response = await sourceSelectionApi.getChannels(db);
      setChannels(response.channels);
      return response;
    },
    staleTime: SOURCE_SELECTION.CACHE_TIMES.CHANNELS_MS,
  });
}

/**
 * Hook to fetch playlist statistics
 */
export function usePlaylists(dbName?: string) {
  const db = dbName || getDbName();

  return useQuery({
    queryKey: queryKeys.sourceSelection.playlists(db),
    queryFn: () => sourceSelectionApi.getPlaylists(db),
    staleTime: SOURCE_SELECTION.CACHE_TIMES.CHANNELS_MS,
  });
}

/**
 * Hook to fetch saved filters
 */
export function useSavedFilters(dbName?: string) {
  const db = dbName || getDbName();
  const setSavedFilters = useSourceSelectionStore((state) => state.setSavedFilters);

  return useQuery({
    queryKey: queryKeys.sourceSelection.filters(db),
    queryFn: async () => {
      const response = await sourceSelectionApi.listFilters(db);
      setSavedFilters(response.filters);
      return response;
    },
  });
}

/**
 * Hook to fetch a specific saved filter
 */
export function useSavedFilter(filterId: string | null, dbName?: string) {
  const db = dbName || getDbName();
  const setCurrentFilter = useSourceSelectionStore((state) => state.setCurrentFilter);

  return useQuery({
    queryKey: queryKeys.sourceSelection.filter(db, filterId || ''),
    queryFn: async () => {
      if (!filterId) return null;
      const response = await sourceSelectionApi.getFilter(db, filterId);
      setCurrentFilter(response.filter.filter_definition);
      return response.filter;
    },
    enabled: !!filterId,
  });
}

/**
 * Hook to preview filter results
 */
export function useFilterPreview(
  filter: FilterDefinition,
  enabled: boolean = true,
  dbName?: string
) {
  const db = dbName || getDbName();
  const setPreview = useSourceSelectionStore((state) => state.setPreview);
  const mode = useSourceSelectionStore((state) => state.mode);

  return useQuery({
    queryKey: queryKeys.sourceSelection.preview(db, filter as Record<string, unknown>),
    queryFn: async () => {
      const response = await sourceSelectionApi.previewFilter({
        db_name: db,
        filter,
        sample_limit: SOURCE_SELECTION.PREVIEW.SAMPLE_LIMIT,
      });
      setPreview(response);
      return response;
    },
    enabled: enabled && mode === 'filtered',
    staleTime: SOURCE_SELECTION.CACHE_TIMES.PREVIEW_MS,
  });
}

/**
 * Hook to save a new filter
 */
export function useSaveFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SaveFilterRequest) => {
      return await sourceSelectionApi.saveFilter(db, request);
    },
    onSuccess: (data) => {
      toast.success(`Filter "${data.filter.name}" saved`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save filter: ${error.message}`);
    },
  });
}

/**
 * Hook to update a filter
 */
export function useUpdateFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      filterId,
      updates,
    }: {
      filterId: string;
      updates: Partial<SaveFilterRequest>;
    }) => {
      return await sourceSelectionApi.updateFilter(db, filterId, updates);
    },
    onSuccess: () => {
      toast.success('Filter updated');
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update filter: ${error.message}`);
    },
  });
}

/**
 * Hook to delete a filter
 */
export function useDeleteFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();
  const selectedFilterId = useSourceSelectionStore((state) => state.selectedFilterId);
  const selectSavedFilter = useSourceSelectionStore((state) => state.selectSavedFilter);

  return useMutation({
    mutationFn: async (filterId: string) => {
      return await sourceSelectionApi.deleteFilter(db, filterId);
    },
    onSuccess: (_, filterId) => {
      toast.success('Filter deleted');
      // If we deleted the currently selected filter, clear selection
      if (selectedFilterId === filterId) {
        selectSavedFilter(null);
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete filter: ${error.message}`);
    },
  });
}

/**
 * Hook to duplicate a filter
 */
export function useDuplicateFilter(dbName?: string) {
  const db = dbName || getDbName();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      filterId,
      newName,
    }: {
      filterId: string;
      newName: string;
    }) => {
      return await sourceSelectionApi.duplicateFilter(db, filterId, newName);
    },
    onSuccess: (data) => {
      toast.success(`Created "${data.filter.name}"`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceSelection.filters(db),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate filter: ${error.message}`);
    },
  });
}

