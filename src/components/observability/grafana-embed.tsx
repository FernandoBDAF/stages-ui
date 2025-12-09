'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, ExternalLink, RefreshCw, Minimize2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GrafanaEmbedProps {
  /** Dashboard UID from Grafana */
  dashboardUid: string;
  /** Optional panel ID for single panel embed */
  panelId?: number;
  /** Dashboard/query variables */
  vars?: Record<string, string>;
  /** Time range start (e.g., 'now-1h', 'now-24h') */
  from?: string;
  /** Time range end (e.g., 'now') */
  to?: string;
  /** Title shown above the embed */
  title?: string;
  /** Height in pixels */
  height?: number;
  /** Theme override ('light' | 'dark') - defaults to 'light' */
  theme?: 'light' | 'dark';
  /** Auto-refresh interval (e.g., '5s', '10s', '30s') */
  refresh?: string;
  /** Additional CSS classes */
  className?: string;
}

const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3000';

/**
 * GrafanaEmbed - Embeds Grafana dashboards or individual panels in StagesUI
 * 
 * Features:
 * - Full dashboard or single panel embedding
 * - Dynamic variables (pipeline_id, time range)
 * - Expand/fullscreen mode
 * - External link to full Grafana
 * - Manual refresh control
 * 
 * Usage:
 * ```tsx
 * <GrafanaEmbed
 *   dashboardUid="graphrag-pipeline"
 *   panelId={2}
 *   vars={{ pipeline: 'ingestion' }}
 *   title="Pipeline Metrics"
 *   height={400}
 * />
 * ```
 */
export function GrafanaEmbed({
  dashboardUid,
  panelId,
  vars = {},
  from = 'now-1h',
  to = 'now',
  title,
  height = 300,
  theme = 'light',
  refresh = '10s',
  className,
}: GrafanaEmbedProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset loading state when refreshKey changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [refreshKey, dashboardUid, panelId]);

  // Build embed URL with parameters
  const buildEmbedUrl = () => {
    const params = new URLSearchParams({
      orgId: '1',
      from,
      to,
      theme,
      refresh,
    });

    // Add custom variables
    Object.entries(vars).forEach(([key, value]) => {
      params.append(`var-${key}`, value);
    });

    if (panelId !== undefined) {
      // Single panel embed (solo mode)
      return `${GRAFANA_URL}/d-solo/${dashboardUid}?${params}&panelId=${panelId}`;
    }

    // Full dashboard embed (kiosk mode)
    return `${GRAFANA_URL}/d/${dashboardUid}?${params}&kiosk`;
  };

  // Open dashboard in new Grafana tab
  const openInGrafana = () => {
    const params = new URLSearchParams({ orgId: '1', from, to });
    Object.entries(vars).forEach(([key, value]) => {
      params.append(`var-${key}`, value);
    });
    
    const url = panelId !== undefined
      ? `${GRAFANA_URL}/d/${dashboardUid}?${params}&viewPanel=${panelId}`
      : `${GRAFANA_URL}/d/${dashboardUid}?${params}`;
    
    window.open(url, '_blank');
  };

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false);
  };

  // Handle iframe error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const embedUrl = buildEmbedUrl();
  const displayHeight = isExpanded ? 'calc(100vh - 8rem)' : height;

  return (
    <Card 
      className={cn(
        'transition-all duration-300',
        isExpanded && 'fixed inset-4 z-50 shadow-2xl',
        className
      )}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title || 'Grafana Dashboard'}
          {isLoading && (
            <Badge variant="outline" className="text-xs animate-pulse">
              Loading...
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setRefreshKey(k => k + 1)}
            title="Refresh"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={openInGrafana}
            title="Open in Grafana"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {hasError ? (
          <div 
            className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
            style={{ height: displayHeight }}
          >
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">Failed to load Grafana dashboard</p>
            <p className="text-xs">Make sure Grafana is running at {GRAFANA_URL}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(k => k + 1)}
            >
              Retry
            </Button>
          </div>
        ) : (
          <iframe
            key={refreshKey}
            src={embedUrl}
            width="100%"
            height={displayHeight}
            frameBorder="0"
            className="rounded-b-lg"
            onLoad={handleLoad}
            onError={handleError}
            title={title || 'Grafana Dashboard'}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Preset dashboard configurations for common use cases
 */
export const GrafanaDashboards = {
  /** Main pipeline overview dashboard */
  PIPELINE_OVERVIEW: {
    uid: 'graphrag-pipeline',
    title: 'Pipeline Overview',
  },
  /** Stages API metrics dashboard */
  STAGES_API: {
    uid: 'stages-api-dashboard',
    title: 'Stages API Metrics',
  },
  /** LLM cost and token tracking */
  LLM_COSTS: {
    uid: 'llm-cost-tracking',
    title: 'LLM Cost & Tokens',
  },
  /** System health overview */
  SYSTEM_HEALTH: {
    uid: 'system-health-overview',
    title: 'System Health',
  },
  /** Log correlation dashboard */
  LOG_CORRELATION: {
    uid: 'log-correlation',
    title: 'Log Analysis',
  },
} as const;

/**
 * Pre-configured GrafanaEmbed for pipeline metrics
 */
export function PipelineMetricsEmbed({ 
  pipelineType,
  className,
}: { 
  pipelineType?: string;
  className?: string;
}) {
  return (
    <GrafanaEmbed
      dashboardUid={GrafanaDashboards.PIPELINE_OVERVIEW.uid}
      title={GrafanaDashboards.PIPELINE_OVERVIEW.title}
      vars={pipelineType ? { pipeline: pipelineType } : {}}
      from="now-1h"
      to="now"
      height={350}
      className={className}
    />
  );
}

/**
 * Pre-configured GrafanaEmbed for LLM cost tracking
 */
export function LLMCostEmbed({ className }: { className?: string }) {
  return (
    <GrafanaEmbed
      dashboardUid={GrafanaDashboards.LLM_COSTS.uid}
      title={GrafanaDashboards.LLM_COSTS.title}
      from="now-24h"
      to="now"
      height={350}
      className={className}
    />
  );
}

