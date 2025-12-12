'use client';

import { useSourceSelectionStore } from '@/lib/store/source-selection-store';
import { WizardStepIndicator } from '@/components/execution/wizard-step-indicator';
import { WizardErrorBoundary } from '@/components/execution/wizard-error-boundary';
import { SourceSelectionPanel } from '@/components/execution/source-selection/source-selection-panel';
import { GlobalConfigPanel } from '@/components/execution/global-config-panel';
import { useStages } from '@/hooks/use-stages';
import { PipelineSelector } from '@/components/pipeline/pipeline-selector';
import { StageSelector } from '@/components/pipeline/stage-selector';
import { StageConfigPanel } from '@/components/config/stage-config-panel';
import { ExecutionPanel } from '@/components/execution/execution-panel';
import { ExecutionHistory } from '@/components/execution/execution-history';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useConfigStore } from '@/lib/store/config-store';
import { useStageConfig } from '@/hooks/use-stage-config';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, ChevronsDown, ChevronsUp } from 'lucide-react';
import type { WizardStep } from '@/types/source-selection';

// Separate component for each stage to properly use hooks
function StageConfigPanelWrapper({ stageName }: { stageName: string }) {
  const { schema, isLoading } = useStageConfig(stageName);

  if (isLoading || !schema) {
    return <Skeleton className="h-32 w-full" />;
  }

  return <StageConfigPanel stageName={stageName} schema={schema} />;
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
  const currentStep = useSourceSelectionStore((state) => state.currentStep);
  const setCurrentStep = useSourceSelectionStore((state) => state.setCurrentStep);
  const goToNextStep = useSourceSelectionStore((state) => state.goToNextStep);
  const goToPreviousStep = useSourceSelectionStore((state) => state.goToPreviousStep);
  const getFilterSummary = useSourceSelectionStore((state) => state.getFilterSummary);
  
  const expandAll = useConfigStore((state) => state.expandAll);
  const collapseAll = useConfigStore((state) => state.collapseAll);
  
  const { data, isLoading, error } = useStages();
  const { selectedPipeline, selectedStages, stages } = usePipelineStore();

  // Determine completed steps
  const completedSteps: WizardStep[] = [];
  if (currentStep !== 'source_selection') {
    completedSteps.push('source_selection');
  }
  if (currentStep === 'execution') {
    completedSteps.push('configuration');
  }

  // Get stages for selected pipeline
  const pipelineStages = selectedPipeline
    ? Object.values(stages).filter((s) => s.pipeline === selectedPipeline)
    : [];

  const handleExpandAll = () => {
    expandAll(selectedStages);
  };

  const handleCollapseAll = () => {
    collapseAll();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Pipeline Execution</h1>
        <p className="text-muted-foreground">
          Select source videos, configure pipeline, and execute
        </p>
      </div>

      {/* Wizard Step Indicator */}
      <WizardStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      {/* Step 1: Source Selection */}
      {currentStep === 'source_selection' && (
        <WizardErrorBoundary stepName="Source Selection">
          <SourceSelectionPanel onContinue={goToNextStep} />
        </WizardErrorBoundary>
      )}

      {/* Step 2: Configuration */}
      {currentStep === 'configuration' && (
        <WizardErrorBoundary stepName="Configuration">
          <div className="space-y-6">
            {/* Back button with source summary */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={goToPreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Source Selection
              </Button>
              <span className="text-sm text-muted-foreground">
                {getFilterSummary()}
              </span>
            </div>

            <PipelineSelector pipelines={data.pipelines} />

            {selectedPipeline && <StageSelector stages={pipelineStages} />}

            {selectedStages.length > 0 && (
              <>
                {/* Global Configuration Panel */}
                <GlobalConfigPanel />

                {/* Stage Configuration Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Stage Configuration</h2>
                    <p className="text-muted-foreground text-sm">
                      Configure each stage. Essential fields shown by default.
                    </p>
                  </div>

                  {/* Expand/Collapse All buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExpandAll}
                    >
                      <ChevronsDown className="h-4 w-4 mr-2" />
                      Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCollapseAll}
                    >
                      <ChevronsUp className="h-4 w-4 mr-2" />
                      Collapse All
                    </Button>
                  </div>
                </div>

                <StageConfigPanels stageNames={selectedStages} />
              </>
            )}

            {selectedPipeline && selectedStages.length > 0 && (
              <div className="flex justify-end">
                <Button size="lg" onClick={goToNextStep}>
                  Continue to Execution
                </Button>
              </div>
            )}
          </div>
        </WizardErrorBoundary>
      )}

      {/* Step 3: Execution */}
      {currentStep === 'execution' && (
        <WizardErrorBoundary stepName="Execution">
          <div className="space-y-6">
            {/* Back button with config summary */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={goToPreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Configuration
              </Button>
              <div className="text-sm text-muted-foreground">
                {getFilterSummary()} • {selectedStages.length} stage(s) selected
              </div>
            </div>

            <ExecutionPanel />
            <ExecutionHistory />
          </div>
        </WizardErrorBoundary>
      )}
    </div>
  );
}
