'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import type { PipelineStatus } from '@/types/api';

interface StatusMonitorProps {
  pipelineId: string;
  status: PipelineStatus;
}

const statusConfig = {
  starting: { icon: Loader2, color: 'bg-blue-500', text: 'Starting...', variant: 'default' as const },
  running: { icon: Loader2, color: 'bg-blue-500', text: 'Running', variant: 'default' as const },
  completed: { icon: CheckCircle, color: 'bg-green-500', text: 'Completed', variant: 'default' as const },
  failed: { icon: XCircle, color: 'bg-red-500', text: 'Failed', variant: 'destructive' as const },
  error: { icon: XCircle, color: 'bg-red-500', text: 'Error', variant: 'destructive' as const },
  cancelled: { icon: XCircle, color: 'bg-yellow-500', text: 'Cancelled', variant: 'default' as const },
};

export function StatusMonitor({ pipelineId, status }: StatusMonitorProps) {
  const config = statusConfig[status.status];
  const Icon = config.icon;
  const isAnimated = ['starting', 'running'].includes(status.status);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <Icon
            className={`h-4 w-4 ${isAnimated ? 'animate-spin' : ''}`}
          />
          <span className="font-medium">{config.text}</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {pipelineId}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Current Stage: {status.current_stage || 'N/A'}
          </span>
          <span className="text-muted-foreground">
            {status.progress.completed_stages}/{status.progress.total_stages}
          </span>
        </div>
        <Progress value={status.progress.percent} />
        <p className="text-xs text-right text-muted-foreground">
          {status.progress.percent.toFixed(0)}% complete
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Elapsed: {status.elapsed_seconds}s</span>
      </div>

      {status.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

