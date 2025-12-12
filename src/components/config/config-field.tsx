'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useConfigStore } from '@/lib/store/config-store';
import { PromptSelectorField } from './prompt-selector-field';
import type { ConfigField as ConfigFieldType } from '@/types/api';

interface ConfigFieldProps {
  field: ConfigFieldType;
  stageName: string;
  value: unknown;
}

export function ConfigField({ field, stageName, value }: ConfigFieldProps) {
  const { setFieldValue } = useConfigStore();

  const handleChange = (newValue: unknown) => {
    setFieldValue(stageName, field.name, newValue);
  };

  const renderInput = () => {
    switch (field.ui_type) {
      case 'checkbox':
        return (
          <Checkbox
            id={`${stageName}-${field.name}`}
            checked={Boolean(value)}
            onCheckedChange={handleChange}
          />
        );

      case 'slider':
        return (
          <div className="flex items-center gap-4">
            <Slider
              id={`${stageName}-${field.name}`}
              value={[Number(value) || field.min || 0]}
              onValueChange={([v]) => handleChange(v)}
              min={field.min ?? 0}
              max={field.max ?? 1}
              step={field.step ?? 0.1}
              className="flex-1"
            />
            <span className="text-sm font-mono w-12 text-right">
              {Number(value)?.toFixed(2) || String(field.default)}
            </span>
          </div>
        );

      case 'select':
        return (
          <Select
            value={String(value ?? '')}
            onValueChange={handleChange}
          >
            <SelectTrigger id={`${stageName}-${field.name}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                  {option === field.recommended && ' ★'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <Label
                key={option}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleChange([...selectedValues, option]);
                    } else {
                      handleChange(selectedValues.filter((v) => v !== option));
                    }
                  }}
                />
                <span className="text-sm">{option}</span>
              </Label>
            ))}
          </div>
        );

      case 'number':
        return (
          <Input
            id={`${stageName}-${field.name}`}
            type="number"
            value={value as string | number ?? ''}
            onChange={(e) => handleChange(e.target.valueAsNumber || null)}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
          />
        );

      case 'prompt_selector':
        return (
          <PromptSelectorField
            stageName={stageName}
            value={value as string | null | undefined}
            onChange={handleChange}
          />
        );

      case 'text':
      default:
        return (
          <Input
            id={`${stageName}-${field.name}`}
            type="text"
            value={String(value ?? '')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label
          htmlFor={`${stageName}-${field.name}`}
          className="text-sm font-medium"
        >
          {field.name}
        </Label>
        <Badge variant="outline" className="text-xs">
          {field.type}
        </Badge>
        {field.required && (
          <span className="text-destructive text-xs">*</span>
        )}
      </div>
      {renderInput()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}

