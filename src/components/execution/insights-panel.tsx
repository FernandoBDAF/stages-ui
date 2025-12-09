'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, AlertTriangle, TrendingUp, DollarSign, 
  Zap, CheckCircle, ChevronRight, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineInsight } from '@/types/api';

interface InsightsPanelProps {
  insights: PipelineInsight[];
  onApplyConfig?: (configChange: Record<string, unknown>) => void;
  className?: string;
}

const typeIcons = {
  performance: TrendingUp,
  cost: DollarSign,
  quality: CheckCircle,
  error: AlertTriangle,
  info: Info,
};

const severityColors = {
  info: 'border-blue-500/50 bg-blue-500/10',
  warning: 'border-yellow-500/50 bg-yellow-500/10',
  critical: 'border-red-500/50 bg-red-500/10',
};

const severityBadgeColors = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

export function InsightsPanel({ insights, onApplyConfig, className }: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>No issues detected - pipeline running optimally</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Insights & Suggestions
          <Badge variant="secondary" className="text-xs">
            {insights.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const TypeIcon = typeIcons[insight.type] || Info;
          
          return (
            <div 
              key={index}
              className={cn(
                "p-3 rounded-lg border",
                severityColors[insight.severity]
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-1 rounded",
                  severityBadgeColors[insight.severity]
                )}>
                  <TypeIcon className="h-3 w-3 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{insight.title}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {insight.message}
                  </p>
                  
                  {insight.suggestion && (
                    <div className="flex items-start gap-2 text-xs">
                      <Zap className="h-3 w-3 text-yellow-500 mt-0.5" />
                      <div>
                        <span className="font-medium">Suggestion: </span>
                        <span className="text-muted-foreground">{insight.suggestion}</span>
                        {insight.impact && (
                          <span className="text-green-600 ml-1">({insight.impact})</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {insight.config_change && onApplyConfig && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => onApplyConfig(insight.config_change!)}
                    >
                      Apply Fix
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

