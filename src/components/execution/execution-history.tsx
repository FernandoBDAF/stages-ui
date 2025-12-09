'use client';

import { useState } from 'react';
import { usePipelineHistory } from '@/hooks/use-pipeline-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, Timer, Hash, Settings } from 'lucide-react';
import type { PipelineHistoryItem } from '@/types/api';

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  running: { icon: Clock, color: 'text-blue-500', label: 'Running' },
  starting: { icon: Clock, color: 'text-blue-500', label: 'Starting' },
  error: { icon: AlertCircle, color: 'text-orange-500', label: 'Error' },
  cancelled: { icon: XCircle, color: 'text-gray-500', label: 'Cancelled' },
  interrupted: { icon: AlertCircle, color: 'text-yellow-500', label: 'Interrupted' },
};

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '-';
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function PipelineHistoryRow({ pipeline }: { pipeline: PipelineHistoryItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = statusConfig[pipeline.status as keyof typeof statusConfig] 
    || statusConfig.error;
  const Icon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <div className="text-left">
              <div className="font-medium text-sm">
                {pipeline.pipeline.charAt(0).toUpperCase() + pipeline.pipeline.slice(1)} Pipeline
              </div>
              <div className="text-xs text-muted-foreground">
                {pipeline.stages.join(' → ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(pipeline.started_at).toLocaleString()}
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 ml-8 border-l-2 border-muted space-y-2">
          {/* Duration & Exit Code */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span>Duration: {formatDuration(pipeline.duration_seconds)}</span>
            </div>
            {pipeline.exit_code !== undefined && pipeline.exit_code !== null && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>Exit: {pipeline.exit_code}</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {pipeline.error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              <span className="font-medium">Error{pipeline.error_stage ? ` in ${pipeline.error_stage}` : ''}:</span>{' '}
              {pipeline.error}
            </div>
          )}

          {/* Config summary */}
          {pipeline.config && Object.keys(pipeline.config).length > 0 && (
            <div className="text-xs">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Settings className="h-3 w-3" />
                <span>Configuration:</span>
              </div>
              <div className="bg-muted/50 p-2 rounded font-mono text-[10px] max-h-24 overflow-auto">
                {JSON.stringify(pipeline.config, null, 2)}
              </div>
            </div>
          )}

          {/* Pipeline ID */}
          <div className="text-[10px] text-muted-foreground font-mono">
            ID: {pipeline.pipeline_id}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ExecutionHistory() {
  const { data, isLoading, error } = usePipelineHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently fail if history not available
  }

  if (data.pipelines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No executions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.pipelines.map((pipeline) => (
            <PipelineHistoryRow key={pipeline.pipeline_id} pipeline={pipeline} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

