'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Clock,
  Zap,
  Tag,
  FileText,
  Beaker,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { usePromptDetail, useTestPrompt } from '@/hooks/use-prompts';
import { cn } from '@/lib/utils';

interface PromptPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string | null;
  agentType: string | null;
}

export function PromptPreviewDialog({
  isOpen,
  onClose,
  promptId,
  agentType,
}: PromptPreviewDialogProps) {
  const [testInput, setTestInput] = useState('');
  const [activeTab, setActiveTab] = useState('prompts');

  const { data: prompt, isLoading: promptLoading } = usePromptDetail(promptId);
  const testMutation = useTestPrompt();

  const handleRunTest = async () => {
    if (!promptId || !testInput.trim()) return;

    // For TranscriptCleanAgent, the input variable is raw_text
    const inputMap: Record<string, string> = {
      raw_text: testInput,
    };

    testMutation.mutate({
      promptId,
      testInput: inputMap,
    });
  };

  const handleClose = () => {
    setTestInput('');
    testMutation.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {promptLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              prompt?.name || 'Prompt Preview'
            )}
          </DialogTitle>
          <DialogDescription>
            {promptLoading ? (
              <Skeleton className="h-4 w-64" />
            ) : (
              prompt?.description || `Preview and test the prompt template for ${agentType}`
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompts">
              <FileText className="h-4 w-4 mr-2" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="test">
              <Beaker className="h-4 w-4 mr-2" />
              Test
            </TabsTrigger>
            <TabsTrigger value="metadata">
              <Info className="h-4 w-4 mr-2" />
              Metadata
            </TabsTrigger>
          </TabsList>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="mt-4 space-y-4">
            {promptLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : prompt ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">System Prompt</Label>
                  <ScrollArea className="h-40 rounded-md border p-3 bg-muted/30">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {prompt.system_prompt}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    User Prompt Template
                    <span className="text-muted-foreground font-normal ml-2">
                      (variables in {'{braces}'})
                    </span>
                  </Label>
                  <ScrollArea className="h-64 rounded-md border p-3 bg-muted/30">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {prompt.user_prompt_template}
                    </pre>
                  </ScrollArea>
                </div>
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No prompt selected. Select a prompt from the dropdown to preview.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Test Input</Label>
              <p className="text-xs text-muted-foreground">
                Enter sample text to test this prompt. For transcript cleaning, paste a raw
                transcript snippet.
              </p>
              <Textarea
                value={testInput}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTestInput(e.target.value)}
                placeholder="Enter sample text to test the prompt..."
                className="h-32 font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleRunTest}
              disabled={!promptId || !testInput.trim() || testMutation.isPending}
              className="gap-2"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>

            {/* Test Results */}
            {testMutation.data && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {testMutation.data.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Test Result
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        Test Failed
                      </>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {testMutation.data.elapsed_seconds}s
                    </Badge>
                    {testMutation.data.model_used && (
                      <Badge variant="secondary" className="text-xs">
                        {testMutation.data.model_used}
                      </Badge>
                    )}
                  </div>
                </div>

                {testMutation.data.success && testMutation.data.output ? (
                  <ScrollArea className="h-48 rounded-md border p-3 bg-green-50 dark:bg-green-950/20">
                    <pre className="text-sm whitespace-pre-wrap">
                      {testMutation.data.output}
                    </pre>
                  </ScrollArea>
                ) : testMutation.data.error ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{testMutation.data.error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            )}

            {testMutation.isError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {testMutation.error instanceof Error
                    ? testMutation.error.message
                    : 'Failed to run test'}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="mt-4 space-y-4">
            {promptLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : prompt ? (
              <>
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prompt ID</Label>
                    <p className="text-sm font-mono">{prompt.prompt_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Version</Label>
                    <p className="text-sm">{prompt.version}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Agent Type</Label>
                    <p className="text-sm font-mono">{prompt.agent_type}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex gap-2">
                      {prompt.is_default && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Default
                        </Badge>
                      )}
                      {prompt.active !== false && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {prompt.performance_metrics && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Performance Metrics
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      {prompt.performance_metrics.avg_quality_score !== undefined && (
                        <div className="text-center p-3 bg-background rounded-md">
                          <p className="text-2xl font-bold">
                            {(prompt.performance_metrics.avg_quality_score * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Quality Score</p>
                        </div>
                      )}
                      {prompt.performance_metrics.avg_latency_ms !== undefined && (
                        <div className="text-center p-3 bg-background rounded-md">
                          <p className="text-2xl font-bold">
                            {(prompt.performance_metrics.avg_latency_ms / 1000).toFixed(1)}s
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Latency</p>
                        </div>
                      )}
                      {prompt.performance_metrics.sample_size !== undefined && (
                        <div className="text-center p-3 bg-background rounded-md">
                          <p className="text-2xl font-bold">
                            {prompt.performance_metrics.sample_size}
                          </p>
                          <p className="text-xs text-muted-foreground">Sample Size</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {prompt.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {prompt.created_at && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p>{new Date(prompt.created_at).toLocaleString()}</p>
                    </div>
                  )}
                  {prompt.updated_at && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Last Updated</Label>
                      <p>{new Date(prompt.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No prompt selected. Select a prompt from the dropdown to view metadata.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

