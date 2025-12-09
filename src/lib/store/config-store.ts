import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StageConfigSchema } from '@/types/api';

interface ConfigState {
  // Schemas (cached)
  schemas: Record<string, StageConfigSchema>;
  defaults: Record<string, Record<string, unknown>>;
  
  // User configurations
  configs: Record<string, Record<string, unknown>>;
  
  // UI state
  expandedPanels: string[];
  
  // Actions
  setSchema: (stageName: string, schema: StageConfigSchema) => void;
  setDefaults: (stageName: string, defaults: Record<string, unknown>) => void;
  setFieldValue: (stageName: string, fieldName: string, value: unknown) => void;
  resetStageConfig: (stageName: string) => void;
  togglePanel: (stageName: string) => void;
  clearConfigs: () => void;
}

export const useConfigStore = create<ConfigState>()(
  devtools(
    (set, get) => ({
      schemas: {},
      defaults: {},
      configs: {},
      expandedPanels: [],

      setSchema: (stageName, schema) => {
        set((state) => ({
          schemas: { ...state.schemas, [stageName]: schema },
        }));
      },

      setDefaults: (stageName, defaults) => {
        set((state) => ({
          defaults: { ...state.defaults, [stageName]: defaults },
          // Initialize config with defaults if not set
          configs: {
            ...state.configs,
            [stageName]: state.configs[stageName] || { ...defaults },
          },
        }));
      },

      setFieldValue: (stageName, fieldName, value) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [stageName]: {
              ...state.configs[stageName],
              [fieldName]: value,
            },
          },
        }));
      },

      resetStageConfig: (stageName) => {
        const { defaults } = get();
        set((state) => ({
          configs: {
            ...state.configs,
            [stageName]: { ...defaults[stageName] },
          },
        }));
      },

      togglePanel: (stageName) => {
        set((state) => ({
          expandedPanels: state.expandedPanels.includes(stageName)
            ? state.expandedPanels.filter((p) => p !== stageName)
            : [...state.expandedPanels, stageName],
        }));
      },

      clearConfigs: () => set({ configs: {}, expandedPanels: [] }),
    }),
    { name: 'config-store' }
  )
);

