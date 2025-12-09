'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HistoricalStats {
  avg: number;
  min: number;
  max: number;
  p90: number;
}

interface HistoricalContextProps {
  currentDuration: number;
  historical: HistoricalStats;
  sampleSize: number;
  className?: string;
}

export function HistoricalContext({ 
  currentDuration, 
  historical, 
  sampleSize,
  className 
}: HistoricalContextProps) {
  const { avg, min, max, p90 } = historical;
  
  // Calculate comparison
  const percentDiff = avg > 0 ? ((currentDuration - avg) / avg) * 100 : 0;
  const isFaster = percentDiff < -5;
  const isSlower = percentDiff > 5;
  const isNormal = !isFaster && !isSlower;
  
  // Calculate percentile rank (higher is better for speed)
  const getPercentileRank = (): number => {
    if (min === max || max === 0) return 50;
    if (currentDuration <= min) return 100; // Best
    if (currentDuration >= max) return 0; // Worst
    if (currentDuration <= p90) return 90; // Within 90th percentile
    return Math.round(100 - ((currentDuration - min) / (max - min)) * 100);
  };
  
  const percentileRank = getPercentileRank();

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  if (sampleSize === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground italic flex items-center gap-1", className)}>
        <Info className="h-3 w-3" />
        <span>No historical data yet</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-1", className)}>
        {/* Comparison indicator */}
        <div className="flex items-center gap-1.5 text-sm">
          {isFaster && (
            <>
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                {Math.abs(percentDiff).toFixed(0)}% faster
              </span>
            </>
          )}
          {isSlower && (
            <>
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                {percentDiff.toFixed(0)}% slower
              </span>
            </>
          )}
          {isNormal && (
            <>
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Normal pace
              </span>
            </>
          )}
          <span className="text-xs text-muted-foreground">
            vs avg of {formatDuration(avg)}
          </span>
        </div>
        
        {/* Detailed stats */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
              <Info className="h-3 w-3" />
              <span>
                Top {Math.max(0, 100 - percentileRank)}% of runs (based on {sampleSize} execution{sampleSize !== 1 ? 's' : ''})
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">📊 Historical Performance</p>
              <p>• Average: {formatDuration(avg)}</p>
              <p>• Fastest: {formatDuration(min)}</p>
              <p>• Slowest: {formatDuration(max)}</p>
              <p>• 90th percentile: {formatDuration(p90)}</p>
              <p className="pt-1 text-muted-foreground">
                Based on {sampleSize} completed execution{sampleSize !== 1 ? 's' : ''}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

