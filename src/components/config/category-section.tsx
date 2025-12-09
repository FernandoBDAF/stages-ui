'use client';

import { ConfigField } from './config-field';
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
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {category.name}
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <ConfigField
            key={field.name}
            field={field}
            stageName={stageName}
            value={values[field.name]}
          />
        ))}
      </div>
    </div>
  );
}

