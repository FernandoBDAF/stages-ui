import { api } from './client';
import type {
  ViewerDatabasesResponse,
  ViewerCollectionsResponse,
  ViewerDocumentResponse,
  ViewerQueryRequest,
  ViewerQueryResponse,
  ViewerSchemaResponse,
} from '@/types/viewer-api';

/**
 * Viewer API client
 * Provides access to MongoDB collections for viewing and debugging
 */
export const viewerApi = {
  /**
   * List all available databases
   */
  listDatabases: () =>
    api.get<ViewerDatabasesResponse>('/viewer/databases'),

  /**
   * List collections in a database with renderer suggestions
   */
  listCollections: (dbName: string) =>
    api.get<ViewerCollectionsResponse>(
      `/viewer/collections/${encodeURIComponent(dbName)}`
    ),

  /**
   * Get a single document by ID
   */
  getDocument: (dbName: string, collection: string, documentId: string) =>
    api.get<ViewerDocumentResponse>(
      `/viewer/document/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`
    ),

  /**
   * Query collection with filters and pagination
   */
  queryCollection: (request: ViewerQueryRequest) =>
    api.post<ViewerQueryResponse>('/viewer/query', request),

  /**
   * Get collection schema (field types and statistics)
   */
  getSchema: (dbName: string, collection: string) =>
    api.get<ViewerSchemaResponse>(
      `/viewer/schema/${encodeURIComponent(dbName)}/${encodeURIComponent(collection)}`
    ),
};
