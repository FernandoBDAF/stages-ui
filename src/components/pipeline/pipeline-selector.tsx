'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import type { Pipeline, PipelineType } from '@/types/api';

interface PipelineSelectorProps {
  pipelines: Record<string, Pipeline>;
}

export function PipelineSelector({ pipelines }: PipelineSelectorProps) {
  const { selectedPipeline, selectPipeline } = usePipelineStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Pipeline</CardTitle>
        <CardDescription>
          Choose the pipeline type to configure and execute
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedPipeline || ''}
          onValueChange={(value) => selectPipeline(value as PipelineType)}
          className="grid gap-4 md:grid-cols-2"
        >
          {Object.entries(pipelines).map(([key, pipeline]) => (
            <Label
              key={key}
              htmlFor={key}
              className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent ${
                selectedPipeline === key
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <RadioGroupItem value={key} id={key} className="mt-1" />
              <div className="space-y-1">
                <p className="font-medium leading-none">{pipeline.name}</p>
                <p className="text-sm text-muted-foreground">
                  {pipeline.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pipeline.stage_count} stages available
                </p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

