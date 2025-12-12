/**
 * Source Selection API Client
 * 
 * Provides functions for interacting with the source selection endpoints.
 */

import { api } from './client';
import type {
  ChannelsResponse,
  PlaylistsResponse,
  FilterPreviewResponse,
  PreviewFilterRequest,
  SavedFiltersResponse,
  SavedFilter,
  SaveFilterRequest,
  SaveFilterResponse,
  ResolveFilterRequest,
  ResolveFilterResponse,
} from '@/types/source-selection';

const BASE_PATH = '/source-selection';

export const sourceSelectionApi = {
  /**
   * Get channel statistics from raw_videos collection.
   */
  getChannels: async (dbName: string): Promise<ChannelsResponse> => {
    return api.get<ChannelsResponse>(`${BASE_PATH}/channels/${dbName}`);
  },

  /**
   * Get playlist statistics from raw_videos collection.
   */
  getPlaylists: async (dbName: string): Promise<PlaylistsResponse> => {
    return api.get<PlaylistsResponse>(`${BASE_PATH}/playlists/${dbName}`);
  },

  /**
   * Preview filter results without saving.
   */
  previewFilter: async (request: PreviewFilterRequest): Promise<FilterPreviewResponse> => {
    return api.post<FilterPreviewResponse>(`${BASE_PATH}/preview`, request);
  },

  /**
   * List all saved filters for a database.
   */
  listFilters: async (dbName: string): Promise<SavedFiltersResponse> => {
    return api.get<SavedFiltersResponse>(`${BASE_PATH}/filters/${dbName}`);
  },

  /**
   * Get a specific saved filter by ID.
   */
  getFilter: async (dbName: string, filterId: string): Promise<{ filter: SavedFilter }> => {
    return api.get<{ filter: SavedFilter }>(`${BASE_PATH}/filters/${dbName}/${filterId}`);
  },

  /**
   * Create a new saved filter.
   */
  saveFilter: async (dbName: string, request: SaveFilterRequest): Promise<SaveFilterResponse> => {
    return api.post<SaveFilterResponse>(`${BASE_PATH}/filters/${dbName}`, request);
  },

  /**
   * Update an existing filter.
   */
  updateFilter: async (
    dbName: string,
    filterId: string,
    updates: Partial<SaveFilterRequest>
  ): Promise<{ message: string }> => {
    return api.put<{ message: string }>(`${BASE_PATH}/filters/${dbName}/${filterId}`, updates);
  },

  /**
   * Delete a saved filter.
   */
  deleteFilter: async (dbName: string, filterId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`${BASE_PATH}/filters/${dbName}/${filterId}`);
  },

  /**
   * Duplicate a saved filter.
   */
  duplicateFilter: async (
    dbName: string,
    filterId: string,
    newName: string
  ): Promise<SaveFilterResponse> => {
    return api.post<SaveFilterResponse>(
      `${BASE_PATH}/filters/${dbName}/${filterId}/duplicate`,
      { name: newName }
    );
  },

  /**
   * Resolve a filter to video IDs.
   */
  resolveFilter: async (request: ResolveFilterRequest): Promise<ResolveFilterResponse> => {
    return api.post<ResolveFilterResponse>(`${BASE_PATH}/resolve`, request);
  },
};

