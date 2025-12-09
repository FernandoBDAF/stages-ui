'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { CategorySection } from './category-section';
import { useConfigStore } from '@/lib/store/config-store';
import type { StageConfigSchema } from '@/types/api';
import { cn } from '@/lib/utils/cn';

interface StageConfigPanelProps {
  stageName: string;
  schema: StageConfigSchema;
}

export function StageConfigPanel({ stageName, schema }: StageConfigPanelProps) {
  const { expandedPanels, togglePanel, resetStageConfig, configs } = useConfigStore();
  const isExpanded = expandedPanels.includes(stageName);
  const config = configs[stageName] || {};

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={() => togglePanel(stageName)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
                <CardTitle className="text-base">{schema.stage_name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {schema.field_count} fields
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetStageConfig(stageName);
                  }}
                  title="Reset to defaults"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {schema.categories.map((category) => (
              <CategorySection
                key={category.name}
                category={category}
                fields={schema.fields.filter((f) =>
                  category.fields.includes(f.name)
                )}
                stageName={stageName}
                values={config}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

