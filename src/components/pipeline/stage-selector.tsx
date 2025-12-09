'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import type { Stage } from '@/types/api';

interface StageSelectorProps {
  stages: Stage[];
}

export function StageSelector({ stages }: StageSelectorProps) {
  const { selectedStages, toggleStage, stages: allStages } = usePipelineStore();

  // Find missing dependencies
  const missingDependencies = selectedStages.flatMap((stageName) => {
    const stage = allStages[stageName];
    if (!stage?.dependencies) return [];
    return stage.dependencies.filter((dep) => !selectedStages.includes(dep));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Stages</CardTitle>
        <CardDescription>
          Choose which stages to include in the pipeline execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {stages.map((stage) => (
            <Label
              key={stage.name}
              htmlFor={stage.name}
              className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-accent ${
                selectedStages.includes(stage.name)
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <Checkbox
                id={stage.name}
                checked={selectedStages.includes(stage.name)}
                onCheckedChange={() => toggleStage(stage.name)}
                className="mt-0.5"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{stage.display_name}</span>
                  {stage.has_llm && (
                    <Badge variant="secondary" className="text-xs">
                      LLM
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {stage.description}
                </p>
                {stage.dependencies.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Requires: {stage.dependencies.join(', ')}
                  </p>
                )}
              </div>
            </Label>
          ))}
        </div>

        {missingDependencies.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Missing dependencies will be auto-included:{' '}
              {missingDependencies.join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

