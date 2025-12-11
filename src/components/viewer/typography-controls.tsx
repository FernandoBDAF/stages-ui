'use client';

import { useState } from 'react';
import { Type, Sun, Moon, BookOpen, Columns, Rows } from 'lucide-react';
import type { FontSize, FontFamily, Theme, LineWidth, ViewMode } from '@/types/viewer';
import { cn } from '@/lib/utils';

interface TypographyControlsProps {
  fontSize: FontSize;
  fontFamily: FontFamily;
  theme: Theme;
  lineWidth: LineWidth;
  viewMode: ViewMode;
  onFontSizeChange: (size: FontSize) => void;
  onFontFamilyChange: (family: FontFamily) => void;
  onThemeChange: (theme: Theme) => void;
  onLineWidthChange: (width: LineWidth) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TypographyControls({
  fontSize,
  fontFamily,
  theme,
  lineWidth,
  viewMode,
  onFontSizeChange,
  onFontFamilyChange,
  onThemeChange,
  onLineWidthChange,
  onViewModeChange,
}: TypographyControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
  ];

  const fontFamilies: { value: FontFamily; label: string }[] = [
    { value: 'sans', label: 'Sans' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
  ];

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-3.5 h-3.5" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-3.5 h-3.5" />, label: 'Dark' },
    { value: 'sepia', icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Sepia' },
  ];

  const lineWidths: { value: LineWidth; label: string }[] = [
    { value: 'narrow', label: 'Narrow' },
    { value: 'normal', label: 'Normal' },
    { value: 'wide', label: 'Wide' },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-40">
      {/* Main toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700',
          'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
          'transition-all duration-200',
          isExpanded && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900'
        )}
        title="Typography settings"
      >
        <Type className="w-5 h-5" />
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          className={cn(
            'absolute bottom-14 left-0 p-4 rounded-xl',
            'bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700',
            'animate-in fade-in slide-in-from-bottom-2 duration-200',
            'min-w-[280px]'
          )}
        >
          {/* View Mode */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              View Mode
            </label>
            <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <button
                onClick={() => onViewModeChange('single')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'single'
                    ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                <Rows className="w-3.5 h-3.5" />
                Single
              </button>
              <button
                onClick={() => onViewModeChange('split')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  viewMode === 'split'
                    ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                <Columns className="w-3.5 h-3.5" />
                Split
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Font Size
            </label>
            <div className="flex gap-1">
              {fontSizes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onFontSizeChange(value)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                    fontSize === value
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Font
            </label>
            <div className="flex gap-1">
              {fontFamilies.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onFontFamilyChange(value)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                    fontFamily === value
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700',
                    value === 'serif' && 'font-serif',
                    value === 'mono' && 'font-mono'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Theme
            </label>
            <div className="flex gap-1">
              {themes.map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => onThemeChange(value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    theme === value
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Width */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              Line Width
            </label>
            <div className="flex gap-1">
              {lineWidths.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onLineWidthChange(value)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                    lineWidth === value
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

