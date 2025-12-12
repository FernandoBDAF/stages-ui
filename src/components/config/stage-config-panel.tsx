'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw, Info } from 'lucide-react';
import { CategorySection } from './category-section';
import { useConfigStore } from '@/lib/store/config-store';
import type { StageConfigSchema, ConfigField } from '@/types/api';
import { cn } from '@/lib/utils/cn';

type FieldVisibility = 'essential' | 'advanced' | 'all';

// Key fields that should always be shown in "essential" view
const ESSENTIAL_FIELD_NAMES = [
  'db_name',
  'concurrency',
  'model_name',
  'batch_size',
  'verbose',
];

interface StageConfigPanelProps {
  stageName: string;
  schema: StageConfigSchema;
}

export function StageConfigPanel({ stageName, schema }: StageConfigPanelProps) {
  const { expandedPanels, togglePanel, resetStageConfig, configs } = useConfigStore();
  const globalConfig = useConfigStore((state) => state.globalConfig);
  const isExpanded = expandedPanels.includes(stageName);
  const config = configs[stageName] || {};
  
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibility>('essential');

  // Categorize fields by importance
  const { essentialFields, advancedFields, inheritedFields, visibleCategories, visibleFieldCount } = useMemo(() => {
    const essential: ConfigField[] = [];
    const advanced: ConfigField[] = [];
    const inherited: ConfigField[] = [];

    for (const field of schema.fields) {
      // Inherited fields (from global config)
      if (field.is_inherited) {
        inherited.push(field);
        continue;
      }
      
      // Essential: required fields or key fields
      if (field.required || ESSENTIAL_FIELD_NAMES.includes(field.name)) {
        essential.push(field);
      } else {
        advanced.push(field);
      }
    }

    // Determine which fields are visible based on current visibility setting
    let visibleFields: ConfigField[];
    switch (fieldVisibility) {
      case 'essential':
        visibleFields = essential;
        break;
      case 'advanced':
        visibleFields = [...essential, ...advanced];
        break;
      case 'all':
      default:
        visibleFields = schema.fields;
        break;
    }

    // Filter categories to only include those with visible fields
    const visibleFieldNames = new Set(visibleFields.map(f => f.name));
    const filteredCategories = schema.categories
      .map(category => ({
        ...category,
        fields: category.fields.filter(fieldName => visibleFieldNames.has(fieldName)),
      }))
      .filter(category => category.fields.length > 0);

    return {
      essentialFields: essential,
      advancedFields: advanced,
      inheritedFields: inherited,
      visibleCategories: filteredCategories,
      visibleFieldCount: visibleFields.length,
    };
  }, [schema, fieldVisibility]);

  const hasGlobalConfig = globalConfig.db_name || globalConfig.concurrency;

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
            {/* Field visibility toggle */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="text-sm text-muted-foreground">
                Showing <strong>{visibleFieldCount}</strong> of {schema.field_count} fields
              </div>

              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={fieldVisibility === 'essential' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFieldVisibility('essential')}
                  className="h-7 text-xs"
                >
                  Essential ({essentialFields.length})
                </Button>
                <Button
                  variant={fieldVisibility === 'advanced' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFieldVisibility('advanced')}
                  className="h-7 text-xs"
                >
                  Advanced ({essentialFields.length + advancedFields.length})
                </Button>
                <Button
                  variant={fieldVisibility === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFieldVisibility('all')}
                  className="h-7 text-xs"
                >
                  All ({schema.field_count})
                </Button>
              </div>
            </div>

            {/* Render visible categories */}
            {visibleCategories.map((category) => (
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

            {/* Inherited fields indicator */}
            {fieldVisibility === 'all' && inheritedFields.length > 0 && hasGlobalConfig && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                  {inheritedFields.length} field{inheritedFields.length !== 1 ? 's' : ''} can inherit from{' '}
                  <strong>Global Configuration</strong>. Values set globally will apply to this stage
                  unless overridden here.
                </AlertDescription>
              </Alert>
            )}

            {/* Empty state when no visible fields */}
            {visibleFieldCount === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fields to display in this view.</p>
                <Button
                  variant="link"
                  onClick={() => setFieldVisibility('all')}
                  className="mt-2"
                >
                  Show all fields
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
