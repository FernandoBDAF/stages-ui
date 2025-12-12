'use client';

import { useState } from 'react';
import { ConfigField } from './config-field';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { useConfigStore } from '@/lib/store/config-store';
import { cn } from '@/lib/utils/cn';
import type { Category, ConfigField as ConfigFieldType } from '@/types/api';

interface CategorySectionProps {
  category: Category;
  fields: ConfigFieldType[];
  stageName: string;
  values: Record<string, unknown>;
}

export function CategorySection({
  category,
  fields,
  stageName,
  values,
}: CategorySectionProps) {
  // Auto-collapse "Database Configuration" if global db_name is set
  const globalConfig = useConfigStore((state) => state.globalConfig);
  const hasGlobalDbConfig = globalConfig.db_name && globalConfig.db_name.trim() !== '';
  
  const shouldAutoCollapse = 
    category.name === 'Database Configuration' && hasGlobalDbConfig;
  
  const [isOpen, setIsOpen] = useState(!shouldAutoCollapse);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-4">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full group text-left">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform text-muted-foreground',
                  isOpen && 'rotate-90'
                )}
              />
              {category.name}
              <Badge variant="outline" className="text-xs font-normal">
                {fields.length}
              </Badge>
            </h4>
            {!isOpen && hasGlobalDbConfig && category.name === 'Database Configuration' && (
              <Badge variant="secondary" className="text-xs">
                Using global config
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid gap-4 md:grid-cols-2 pl-6">
            {fields.map((field) => (
              <ConfigField
                key={field.name}
                field={field}
                stageName={stageName}
                value={values[field.name]}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
