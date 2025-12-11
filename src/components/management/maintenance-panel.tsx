'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Wrench, ChevronDown, RefreshCw, Eraser } from 'lucide-react';
import { useDatabaseInspector, useCleanStageStatus, useRebuildIndexes } from '@/hooks/use-management';
import { cn } from '@/lib/utils';

export function MaintenancePanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance
            </CardTitle>
            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <CleanStageStatusForm />
            <hr />
            <RebuildIndexesForm />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================================================
// Clean Stage Status Form
// =============================================================================

function CleanStageStatusForm() {
  const { data: databases } = useDatabaseInspector();
  const { mutate: clean, isPending, error, data: result, reset } = useCleanStageStatus();

  const [dbName, setDbName] = useState('');
  const [stages, setStages] = useState<string[]>(['extraction']);

  const toggleStage = (stage: string) => {
    setStages((prev) =>
      prev.includes(stage)
        ? prev.filter((s) => s !== stage)
        : [...prev, stage]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clean({ db_name: dbName, stages });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <Eraser className="h-4 w-4" />
        <span className="text-sm font-medium">Clean Stage Status</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Remove processing status from chunks to allow re-running specific stages.
      </p>

      <Select value={dbName} onValueChange={(v) => { setDbName(v); reset(); }}>
        <SelectTrigger>
          <SelectValue placeholder="Select database" />
        </SelectTrigger>
        <SelectContent>
          {databases?.databases.map((db) => (
            <SelectItem key={db.name} value={db.name}>
              {db.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-3">
        {['extraction', 'resolution', 'construction', 'community'].map((stage) => (
          <div key={stage} className="flex items-center gap-2">
            <Checkbox
              id={`stage-${stage}`}
              checked={stages.includes(stage)}
              onCheckedChange={() => toggleStage(stage)}
            />
            <Label htmlFor={`stage-${stage}`} className="text-xs capitalize cursor-pointer">
              {stage}
            </Label>
          </div>
        ))}
      </div>

      {result?.success && (
        <Alert>
          <AlertDescription className="text-xs">
            Cleaned {result.stages_cleaned.join(', ')} status from {result.chunks_modified} chunks.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error.message}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={!dbName || stages.length === 0 || isPending}
        className="w-full"
      >
        {isPending ? 'Cleaning...' : 'Clean Stage Status'}
      </Button>
    </form>
  );
}

// =============================================================================
// Rebuild Indexes Form
// =============================================================================

function RebuildIndexesForm() {
  const { data: databases } = useDatabaseInspector();
  const { mutate: rebuild, isPending, error, data: result, reset } = useRebuildIndexes();

  const [dbName, setDbName] = useState('');
  const [collections, setCollections] = useState<string[]>(['entities', 'relations']);

  const toggleCollection = (coll: string) => {
    setCollections((prev) =>
      prev.includes(coll)
        ? prev.filter((c) => c !== coll)
        : [...prev, coll]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rebuild({ db_name: dbName, collections });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        <span className="text-sm font-medium">Rebuild Indexes</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Rebuild database indexes for improved query performance.
      </p>

      <Select value={dbName} onValueChange={(v) => { setDbName(v); reset(); }}>
        <SelectTrigger>
          <SelectValue placeholder="Select database" />
        </SelectTrigger>
        <SelectContent>
          {databases?.databases.map((db) => (
            <SelectItem key={db.name} value={db.name}>
              {db.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-3">
        {['entities', 'relations', 'communities', 'video_chunks'].map((coll) => (
          <div key={coll} className="flex items-center gap-2">
            <Checkbox
              id={`coll-${coll}`}
              checked={collections.includes(coll)}
              onCheckedChange={() => toggleCollection(coll)}
            />
            <Label htmlFor={`coll-${coll}`} className="text-xs cursor-pointer">
              {coll}
            </Label>
          </div>
        ))}
      </div>

      {result?.success && (
        <Alert>
          <AlertDescription className="text-xs">
            Rebuilt indexes for {result.collections_indexed.length} collections.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error.message}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={!dbName || collections.length === 0 || isPending}
        className="w-full"
      >
        {isPending ? 'Rebuilding...' : 'Rebuild Indexes'}
      </Button>
    </form>
  );
}

