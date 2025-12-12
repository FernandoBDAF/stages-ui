'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { WizardStep } from '@/types/source-selection';

interface Step {
  id: WizardStep;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'source_selection', label: 'Select Source', description: 'Filter videos to process' },
  { id: 'configuration', label: 'Configure', description: 'Set pipeline options' },
  { id: 'execution', label: 'Execute', description: 'Run and monitor' },
];

interface WizardStepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  completedSteps?: WizardStep[];
}

export function WizardStepIndicator({
  currentStep,
  onStepClick,
  completedSteps = [],
}: WizardStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id) || index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || index <= currentIndex + 1);

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 top-4 -translate-y-1/2 h-0.5 w-full -translate-x-1/2',
                    isCompleted || isCurrent
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                  style={{ width: 'calc(100% - 2rem)', left: 'calc(-50% + 1rem)' }}
                />
              )}

              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-disabled={!isClickable}
                role="tab"
                tabIndex={isClickable ? 0 : -1}
                className={cn(
                  'relative flex flex-col items-center group',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {/* Step circle */}
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-primary bg-background text-primary'
                      : 'border-muted bg-background text-muted-foreground',
                    isClickable && !isCurrent && 'group-hover:border-primary/50'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </span>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-sm font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>

                {/* Step description */}
                <span className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {step.description}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

