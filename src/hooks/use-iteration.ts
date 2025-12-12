'use client';

import { useQuery } from '@tanstack/react-query';
import { iterationApi } from '@/lib/api/iteration';
import { queryKeys } from '@/lib/query-keys';

/**
 * Compare two document versions
 */
export function useDocumentComparison(
  dbName: string | null,
  collection: string | null,
  docId1: string | null,
  docId2: string | null
) {
  return useQuery({
    queryKey: queryKeys.iteration.compare(dbName || '', collection || '', docId1 || '', docId2 || ''),
    queryFn: () =>
      iterationApi.compareDocuments(dbName!, collection!, docId1!, docId2!),
    enabled: !!dbName && !!collection && !!docId1 && !!docId2,
  });
}

/**
 * Get document evolution timeline
 */
export function useDocumentTimeline(
  dbName: string | null,
  collection: string | null,
  sourceId: string | null,
  sourceField?: string
) {
  return useQuery({
    queryKey: queryKeys.iteration.timeline(dbName || '', collection || '', sourceId || ''),
    queryFn: () =>
      iterationApi.getTimeline(dbName!, collection!, sourceId!, sourceField),
    enabled: !!dbName && !!collection && !!sourceId,
  });
}

/**
 * Get re-run suggestions for a document
 */
export function useRerunSuggestions(
  dbName: string | null,
  collection: string | null,
  docId: string | null,
  issueType?: string
) {
  return useQuery({
    queryKey: queryKeys.iteration.suggestions(dbName || '', collection || '', docId || '', issueType),
    queryFn: () =>
      iterationApi.suggestRerun({
        db_name: dbName!,
        collection_name: collection!,
        doc_id: docId!,
        issue_type: issueType,
      }),
    enabled: !!dbName && !!collection && !!docId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get pipeline run history for a document
 */
export function useRunHistory(
  dbName: string | null,
  collection: string | null,
  docId: string | null,
  limit?: number
) {
  return useQuery({
    queryKey: queryKeys.iteration.history(dbName || '', collection || '', docId || ''),
    queryFn: () =>
      iterationApi.getRunHistory(dbName!, collection!, docId!, limit),
    enabled: !!dbName && !!collection && !!docId,
  });
}


