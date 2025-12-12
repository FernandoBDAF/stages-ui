'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, X } from 'lucide-react';
import { 
  subMonths, 
  subYears, 
  startOfYear, 
  format, 
  differenceInDays,
  isAfter,
  isBefore,
  startOfDay 
} from 'date-fns';

interface DateRange {
  start?: string;
  end?: string;
}

interface DateRangePresetsProps {
  currentRange?: DateRange;
  onRangeChange: (range: DateRange | undefined) => void;
}

type PresetKey = 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'this_year' | 'custom';

interface Preset {
  key: PresetKey;
  label: string;
  getValue: () => { start: Date; end: Date } | null;
}

const DATE_PRESETS: Preset[] = [
  {
    key: 'last_month',
    label: 'Last Month',
    getValue: () => ({
      start: startOfDay(subMonths(new Date(), 1)),
      end: startOfDay(new Date()),
    }),
  },
  {
    key: 'last_3_months',
    label: 'Last 3 Months',
    getValue: () => ({
      start: startOfDay(subMonths(new Date(), 3)),
      end: startOfDay(new Date()),
    }),
  },
  {
    key: 'last_6_months',
    label: 'Last 6 Months',
    getValue: () => ({
      start: startOfDay(subMonths(new Date(), 6)),
      end: startOfDay(new Date()),
    }),
  },
  {
    key: 'last_year',
    label: 'Last Year',
    getValue: () => ({
      start: startOfDay(subYears(new Date(), 1)),
      end: startOfDay(new Date()),
    }),
  },
  {
    key: 'this_year',
    label: 'This Year',
    getValue: () => ({
      start: startOfDay(startOfYear(new Date())),
      end: startOfDay(new Date()),
    }),
  },
  {
    key: 'custom',
    label: 'Custom',
    getValue: () => null,
  },
];

export function DateRangePresets({ currentRange, onRangeChange }: DateRangePresetsProps) {
  const [showCustom, setShowCustom] = useState(false);

  // Determine which preset is active
  const activePreset = useMemo((): PresetKey | null => {
    if (!currentRange?.start || !currentRange?.end) return null;

    const currentStart = new Date(currentRange.start);
    const currentEnd = new Date(currentRange.end);

    for (const preset of DATE_PRESETS) {
      if (preset.key === 'custom') continue;
      const value = preset.getValue();
      if (!value) continue;

      // Allow 1 day tolerance for matching
      const startDiff = Math.abs(differenceInDays(currentStart, value.start));
      const endDiff = Math.abs(differenceInDays(currentEnd, value.end));

      if (startDiff <= 1 && endDiff <= 1) {
        return preset.key;
      }
    }

    // If has range but doesn't match presets, it's custom
    return 'custom';
  }, [currentRange]);

  const handlePresetClick = (preset: Preset) => {
    if (preset.key === 'custom') {
      setShowCustom(true);
      return;
    }

    const range = preset.getValue();
    if (range) {
      setShowCustom(false);
      onRangeChange({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    if (!value) {
      const newRange = { ...currentRange };
      delete newRange[field];
      onRangeChange(Object.keys(newRange).length > 0 ? newRange : undefined);
      return;
    }

    const date = new Date(value);
    onRangeChange({
      ...currentRange,
      [field]: date.toISOString(),
    });
  };

  const clearDateRange = () => {
    setShowCustom(false);
    onRangeChange(undefined);
  };

  const formatDateDisplay = (isoString: string) => {
    try {
      return format(new Date(isoString), 'MMM dd, yyyy');
    } catch {
      return isoString;
    }
  };

  const getDateInputValue = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return format(new Date(isoString), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  // Validation
  const hasValidRange = currentRange?.start && currentRange?.end;
  const isInvalidRange = hasValidRange && 
    isAfter(new Date(currentRange.start!), new Date(currentRange.end!));
  const rangeDays = hasValidRange
    ? differenceInDays(new Date(currentRange.end!), new Date(currentRange.start!))
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Date Range</Label>
        {currentRange?.start && (
          <button
            onClick={clearDateRange}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Filter videos by publication date
      </p>

      {/* Preset buttons */}
      <div className="grid grid-cols-2 gap-2">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className="justify-start"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date inputs */}
      {(showCustom || activePreset === 'custom') && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={getDateInputValue(currentRange?.start)}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              max={getDateInputValue(currentRange?.end) || format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={getDateInputValue(currentRange?.end)}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={getDateInputValue(currentRange?.start)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        </div>
      )}

      {/* Visual indicator */}
      {hasValidRange && !isInvalidRange && (
        <Alert className="py-2">
          <Calendar className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Filtering videos published between{' '}
            <strong>{formatDateDisplay(currentRange.start!)}</strong> and{' '}
            <strong>{formatDateDisplay(currentRange.end!)}</strong>
            <span className="text-muted-foreground ml-2">
              ({rangeDays} days)
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation error */}
      {isInvalidRange && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">
            Start date cannot be after end date
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

