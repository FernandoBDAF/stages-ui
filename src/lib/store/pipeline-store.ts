import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Pipeline, Stage, PipelineType } from '@/types/api';

interface PipelineState {
  // Data
  pipelines: Record<string, Pipeline>;
  stages: Record<string, Stage>;
  
  // Selection
  selectedPipeline: PipelineType | null;
  selectedStages: string[];
  
  // Actions
  setPipelines: (pipelines: Record<string, Pipeline>) => void;
  setStages: (stages: Record<string, Stage>) => void;
  selectPipeline: (pipeline: PipelineType) => void;
  toggleStage: (stageName: string) => void;
  setSelectedStages: (stages: string[]) => void;
  clearSelection: () => void;
}

export const usePipelineStore = create<PipelineState>()(
  devtools(
    (set, get) => ({
      pipelines: {},
      stages: {},
      selectedPipeline: null,
      selectedStages: [],

      setPipelines: (pipelines) => set({ pipelines }),
      setStages: (stages) => set({ stages }),

      selectPipeline: (pipeline) => {
        set({ 
          selectedPipeline: pipeline,
          selectedStages: [] 
        });
      },

      toggleStage: (stageName) => {
        const { selectedStages, stages } = get();
        const isSelected = selectedStages.includes(stageName);
        
        if (isSelected) {
          set({ selectedStages: selectedStages.filter((s) => s !== stageName) });
        } else {
          // Auto-add dependencies
          const stage = stages[stageName];
          const newStages = new Set([...selectedStages, stageName]);
          
          if (stage?.dependencies) {
            stage.dependencies.forEach((dep) => newStages.add(dep));
          }
          
          set({ selectedStages: Array.from(newStages) });
        }
      },

      setSelectedStages: (stages) => set({ selectedStages: stages }),
      
      clearSelection: () => set({ 
        selectedPipeline: null, 
        selectedStages: [] 
      }),
    }),
    { name: 'pipeline-store' }
  )
);

