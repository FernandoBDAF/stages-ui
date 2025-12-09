import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/api/stages';
import { useConfigStore } from '@/lib/store/config-store';
import { useEffect } from 'react';

export function useStageConfig(stageName: string) {
  const { setSchema, setDefaults } = useConfigStore();

  const schemaQuery = useQuery({
    queryKey: ['stage-config', stageName],
    queryFn: () => stagesApi.getStageConfig(stageName),
    enabled: !!stageName,
  });

  const defaultsQuery = useQuery({
    queryKey: ['stage-defaults', stageName],
    queryFn: () => stagesApi.getStageDefaults(stageName),
    enabled: !!stageName,
  });

  useEffect(() => {
    if (schemaQuery.data) {
      setSchema(stageName, schemaQuery.data);
    }
  }, [schemaQuery.data, stageName, setSchema]);

  useEffect(() => {
    if (defaultsQuery.data) {
      setDefaults(stageName, defaultsQuery.data);
    }
  }, [defaultsQuery.data, stageName, setDefaults]);

  return {
    schema: schemaQuery.data,
    defaults: defaultsQuery.data,
    isLoading: schemaQuery.isLoading || defaultsQuery.isLoading,
    error: schemaQuery.error || defaultsQuery.error,
  };
}

