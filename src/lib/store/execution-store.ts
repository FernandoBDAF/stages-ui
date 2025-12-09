import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ValidationResult, PipelineStatus } from '@/types/api';

interface ExecutionState {
  // Validation
  validationResult: ValidationResult | null;
  validationLoading: boolean;
  
  // Execution
  currentPipelineId: string | null;
  pipelineStatus: PipelineStatus | null;
  executionLoading: boolean;
  
  // Errors
  errors: string[];
  
  // Actions
  setValidationResult: (result: ValidationResult | null) => void;
  setValidationLoading: (loading: boolean) => void;
  setPipelineId: (id: string | null) => void;
  setPipelineStatus: (status: PipelineStatus | null) => void;
  setExecutionLoading: (loading: boolean) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  clearStatus: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>()(
  devtools(
    (set) => ({
      validationResult: null,
      validationLoading: false,
      currentPipelineId: null,
      pipelineStatus: null,
      executionLoading: false,
      errors: [],

      setValidationResult: (result) => set({ validationResult: result }),
      setValidationLoading: (loading) => set({ validationLoading: loading }),
      setPipelineId: (id) => set({ currentPipelineId: id }),
      setPipelineStatus: (status) => set({ pipelineStatus: status }),
      setExecutionLoading: (loading) => set({ executionLoading: loading }),
      addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
      clearErrors: () => set({ errors: [] }),
      clearStatus: () => set({
        currentPipelineId: null,
        pipelineStatus: null,
        validationResult: null,
        errors: [],
      }),
      reset: () =>
        set({
          validationResult: null,
          validationLoading: false,
          currentPipelineId: null,
          pipelineStatus: null,
          executionLoading: false,
          errors: [],
        }),
    }),
    { name: 'execution-store' }
  )
);

