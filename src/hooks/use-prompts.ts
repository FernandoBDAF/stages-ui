/**
 * React Query hooks for prompt management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi } from '@/lib/api/prompts';
import type {
  PromptSummary,
  PromptDetail,
  TestPromptResponse,
} from '@/lib/api/prompts';

// ============================================================================
// Query Keys
// ============================================================================

export const promptQueryKeys = {
  all: ['prompts'] as const,
  list: () => [...promptQueryKeys.all, 'list'] as const,
  byAgent: (agentType: string) => [...promptQueryKeys.all, 'agent', agentType] as const,
  detail: (promptId: string) => [...promptQueryKeys.all, 'detail', promptId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all prompts grouped by agent type
 */
export function usePrompts() {
  return useQuery({
    queryKey: promptQueryKeys.list(),
    queryFn: () => promptsApi.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch prompts for a specific agent type
 */
export function useAgentPrompts(agentType: string | null) {
  return useQuery({
    queryKey: promptQueryKeys.byAgent(agentType || ''),
    queryFn: () => promptsApi.listForAgent(agentType!),
    enabled: !!agentType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch full details for a specific prompt
 */
export function usePromptDetail(promptId: string | null) {
  return useQuery({
    queryKey: promptQueryKeys.detail(promptId || ''),
    queryFn: async () => {
      const response = await promptsApi.getDetail(promptId!);
      return response.prompt;
    },
    enabled: !!promptId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to test a prompt with sample input
 */
export function useTestPrompt() {
  return useMutation({
    mutationFn: ({
      promptId,
      testInput,
      modelName,
    }: {
      promptId: string;
      testInput: Record<string, string>;
      modelName?: string;
    }) => promptsApi.test(promptId, testInput, modelName),
  });
}

/**
 * Hook to reload prompts from database
 */
export function useReloadPrompts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => promptsApi.reload(),
    onSuccess: () => {
      // Invalidate all prompt queries after reload
      queryClient.invalidateQueries({ queryKey: promptQueryKeys.all });
    },
  });
}

// ============================================================================
// Derived Data Hooks
// ============================================================================

/**
 * Hook to get prompts for a stage (maps stage name to agent type)
 */
export function usePromptsForStage(stageName: string) {
  const { getAgentTypeForStage } = require('@/lib/api/prompts');
  const agentType = getAgentTypeForStage(stageName);
  
  const query = useAgentPrompts(agentType);
  
  return {
    ...query,
    agentType,
    prompts: query.data?.prompts || [],
    hasPrompts: (query.data?.prompts.length || 0) > 0,
  };
}

/**
 * Hook to get the default prompt for an agent type
 */
export function useDefaultPrompt(agentType: string | null): PromptSummary | null {
  const { data } = useAgentPrompts(agentType);
  
  if (!data?.prompts) return null;
  
  return data.prompts.find((p) => p.is_default) || null;
}

