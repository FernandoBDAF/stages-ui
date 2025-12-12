import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { StageConfigSchema } from '@/types/api';

/**
 * Global configuration that applies to all stages
 */
export interface GlobalConfig {
  db_name?: string;
  concurrency?: number;
  verbose?: boolean;
  dry_run?: boolean;
}

interface ConfigState {
  // Schemas (cached)
  schemas: Record<string, StageConfigSchema>;
  defaults: Record<string, Record<string, unknown>>;
  
  // User configurations
  configs: Record<string, Record<string, unknown>>;
  
  // Global configuration (applies to all stages)
  globalConfig: GlobalConfig;
  
  // UI state
  expandedPanels: string[];
  
  // Actions
  setSchema: (stageName: string, schema: StageConfigSchema) => void;
  setDefaults: (stageName: string, defaults: Record<string, unknown>) => void;
  setFieldValue: (stageName: string, fieldName: string, value: unknown) => void;
  resetStageConfig: (stageName: string) => void;
  togglePanel: (stageName: string) => void;
  clearConfigs: () => void;
  
  // Global config actions
  setGlobalConfig: (updates: Partial<GlobalConfig>) => void;
  applyGlobalToAll: () => void;
  getEffectiveConfig: (stageName: string) => Record<string, unknown>;
  
  // Bulk panel actions
  expandAll: (stageNames: string[]) => void;
  collapseAll: () => void;
}

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  concurrency: 15,
  verbose: false,
  dry_run: false,
};

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set, get) => ({
        schemas: {},
        defaults: {},
        configs: {},
        globalConfig: DEFAULT_GLOBAL_CONFIG,
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

        clearConfigs: () => set({ 
          configs: {}, 
          expandedPanels: [],
          globalConfig: DEFAULT_GLOBAL_CONFIG,
        }),

        // Global config actions
        setGlobalConfig: (updates) => {
          set((state) => ({
            globalConfig: { ...state.globalConfig, ...updates },
          }));
        },

        applyGlobalToAll: () => {
          set((state) => {
            const newConfigs = { ...state.configs };
            const global = state.globalConfig;

            // Apply global values to all stage configs
            for (const stageName of Object.keys(newConfigs)) {
              const stageConfig = newConfigs[stageName] || {};
              newConfigs[stageName] = {
                ...stageConfig,
                // Only override if global value is defined
                ...(global.db_name !== undefined && { db_name: global.db_name }),
                ...(global.concurrency !== undefined && { concurrency: global.concurrency }),
                ...(global.verbose !== undefined && { verbose: global.verbose }),
                ...(global.dry_run !== undefined && { dry_run: global.dry_run }),
              };
            }

            return { configs: newConfigs };
          });
        },

        getEffectiveConfig: (stageName) => {
          const state = get();
          const stageConfig = state.configs[stageName] || {};
          const global = state.globalConfig;

          // Merge: global values as defaults, stage-specific values take precedence
          return {
            // Global defaults (only include if defined)
            ...(global.db_name !== undefined && { db_name: global.db_name }),
            ...(global.concurrency !== undefined && { concurrency: global.concurrency }),
            ...(global.verbose !== undefined && { verbose: global.verbose }),
            ...(global.dry_run !== undefined && { dry_run: global.dry_run }),
            // Stage-specific overrides
            ...stageConfig,
          };
        },

        // Bulk panel actions
        expandAll: (stageNames) => {
          set({ expandedPanels: [...stageNames] });
        },

        collapseAll: () => {
          set({ expandedPanels: [] });
        },
      }),
      {
        name: 'config-store',
        // Only persist global config and expanded panels
        partialize: (state) => ({
          globalConfig: state.globalConfig,
        }),
      }
    ),
    { name: 'config-store' }
  )
);
