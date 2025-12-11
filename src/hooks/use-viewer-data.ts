'use client';

import { useQuery } from '@tanstack/react-query';
import { viewerApi } from '@/lib/api/viewer';
import { queryKeys } from '@/lib/query-keys';
import type { SortOption } from '@/types/viewer-api';

/**
 * Fetch list of databases
 */
export function useViewerDatabases() {
  return useQuery({
    queryKey: queryKeys.viewer.databases(),
    queryFn: () => viewerApi.listDatabases(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch collections for a database
 */
export function useViewerCollections(dbName: string | null) {
  return useQuery({
    queryKey: queryKeys.viewer.collections(dbName || ''),
    queryFn: () => viewerApi.listCollections(dbName!),
    enabled: !!dbName,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch a single document by ID
 */
export function useViewerDocument(
  dbName: string | null,
  collection: string | null,
  documentId: string | null
) {
  return useQuery({
    queryKey: queryKeys.viewer.document(dbName || '', collection || '', documentId || ''),
    queryFn: () => viewerApi.getDocument(dbName!, collection!, documentId!),
    enabled: !!dbName && !!collection && !!documentId,
  });
}

// Alias for page.tsx compatibility
export const useDocument = useViewerDocument;

/**
 * Options for collection query
 */
interface CollectionQueryOptions {
  skip?: number;
  limit?: number;
  sort?: SortOption[];
  enabled?: boolean;
}

/**
 * Query collection with pagination - new signature for page.tsx compatibility
 */
export function useCollectionQuery(
  db: string | null,
  collection: string | null,
  options: CollectionQueryOptions = {}
) {
  const { skip = 0, limit = 20, sort, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.viewer.query(db || '', collection || ''),
    queryFn: () =>
      viewerApi.queryCollection({
        db_name: db!,
        collection_name: collection!,
        skip,
        limit,
        sort,
      }),
    enabled: enabled && !!db && !!collection,
  });
}

/**
 * Original query hook - kept for backwards compatibility
 */
export function useViewerCollectionQuery(
  db: string | null,
  collection: string | null,
  options: CollectionQueryOptions = {}
) {
  return useCollectionQuery(db, collection, options);
}

/**
 * Fetch collection schema
 */
export function useViewerCollectionSchema(dbName: string | null, collection: string | null) {
  return useQuery({
    queryKey: queryKeys.viewer.schema(dbName || '', collection || ''),
    queryFn: () => viewerApi.getSchema(dbName!, collection!),
    enabled: !!dbName && !!collection,
    staleTime: 5 * 60 * 1000, // 5 minutes (schema rarely changes)
  });
}
