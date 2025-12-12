/**
 * Source Selection Store
 * 
 * Manages state for the source selection wizard step.
 * 
 * IMPORTANT: Loading states are NOT managed here. They come from React Query's
 * isLoading/isPending states to avoid duplicate state management.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  SelectionMode,
  WizardStep,
  FilterDefinition,
  ChannelInfo,
  SavedFilterSummary,
  FilterPreviewResponse,
} from '@/types/source-selection';

const DEFAULT_FILTER: FilterDefinition = {
  channels: [],
  sort: { field: 'published_at', order: 'desc' },
};

interface SourceSelectionState {
  // Mode
  mode: SelectionMode;
  
  // Wizard navigation
  currentStep: WizardStep;
  
  // Filter state
  currentFilter: FilterDefinition;
  selectedFilterId: string | null;
  
  // Data (cached from API)
  channels: ChannelInfo[];
  savedFilters: SavedFilterSummary[];
  preview: FilterPreviewResponse | null;
}

interface SourceSelectionActions {
  // Mode
  setMode: (mode: SelectionMode) => void;
  
  // Wizard navigation
  setCurrentStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceedToNext: () => boolean;
  
  // Filter management
  setCurrentFilter: (filter: FilterDefinition) => void;
  updateFilter: (updates: Partial<FilterDefinition>) => void;
  selectSavedFilter: (id: string | null) => void;
  resetFilter: () => void;
  
  // Data setters (called by React Query hooks)
  setChannels: (channels: ChannelInfo[]) => void;
  setSavedFilters: (filters: SavedFilterSummary[]) => void;
  setPreview: (preview: FilterPreviewResponse | null) => void;
  
  // Computed helpers
  hasActiveFilter: () => boolean;
  getFilterSummary: () => string;
  
  // Execution helpers
  getExecutionMetadata: () => {
    input_filter_id?: string;
    input_filter?: FilterDefinition;
  };
}

const STEP_ORDER: WizardStep[] = ['source_selection', 'configuration', 'execution'];

export const useSourceSelectionStore = create<SourceSelectionState & SourceSelectionActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        mode: 'all',
        currentStep: 'source_selection',
        currentFilter: DEFAULT_FILTER,
        selectedFilterId: null,
        channels: [],
        savedFilters: [],
        preview: null,

        // Mode
        setMode: (mode) => {
          set({ mode });
          if (mode === 'all') {
            // Reset filter when switching to "all" mode
            set({ 
              currentFilter: DEFAULT_FILTER,
              selectedFilterId: null,
              preview: null 
            });
          }
        },

        // Wizard navigation
        setCurrentStep: (step) => set({ currentStep: step }),
        
        goToNextStep: () => {
          const { currentStep, canProceedToNext } = get();
          if (!canProceedToNext()) return;
          
          const currentIndex = STEP_ORDER.indexOf(currentStep);
          if (currentIndex < STEP_ORDER.length - 1) {
            set({ currentStep: STEP_ORDER[currentIndex + 1] });
          }
        },
        
        goToPreviousStep: () => {
          const { currentStep } = get();
          const currentIndex = STEP_ORDER.indexOf(currentStep);
          if (currentIndex > 0) {
            set({ currentStep: STEP_ORDER[currentIndex - 1] });
          }
        },
        
        canProceedToNext: () => {
          const { currentStep, mode, preview } = get();
          
          if (currentStep === 'source_selection') {
            // Can proceed if "all" mode or if filter has results
            if (mode === 'all') return true;
            return preview !== null && preview.total_matching > 0;
          }
          
          // For other steps, delegate to their own validation
          return true;
        },

        // Filter management
        setCurrentFilter: (filter) => {
          set({ 
            currentFilter: filter,
            selectedFilterId: null // Clear saved filter when manually setting
          });
        },
        
        updateFilter: (updates) => {
          const { currentFilter } = get();
          set({ 
            currentFilter: { ...currentFilter, ...updates },
            selectedFilterId: null,
            preview: null // Clear preview when filter changes
          });
        },
        
        selectSavedFilter: (id) => {
          if (id === null) {
            set({ 
              selectedFilterId: null, 
              currentFilter: DEFAULT_FILTER,
              preview: null,
              mode: 'all'
            });
            return;
          }
          
          // Filter will be loaded by the hook
          set({ 
            selectedFilterId: id,
            mode: 'filtered'
          });
        },
        
        resetFilter: () => {
          set({ 
            currentFilter: DEFAULT_FILTER,
            selectedFilterId: null,
            preview: null,
            mode: 'all'
          });
        },

        // Data setters (called by React Query hooks on success)
        setChannels: (channels) => set({ channels }),
        setSavedFilters: (filters) => set({ savedFilters: filters }),
        setPreview: (preview) => set({ preview }),

        // Computed helpers
        hasActiveFilter: () => {
          const { mode, currentFilter } = get();
          if (mode === 'all') return false;
          
          // Check if any filter criteria is set
          return (
            (currentFilter.channels && currentFilter.channels.length > 0) ||
            currentFilter.date_range?.start !== undefined ||
            currentFilter.date_range?.end !== undefined ||
            currentFilter.engagement?.min_views !== undefined ||
            currentFilter.engagement?.max_views !== undefined ||
            currentFilter.engagement?.min_engagement_score !== undefined ||
            currentFilter.content?.keywords_any !== undefined ||
            currentFilter.content?.has_transcript !== undefined ||
            currentFilter.duration?.min_seconds !== undefined ||
            currentFilter.duration?.max_seconds !== undefined ||
            (currentFilter.playlist_ids && currentFilter.playlist_ids.length > 0) ||
            currentFilter.limit !== undefined
          );
        },
        
        getFilterSummary: () => {
          const { mode, preview, currentFilter, channels } = get();
          
          if (mode === 'all') {
            const total = channels.reduce((sum, c) => sum + c.video_count, 0);
            return `Processing all ${total} videos`;
          }
          
          if (!preview) return 'Configure filter';
          
          const count = preview.total_matching;
          const channelCount = preview.channels.length;
          
          if (currentFilter.limit && count > currentFilter.limit) {
            return `${currentFilter.limit} of ${count} videos (${channelCount} channels)`;
          }
          
          return `${count} videos from ${channelCount} channel${channelCount !== 1 ? 's' : ''}`;
        },

        // Execution helpers
        getExecutionMetadata: () => {
          const { mode, selectedFilterId, currentFilter } = get();
          
          if (mode === 'all') {
            return {}; // No filter metadata
          }
          
          if (selectedFilterId) {
            return { input_filter_id: selectedFilterId };
          }
          
          return { input_filter: currentFilter };
        },
      }),
      {
        name: 'source-selection-storage',
        // Persist filter state AND current step for consistent UX
        // User can resume where they left off
        partialize: (state) => ({
          mode: state.mode,
          currentStep: state.currentStep,
          currentFilter: state.currentFilter,
          selectedFilterId: state.selectedFilterId,
        }),
      }
    ),
    { name: 'source-selection-store' }
  )
);

