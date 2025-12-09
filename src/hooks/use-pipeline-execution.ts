import { useCallback, useEffect, useRef } from 'react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useExecutionStore } from '@/lib/store/execution-store';
import { pipelinesApi } from '@/lib/api/pipelines';

export function usePipelineExecution() {
  const { selectedPipeline, selectedStages } = usePipelineStore();
  const { configs } = useConfigStore();
  const {
    setValidationResult,
    setValidationLoading,
    setPipelineId,
    setPipelineStatus,
    setExecutionLoading,
    addError,
  } = useExecutionStore();

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const validate = useCallback(async () => {
    if (!selectedPipeline) return;

    setValidationLoading(true);
    try {
      const result = await pipelinesApi.validate(
        selectedPipeline,
        selectedStages,
        configs
      );
      setValidationResult(result);
    } catch (error) {
      addError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setValidationLoading(false);
    }
  }, [selectedPipeline, selectedStages, configs, setValidationLoading, setValidationResult, addError]);

  const startPolling = useCallback((pipelineId: string) => {
    // Clear existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const status = await pipelinesApi.getStatus(pipelineId);
        setPipelineStatus(status);

        // Stop polling if finished
        if (['completed', 'failed', 'error', 'cancelled'].includes(status.status)) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 2000);
  }, [setPipelineStatus]);

  const execute = useCallback(async () => {
    if (!selectedPipeline) return;

    setExecutionLoading(true);
    try {
      const result = await pipelinesApi.execute(
        selectedPipeline,
        selectedStages,
        configs,
        { experiment_id: `exp_${Date.now()}` }
      );

      if (result.error) {
        addError(result.error);
        return;
      }

      setPipelineId(result.pipeline_id);
      startPolling(result.pipeline_id);
    } catch (error) {
      addError(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setExecutionLoading(false);
    }
  }, [selectedPipeline, selectedStages, configs, setExecutionLoading, setPipelineId, startPolling, addError]);

  const cancel = useCallback(async () => {
    const pipelineId = useExecutionStore.getState().currentPipelineId;
    if (!pipelineId) return;

    try {
      await pipelinesApi.cancel(pipelineId);
      // Polling will pick up the cancelled status
    } catch (error) {
      addError(error instanceof Error ? error.message : 'Cancel failed');
    }
  }, [addError]);

  return { validate, execute, cancel };
}

