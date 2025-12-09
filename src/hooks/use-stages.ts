import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/api/stages';
import { usePipelineStore } from '@/lib/store/pipeline-store';
import { useEffect } from 'react';

export function useStages() {
  const { setPipelines, setStages } = usePipelineStore();

  const query = useQuery({
    queryKey: ['stages'],
    queryFn: stagesApi.listStages,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (query.data) {
      setPipelines(query.data.pipelines);
      setStages(query.data.stages);
    }
  }, [query.data, setPipelines, setStages]);

  return query;
}

