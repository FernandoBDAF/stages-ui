import { useState, useEffect, useCallback, useRef } from 'react';
import { metricsApi, PipelineMetrics, LiveMetrics } from '@/lib/api/metrics';

interface UseMetricsOptions {
  pipelineId?: string;
  pollInterval?: number; // ms, default 2000
  enabled?: boolean;
}

interface UseMetricsResult {
  metrics: PipelineMetrics | null;
  liveMetrics: LiveMetrics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMetrics(options: UseMetricsOptions = {}): UseMetricsResult {
  const { 
    pipelineId, 
    pollInterval = 2000, 
    enabled = true 
  } = options;
  
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  const fetchMetrics = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      if (pipelineId) {
        // Fetch pipeline-specific metrics
        const [pipelineMetrics, live] = await Promise.all([
          metricsApi.getForPipeline(pipelineId).catch(() => null),
          metricsApi.getLive(pipelineId).catch(() => null)
        ]);
        
        if (mountedRef.current) {
          if (pipelineMetrics) setMetrics(pipelineMetrics);
          if (live) setLiveMetrics(live);
        }
      } else {
        // Fetch global metrics
        const globalMetrics = await metricsApi.getGlobal().catch(() => null);
        if (mountedRef.current && globalMetrics) {
          setMetrics(globalMetrics);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [pipelineId, enabled]);
  
  // Initial fetch and polling setup
  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled) return;
    
    // Initial fetch
    fetchMetrics();
    
    // Set up polling
    if (pollInterval > 0) {
      pollingRef.current = setInterval(fetchMetrics, pollInterval);
    }
    
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchMetrics, pollInterval, enabled]);
  
  return {
    metrics,
    liveMetrics,
    isLoading,
    error,
    refresh: fetchMetrics,
  };
}

// Convenience hook for live pipeline monitoring
export function useLiveMetrics(pipelineId: string, enabled = true) {
  return useMetrics({
    pipelineId,
    pollInterval: 1000, // Poll every second for live data
    enabled,
  });
}

