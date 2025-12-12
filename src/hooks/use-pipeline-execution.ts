import { useCallback, useEffect, useRef } from 'react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useExecutionStore } from '@/lib/store/execution-store';
import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { pipelinesApi } from '@/lib/api/pipelines';
import { ApiError } from '@/lib/api/client';

export function usePipelineExecution() {
  const { selectedPipeline, selectedStages } = usePipelineStore();
  const { configs, globalConfig } = useConfigStore();
  const {
    setValidationResult,
    setValidationLoading,
    setPipelineId,
    setPipelineStatus,
    setExecutionLoading,
    addError,
  } = useExecutionStore();
  
  // Subscribe to source selection metadata getter
  const getExecutionMetadata = useSourceSelectionStore(
    (state) => state.getExecutionMetadata
  );

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount AND clear stale state on mount
  useEffect(() => {
    // On mount: clear any stale polling state
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    // Clear any error state from previous sessions if pipeline is in error state
    const store = useExecutionStore.getState();
    if (store.pipelineStatus?.status === 'error') {
      console.log('[Pipeline] Clearing stale error state on mount');
      store.clearStatus();
    }
    
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
      // Filter configs to only include selected stages
      const filteredConfigs = Object.fromEntries(
        Object.entries(configs).filter(([stageName]) => selectedStages.includes(stageName))
      );
      
      // Merge global config into each stage config
      // Global values serve as defaults, stage-specific values override
      const mergedConfigs = Object.fromEntries(
        Object.entries(filteredConfigs).map(([stageName, stageConfig]) => [
          stageName,
          {
            // Global values as defaults (only include if defined)
            ...(globalConfig.db_name !== undefined && { db_name: globalConfig.db_name }),
            ...(globalConfig.concurrency !== undefined && { concurrency: globalConfig.concurrency }),
            ...(globalConfig.verbose !== undefined && { verbose: globalConfig.verbose }),
            ...(globalConfig.dry_run !== undefined && { dry_run: globalConfig.dry_run }),
            // Stage-specific overrides take precedence
            ...stageConfig,
          }
        ])
      );
      
      const result = await pipelinesApi.validate(
        selectedPipeline,
        selectedStages,
        mergedConfigs
      );
      setValidationResult(result);
    } catch (error) {
      addError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setValidationLoading(false);
    }
  }, [selectedPipeline, selectedStages, configs, globalConfig, setValidationLoading, setValidationResult, addError]);

  const startPolling = useCallback((pipelineId: string) => {
    // Clear existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    let errorCount = 0;
    let notFoundCount = 0;
    const MAX_ERRORS = 5;
    const MAX_NOT_FOUND = 20; // Allow many 404s initially (race condition with DB)
    const startTime = Date.now();
    const POLL_INTERVAL_MS = 1500; // Poll every 1.5s for faster feedback

    // Set initial "starting" status
    setPipelineStatus({
      pipeline_id: pipelineId,
      status: 'starting',
      current_stage: null,
      progress: { completed_stages: 0, total_stages: 0, percent: 0 },
      elapsed_seconds: 0,
    });

    console.log(`[Polling] Starting polling for ${pipelineId}`);

    // Polling function
    const pollOnce = async () => {
      try {
        const status = await pipelinesApi.getStatus(pipelineId);
        
        // Success! Reset error counts and clear any previous errors
        errorCount = 0;
        notFoundCount = 0;
        useExecutionStore.getState().clearErrors();
        
        // Update status - this will replace any error state
        setPipelineStatus(status);
        console.log(`[Polling] Status received: ${status.status}`);

        // Stop polling if finished
        if (['completed', 'failed', 'error', 'cancelled', 'interrupted'].includes(status.status)) {
          console.log(`[Polling] Final status (${status.status}), stopping polling`);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (error) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        
        // Handle 404 (pipeline not found)
        if (error instanceof ApiError && error.status === 404) {
          notFoundCount++;
          
          // In the first 45 seconds, 404s are expected (race condition with DB sync)
          // Keep polling - the pipeline may not be in DB yet
          if (elapsedSeconds < 45 && notFoundCount < MAX_NOT_FOUND) {
            console.info(`[Polling] Pipeline not in DB yet (attempt ${notFoundCount}/${MAX_NOT_FOUND}, ${elapsedSeconds.toFixed(1)}s elapsed)`);
            return; // Keep polling
          }
          
          // After grace period or too many 404s, assume it's a real error
          console.warn(`[Polling] Pipeline ${pipelineId} not found after ${elapsedSeconds.toFixed(0)}s (${notFoundCount} attempts)`);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPipelineStatus({
            pipeline_id: pipelineId,
            status: 'error',
            current_stage: null,
            progress: { completed_stages: 0, total_stages: 0, percent: 0 },
            elapsed_seconds: Math.round(elapsedSeconds),
            error: 'Pipeline not found. The server may have restarted.',
          });
          addError('Pipeline not found. Please try executing again.');
          return;
        }

        // Other errors
        errorCount++;
        console.error(`[Polling] Status error (${errorCount}/${MAX_ERRORS}):`, error);

        if (errorCount >= MAX_ERRORS) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          addError(`Failed to get pipeline status after ${MAX_ERRORS} attempts`);
        }
      }
    };

    // Do first poll after a brief delay to give DB time to sync
    setTimeout(() => {
      pollOnce();
      // Then start regular interval polling
      pollingRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
    }, 500); // 500ms initial delay
    
  }, [setPipelineStatus, addError]);

  const execute = useCallback(async () => {
    if (!selectedPipeline) return;

    // Clear previous errors and status before starting new execution
    useExecutionStore.getState().clearErrors();
    setPipelineStatus(null);
    
    setExecutionLoading(true);
    try {
      // Filter configs to only include selected stages
      const filteredConfigs = Object.fromEntries(
        Object.entries(configs).filter(([stageName]) => selectedStages.includes(stageName))
      );
      
      // Merge global config into each stage config
      // Global values serve as defaults, stage-specific values override
      const mergedConfigs = Object.fromEntries(
        Object.entries(filteredConfigs).map(([stageName, stageConfig]) => [
          stageName,
          {
            // Global values as defaults (only include if defined)
            ...(globalConfig.db_name !== undefined && { db_name: globalConfig.db_name }),
            ...(globalConfig.concurrency !== undefined && { concurrency: globalConfig.concurrency }),
            ...(globalConfig.verbose !== undefined && { verbose: globalConfig.verbose }),
            ...(globalConfig.dry_run !== undefined && { dry_run: globalConfig.dry_run }),
            // Stage-specific overrides take precedence
            ...stageConfig,
          }
        ])
      );
      
      // Get source selection metadata (filter info)
      const sourceMetadata = getExecutionMetadata();
      
      const result = await pipelinesApi.execute(
        selectedPipeline,
        selectedStages,
        mergedConfigs,
        { 
          experiment_id: `exp_${Date.now()}`,
          ...sourceMetadata, // Include filter info
        }
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
  }, [selectedPipeline, selectedStages, configs, globalConfig, setExecutionLoading, setPipelineId, setPipelineStatus, startPolling, addError, getExecutionMetadata]);

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
