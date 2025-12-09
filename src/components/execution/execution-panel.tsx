'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidationResults } from './validation-results';
import { StatusMonitor } from './status-monitor';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useExecutionStore } from '@/lib/store/execution-store';
import { usePipelineExecution } from '@/hooks/use-pipeline-execution';
import { Play, CheckCircle, Loader2, XCircle } from 'lucide-react';

export function ExecutionPanel() {
  const { selectedPipeline, selectedStages } = usePipelineStore();
  const { configs } = useConfigStore();
  const {
    validationResult,
    validationLoading,
    executionLoading,
    currentPipelineId,
    pipelineStatus,
  } = useExecutionStore();

  const { validate, execute, cancel } = usePipelineExecution();

  const canValidate = selectedPipeline && selectedStages.length > 0;
  const canExecute = validationResult?.valid && !executionLoading;
  const isRunning = ['starting', 'running'].includes(pipelineStatus?.status || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution</CardTitle>
        <CardDescription>
          Validate configuration and execute the pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => validate()}
            disabled={!canValidate || validationLoading}
          >
            {validationLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Validate Configuration
          </Button>

          <Button
            onClick={() => execute()}
            disabled={!canExecute}
          >
            {executionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Execute Pipeline
          </Button>

          {isRunning && (
            <Button variant="destructive" onClick={() => cancel()}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>

        {validationResult && <ValidationResults result={validationResult} />}

        {currentPipelineId && pipelineStatus && (
          <StatusMonitor
            pipelineId={currentPipelineId}
            status={pipelineStatus}
          />
        )}
      </CardContent>
    </Card>
  );
}

