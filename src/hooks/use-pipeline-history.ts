'use client';

import { useQuery } from '@tanstack/react-query';
import { pipelinesApi } from '@/lib/api/pipelines';

export function usePipelineHistory(limit = 10) {
  return useQuery({
    queryKey: ['pipeline-history', limit],
    queryFn: () => pipelinesApi.getHistory(limit),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

