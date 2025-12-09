'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DollarSign, Zap, FileText, Clock, TrendingUp, TrendingDown, 
  Minus, AlertTriangle, CheckCircle, RefreshCw 
} from 'lucide-react';
import { useLiveMetrics } from '@/hooks/use-metrics';
import { cn } from '@/lib/utils';

interface MetricsPanelProps {
  pipelineId: string;
  isRunning: boolean;
  className?: string;
}

export function MetricsPanel({ pipelineId, isRunning, className }: MetricsPanelProps) {
  const { metrics, liveMetrics, isLoading, error, refresh } = useLiveMetrics(pipelineId, isRunning);
  
  // Format currency
  const formatCost = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(2)}`;
  };

  // Format large numbers
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Trend indicator component
  const TrendIndicator = ({ value, reverse = false }: { value: number; reverse?: boolean }) => {
    const isGood = reverse ? value < 0 : value > 0;
    const isNeutral = Math.abs(value) < 5;
    
    if (isNeutral) {
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
    
    return isGood ? (
      <TrendingUp className="h-3 w-3 text-green-500" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-500" />
    );
  };

  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed to load metrics: {error}</span>
            <button onClick={refresh} className="ml-auto hover:opacity-70">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics && isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="pt-4">
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const llm = metrics?.llm || { total_calls: 0, total_cost_usd: 0, tokens: { total: 0, prompt: 0, completion: 0 } };
  const processing = metrics?.processing || { documents_processed: 0, entities_extracted: 0, relationships_created: 0 };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📊 Live Metrics
            {isRunning && (
              <Badge variant="outline" className="animate-pulse text-xs">
                Live
              </Badge>
            )}
          </CardTitle>
          <button 
            onClick={refresh} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cost & Tokens Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cost */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3 text-green-500" />
                    <span>LLM Cost</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatCost(llm.total_cost_usd)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {llm.total_calls} API calls
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total cost of LLM API calls</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Tokens */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span>Tokens</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatNumber(llm.tokens.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatNumber(llm.tokens.prompt)} prompt / {formatNumber(llm.tokens.completion)} completion
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Token breakdown: {llm.tokens.prompt.toLocaleString()} prompt + {llm.tokens.completion.toLocaleString()} completion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Processing Stats */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <FileText className="h-3 w-3 text-blue-500" />
            <span>Processing</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-muted/50">
              <div className="text-sm font-medium">{processing.documents_processed}</div>
              <div className="text-xs text-muted-foreground">Documents</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-sm font-medium">{processing.entities_extracted}</div>
              <div className="text-xs text-muted-foreground">Entities</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-sm font-medium">{processing.relationships_created}</div>
              <div className="text-xs text-muted-foreground">Relations</div>
            </div>
          </div>
        </div>

        {/* Stage Durations */}
        {metrics?.stages && Object.keys(metrics.stages).length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Clock className="h-3 w-3 text-purple-500" />
              <span>Stage Durations</span>
            </div>
            
            <div className="space-y-1">
              {Object.entries(metrics.stages).map(([stage, data]) => (
                <div key={stage} className="flex items-center gap-2 text-xs">
                  <span className="w-24 truncate text-muted-foreground">{stage}</span>
                  <div className="flex-1">
                    <Progress 
                      value={Math.min((data.duration / 60) * 100, 100)} 
                      className="h-1.5"
                    />
                  </div>
                  <span className="w-12 text-right">
                    {data.duration.toFixed(1)}s
                  </span>
                  {data.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : data.errors > 0 ? (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors Summary */}
        {metrics?.errors && metrics.errors.total > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {metrics.errors.total} error{metrics.errors.total !== 1 ? 's' : ''} occurred
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

