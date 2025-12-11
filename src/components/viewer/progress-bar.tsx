'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  percentage: number;
  estimatedTime: number;
  className?: string;
}

export function ProgressBar({ percentage, estimatedTime, className }: ProgressBarProps) {
  const remainingTime = Math.ceil(estimatedTime * ((100 - percentage) / 100));
  
  return (
    <div className={cn('relative', className)}>
      {/* Progress track */}
      <div className="h-1 bg-neutral-200/50 dark:bg-neutral-800/50">
        {/* Progress fill */}
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Stats overlay */}
      <div className="absolute right-3 top-2 flex items-center gap-3 text-xs font-medium">
        <span className="text-neutral-500 dark:text-neutral-400">
          {percentage}%
        </span>
        {remainingTime > 0 && (
          <span className="text-neutral-400 dark:text-neutral-500">
            {remainingTime} min left
          </span>
        )}
      </div>
    </div>
  );
}

