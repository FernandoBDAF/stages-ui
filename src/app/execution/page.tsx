'use client';

import { useStages } from '@/hooks/use-stages';
import { useStageConfig } from '@/hooks/use-stage-config';
import { PipelineSelector } from '@/components/pipeline/pipeline-selector';
import { StageSelector } from '@/components/pipeline/stage-selector';
import { StageConfigPanel } from '@/components/config/stage-config-panel';
import { ExecutionPanel } from '@/components/execution/execution-panel';
import { ExecutionHistory } from '@/components/execution/execution-history';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Separate component for each stage to properly use hooks
function StageConfigPanelWrapper({ stageName }: { stageName: string }) {
  const { schema, isLoading } = useStageConfig(stageName);

  if (isLoading || !schema) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <StageConfigPanel
      stageName={stageName}
      schema={schema}
    />
  );
}

function StageConfigPanels({ stageNames }: { stageNames: string[] }) {
  return (
    <div className="space-y-4">
      {stageNames.map((stageName) => (
        <StageConfigPanelWrapper key={stageName} stageName={stageName} />
      ))}
    </div>
  );
}

export default function ExecutionPage() {
  const { data, isLoading, error } = useStages();
  const { selectedPipeline, selectedStages, stages } = usePipelineStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load stages</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  // Get stages for selected pipeline
  const pipelineStages = selectedPipeline
    ? Object.values(stages).filter((s) => s.pipeline === selectedPipeline)
    : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Pipeline Execution</h1>
        <p className="text-muted-foreground">
          Configure and execute GraphRAG and Ingestion pipelines
        </p>
      </div>

      <PipelineSelector pipelines={data.pipelines} />

      {selectedPipeline && (
        <StageSelector stages={pipelineStages} />
      )}

      {selectedStages.length > 0 && (
        <>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Stage Configuration</h2>
            <p className="text-muted-foreground text-sm">
              Configure each selected stage. Expand panels to modify settings.
            </p>
          </div>
          <StageConfigPanels stageNames={selectedStages} />
        </>
      )}

      {selectedPipeline && selectedStages.length > 0 && (
        <ExecutionPanel />
      )}

      <ExecutionHistory />
    </div>
  );
}

