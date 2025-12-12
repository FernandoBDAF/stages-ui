import { api } from './client';
import type {
  CompareResponse,
  TimelineResponse,
  SuggestRerunRequest,
  SuggestRerunResponse,
  RunHistoryResponse,
} from '@/types/iteration-api';

/**
 * Iteration API Client
 * Supports document comparison, timeline, and re-run workflows
 */
export const iterationApi = {
  /**
   * Compare two documents
   */
  compareDocuments: (
    dbName: string,
    collection: string,
    docId1: string,
    docId2: string
  ) =>
    api.get<CompareResponse>(
      `/viewer/compare/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}/${encodeURIComponent(docId1)}/${encodeURIComponent(docId2)}`
    ),

  /**
   * Get document timeline
   */
  getTimeline: (
    dbName: string,
    collection: string,
    sourceId: string,
    sourceField?: string
  ) => {
    const params = new URLSearchParams();
    if (sourceField) params.set('source_field', sourceField);
    const query = params.toString() ? `?${params}` : '';
    return api.get<TimelineResponse>(
      `/viewer/timeline/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}/${encodeURIComponent(sourceId)}${query}`
    );
  },

  /**
   * Get re-run suggestions
   */
  suggestRerun: (request: SuggestRerunRequest) =>
    api.post<SuggestRerunResponse>('/viewer/suggest-rerun', request),

  /**
   * Get pipeline run history
   */
  getRunHistory: (
    dbName: string,
    collection: string,
    docId: string,
    limit?: number
  ) => {
    const params = limit ? `?limit=${limit}` : '';
    return api.get<RunHistoryResponse>(
      `/viewer/run-history/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}${params}`
    );
  },
};


