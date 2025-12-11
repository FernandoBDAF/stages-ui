'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  defaultExpanded?: number; // Number of levels to auto-expand
  maxDepth?: number;
  className?: string;
}

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  maxDepth: number;
  defaultExpanded: number;
}

// Type colors
const TYPE_COLORS = {
  string: 'text-green-600 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  null: 'text-gray-500',
  key: 'text-red-600 dark:text-red-400',
};

function JsonNode({ keyName, value, depth, maxDepth, defaultExpanded }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpanded);

  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);
  const canExpand = isObject && depth < maxDepth;

  // Render primitive value
  const renderValue = () => {
    if (value === null) {
      return <span className={TYPE_COLORS.null}>null</span>;
    }
    if (typeof value === 'string') {
      // Truncate long strings
      const displayValue = value.length > 100 
        ? `"${value.slice(0, 100)}..."` 
        : `"${value}"`;
      return <span className={TYPE_COLORS.string}>{displayValue}</span>;
    }
    if (typeof value === 'number') {
      return <span className={TYPE_COLORS.number}>{value}</span>;
    }
    if (typeof value === 'boolean') {
      return <span className={TYPE_COLORS.boolean}>{value.toString()}</span>;
    }
    return <span>{String(value)}</span>;
  };

  // Count children
  const childCount = isObject 
    ? (isArray ? (value as unknown[]).length : Object.keys(value as object).length)
    : 0;

  // Preview for collapsed objects
  const preview = useMemo(() => {
    if (!isObject || isExpanded) return null;
    
    if (isArray) {
      return `Array(${childCount})`;
    }
    
    const keys = Object.keys(value as object).slice(0, 3);
    return `{${keys.join(', ')}${childCount > 3 ? ', ...' : ''}}`;
  }, [isObject, isArray, isExpanded, childCount, value]);

  return (
    <div className="font-mono text-sm">
      <div 
        className={cn(
          'flex items-start gap-1',
          canExpand && 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded'
        )}
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse toggle */}
        {canExpand && (
          <span className="w-4 h-4 flex items-center justify-center text-neutral-400">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!canExpand && <span className="w-4" />}

        {/* Key name */}
        {keyName !== undefined && (
          <>
            <span className={TYPE_COLORS.key}>&quot;{keyName}&quot;</span>
            <span className="text-neutral-500">: </span>
          </>
        )}

        {/* Value or preview */}
        {!isObject ? (
          renderValue()
        ) : !isExpanded ? (
          <span className="text-neutral-500">{preview}</span>
        ) : (
          <span className="text-neutral-500">{isArray ? '[' : '{'}</span>
        )}
      </div>

      {/* Children */}
      {isObject && isExpanded && (
        <div className="ml-4 border-l border-neutral-200 dark:border-neutral-700 pl-2">
          {isArray
            ? (value as unknown[]).map((item, index) => (
                <JsonNode
                  key={index}
                  keyName={String(index)}
                  value={item}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  defaultExpanded={defaultExpanded}
                />
              ))
            : Object.entries(value as object).map(([key, val]) => (
                <JsonNode
                  key={key}
                  keyName={key}
                  value={val}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  defaultExpanded={defaultExpanded}
                />
              ))}
          <span className="text-neutral-500">{isArray ? ']' : '}'}</span>
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ 
  data, 
  defaultExpanded = 2, // Default to 2 levels expanded
  maxDepth = 10,
  className 
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        title="Copy JSON"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4 text-neutral-500" />
        )}
      </button>

      {/* JSON tree */}
      <div className="p-4 overflow-x-auto">
        <JsonNode
          value={data}
          depth={0}
          maxDepth={maxDepth}
          defaultExpanded={defaultExpanded}
        />
      </div>
    </div>
  );
}
