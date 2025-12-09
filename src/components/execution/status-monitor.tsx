'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Clock, DollarSign, Zap, FileText } from 'lucide-react';
import { useLiveMetrics } from '@/hooks/use-metrics';
import { HistoricalContext } from './historical-context';
import { InsightsPanel } from './insights-panel';
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
  
  // Fetch live metrics during execution
  const { liveMetrics } = useLiveMetrics(pipelineId, isAnimated);

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

      {/* Live Metrics Display */}
      {liveMetrics && (
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-500" />
            <div>
              <span className="text-muted-foreground">Cost: </span>
              <span className="font-medium">${liveMetrics.cost_usd.toFixed(4)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            <div>
              <span className="text-muted-foreground">Tokens: </span>
              <span className="font-medium">{liveMetrics.tokens_used.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-blue-500" />
            <div>
              <span className="text-muted-foreground">Docs: </span>
              <span className="font-medium">{liveMetrics.documents_processed}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Elapsed: {status.elapsed_seconds}s</span>
      </div>

      {/* Historical Context (Week 2) */}
      {status.context?.historical && (
        <HistoricalContext
          currentDuration={status.elapsed_seconds}
          historical={status.context.historical.duration}
          sampleSize={status.context.historical.sample_size}
          className="pt-2 border-t"
        />
      )}

      {/* Insights Panel (Week 3) */}
      {status.insights && status.insights.length > 0 && (
        <InsightsPanel
          insights={status.insights}
          className="mt-4"
        />
      )}

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

