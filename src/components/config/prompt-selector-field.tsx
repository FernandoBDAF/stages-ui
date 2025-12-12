'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Sparkles, Zap, Star, Clock } from 'lucide-react';
import { usePromptsForStage } from '@/hooks/use-prompts';
import { PromptPreviewDialog } from './prompt-preview-dialog';
import { cn } from '@/lib/utils';
import type { PromptSummary } from '@/lib/api/prompts';

interface PromptSelectorFieldProps {
  stageName: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

export function PromptSelectorField({
  stageName,
  value,
  onChange,
}: PromptSelectorFieldProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const { prompts, agentType, isLoading, hasPrompts } = usePromptsForStage(stageName);

  // Find selected prompt for display
  const selectedPrompt = prompts.find((p) => p.prompt_id === value);

  const handlePreview = (promptId: string) => {
    setSelectedPromptId(promptId);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Prompt Template
        </Label>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!agentType) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Prompt Template
        </Label>
        <p className="text-xs text-muted-foreground">
          This stage does not support prompt selection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Prompt Template
      </Label>

      <div className="flex gap-2">
        <Select
          value={value || '__default__'}
          onValueChange={(v) => onChange(v === '__default__' ? null : v)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a prompt template..." />
          </SelectTrigger>
          <SelectContent>
            {/* Default option */}
            <SelectItem value="__default__">
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>Default (Hardcoded)</span>
                <Badge variant="secondary" className="text-xs ml-2">
                  Recommended
                </Badge>
              </div>
            </SelectItem>

            {/* Database prompts */}
            {prompts.map((prompt) => (
              <SelectItem key={prompt.prompt_id} value={prompt.prompt_id}>
                <div className="flex items-center gap-2">
                  {prompt.is_default ? (
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{prompt.name}</span>
                  {prompt.is_default && (
                    <Badge variant="outline" className="text-xs ml-2">
                      DB Default
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Preview button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePreview(value || selectedPrompt?.prompt_id || prompts[0]?.prompt_id || '')}
          disabled={!hasPrompts && !value}
          title="Preview prompt"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected prompt info */}
      {selectedPrompt && (
        <div className="p-3 bg-muted/50 rounded-md space-y-2">
          <p className="text-sm text-muted-foreground">
            {selectedPrompt.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Performance metrics */}
            {selectedPrompt.performance_metrics?.avg_quality_score && (
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Quality: {(selectedPrompt.performance_metrics.avg_quality_score * 100).toFixed(0)}%
              </Badge>
            )}
            {selectedPrompt.performance_metrics?.avg_latency_ms && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                ~{(selectedPrompt.performance_metrics.avg_latency_ms / 1000).toFixed(1)}s
              </Badge>
            )}
            {/* Tags */}
            {selectedPrompt.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* No prompts info */}
      {!hasPrompts && (
        <p className="text-xs text-muted-foreground">
          No custom prompts available for {agentType}. Using hardcoded default.
        </p>
      )}

      {/* Preview Dialog */}
      <PromptPreviewDialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        promptId={selectedPromptId}
        agentType={agentType}
      />
    </div>
  );
}

