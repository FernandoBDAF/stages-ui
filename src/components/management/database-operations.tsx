'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Copy, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDatabaseInspector, useCopyCollection, useOperationStatus, useCleanGraphRAG } from '@/hooks/use-management';
import { useManagementStore } from '@/lib/store/management-store';

export function DatabaseOperationsPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="copy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="copy">Copy</TabsTrigger>
            <TabsTrigger value="clean">Clean</TabsTrigger>
            <TabsTrigger value="inspect">Inspect</TabsTrigger>
          </TabsList>

          <TabsContent value="copy" className="mt-4">
            <CopyCollectionForm />
          </TabsContent>

          <TabsContent value="clean" className="mt-4">
            <CleanGraphRAGForm />
          </TabsContent>

          <TabsContent value="inspect" className="mt-4">
            <DatabaseInspector />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Copy Collection Form
// =============================================================================

function CopyCollectionForm() {
  const { data: databases } = useDatabaseInspector();
  const { mutate: copy, isPending, error } = useCopyCollection();
  const { lastSourceDb, lastTargetDb, setLastDbs } = useManagementStore();
  const [operationId, setOperationId] = useState<string | null>(null);
  const { data: operationStatus } = useOperationStatus(operationId);

  const [sourceDb, setSourceDb] = useState(lastSourceDb || '');
  const [targetDb, setTargetDb] = useState(lastTargetDb || '');
  const [collection, setCollection] = useState('raw_videos');
  const [maxDocs, setMaxDocs] = useState<string>('');
  const [clearTarget, setClearTarget] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setLastDbs(sourceDb, targetDb);

    copy(
      {
        source_db: sourceDb,
        target_db: targetDb,
        collection,
        max_documents: maxDocs ? parseInt(maxDocs) : null,
        clear_target: clearTarget,
      },
      {
        onSuccess: (data) => {
          if (data.operation_id && data.status === 'running') {
            setOperationId(data.operation_id);
          }
        },
      }
    );
  };

  const isComplete = operationStatus?.status === 'completed';
  const isFailed = operationStatus?.status === 'failed';
  const isRunning = operationStatus?.status === 'running' || isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source Database</Label>
          <Select value={sourceDb} onValueChange={setSourceDb}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {databases?.databases.map((db) => (
                <SelectItem key={db.name} value={db.name}>
                  {db.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Target Database</Label>
          <Input
            value={targetDb}
            onChange={(e) => setTargetDb(e.target.value)}
            placeholder="Enter target name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Collection</Label>
          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw_videos">raw_videos</SelectItem>
              <SelectItem value="video_chunks">video_chunks</SelectItem>
              <SelectItem value="cleaned_transcripts">cleaned_transcripts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Documents</Label>
          <Input
            type="number"
            value={maxDocs}
            onChange={(e) => setMaxDocs(e.target.value)}
            placeholder="Leave empty for all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="clearTarget"
          checked={clearTarget}
          onCheckedChange={(checked) => setClearTarget(checked as boolean)}
        />
        <Label htmlFor="clearTarget" className="text-sm cursor-pointer">
          Clear target collection before copy
        </Label>
      </div>

      {/* Progress Display */}
      {operationStatus && (
        <div className="space-y-2">
          <Progress value={operationStatus.progress.percent} />
          <p className="text-sm text-muted-foreground">
            {operationStatus.progress.processed} / {operationStatus.progress.total} documents
            {isComplete && ' - Complete!'}
            {isFailed && ` - Failed: ${operationStatus.error}`}
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!sourceDb || !targetDb || isRunning}
        className="w-full"
      >
        <Copy className="h-4 w-4 mr-2" />
        {isRunning ? 'Copying...' : 'Copy Collection'}
      </Button>
    </form>
  );
}

// =============================================================================
// Clean GraphRAG Form
// =============================================================================

function CleanGraphRAGForm() {
  const { data: databases } = useDatabaseInspector();
  const { mutate: clean, isPending, error, data: result, reset } = useCleanGraphRAG();

  const [dbName, setDbName] = useState('');
  const [collections, setCollections] = useState<string[]>([
    'entities', 'relations', 'communities', 'entity_mentions'
  ]);
  const [clearMetadata, setClearMetadata] = useState(true);
  const [confirmation, setConfirmation] = useState('');

  const toggleCollection = (name: string) => {
    setCollections((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : [...prev, name]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmation !== 'CONFIRM') {
      return;
    }

    clean({
      db_name: dbName,
      drop_collections: collections,
      clear_chunk_metadata: clearMetadata,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Database</Label>
        <Select value={dbName} onValueChange={(v) => { setDbName(v); reset(); setConfirmation(''); }}>
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
      </div>

      <div className="space-y-2">
        <Label>Collections to Drop</Label>
        <div className="grid grid-cols-2 gap-2">
          {['entities', 'relations', 'communities', 'entity_mentions', 'graphrag_runs'].map((coll) => (
            <div key={coll} className="flex items-center gap-2">
              <Checkbox
                id={coll}
                checked={collections.includes(coll)}
                onCheckedChange={() => toggleCollection(coll)}
              />
              <Label htmlFor={coll} className="text-sm cursor-pointer">
                {coll}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="clearMetadata"
          checked={clearMetadata}
          onCheckedChange={(checked) => setClearMetadata(checked as boolean)}
        />
        <Label htmlFor="clearMetadata" className="text-sm cursor-pointer">
          Clear chunk metadata (allows re-processing)
        </Label>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This operation is <strong>DESTRUCTIVE</strong>. Type &quot;CONFIRM&quot; below to proceed.
        </AlertDescription>
      </Alert>

      <Input
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder='Type "CONFIRM" to proceed'
      />

      {result?.success && (
        <Alert>
          <AlertDescription>
            Cleaned successfully! Dropped {result.dropped_collections.length} collections,
            updated {result.chunks_updated} chunks.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        variant="destructive"
        disabled={!dbName || confirmation !== 'CONFIRM' || isPending}
        className="w-full"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isPending ? 'Cleaning...' : 'Clean GraphRAG Data'}
      </Button>
    </form>
  );
}

// =============================================================================
// Database Inspector
// =============================================================================

function DatabaseInspector() {
  const { data, isLoading, error, refetch } = useDatabaseInspector();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading databases...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {data?.databases.length} databases found
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {data?.databases.map((db) => (
          <div key={db.name} className="border rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">{db.name}</h4>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {db.collections.map((coll) => (
                <div key={coll.name} className="flex justify-between">
                  <span>{coll.name}</span>
                  <span className="font-mono">{coll.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

