'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Settings, 
  ChevronDown, 
  Database, 
  Zap, 
  RefreshCw,
  Info
} from 'lucide-react';
import { useConfigStore } from '@/lib/store/config-store';
import { cn } from '@/lib/utils/cn';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SYSTEM_DATABASE } from '@/lib/constants/databases';

export function GlobalConfigPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const globalConfig = useConfigStore((state) => state.globalConfig);
  const setGlobalConfig = useConfigStore((state) => state.setGlobalConfig);
  const applyGlobalToAll = useConfigStore((state) => state.applyGlobalToAll);

  const handleApplyToAll = () => {
    applyGlobalToAll();
  };

  const hasDbName = globalConfig.db_name && globalConfig.db_name.trim() !== '';

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Global Configuration</CardTitle>
                  <CardDescription className="text-xs">
                    Set common parameters for all stages
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasDbName && (
                  <Badge variant="secondary" className="font-mono">
                    DB: {globalConfig.db_name}
                  </Badge>
                )}
                {globalConfig.dry_run && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    Dry Run
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    'h-5 w-5 transition-transform text-muted-foreground',
                    isExpanded && 'rotate-180'
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Database Configuration */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Configuration
              </h4>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="global-db-name">Pipeline Database</Label>
                  <Input
                    id="global-db-name"
                    value={globalConfig.db_name || ''}
                    onChange={(e) => setGlobalConfig({ db_name: e.target.value || undefined })}
                    placeholder="e.g., mongo_hack"
                  />
                  <p className="text-xs text-muted-foreground">
                    All stages will read/write to this database (except constant collections)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Constant Collections Database</Label>
                  <Input
                    value={SYSTEM_DATABASE}
                    disabled
                    className="bg-muted font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    System collections (raw_videos, observability) use this database
                  </p>
                </div>
              </div>
            </div>

            {/* Processing Settings */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Processing Settings
              </h4>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Concurrency (parallel workers)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[globalConfig.concurrency || 15]}
                      onValueChange={([v]) => setGlobalConfig({ concurrency: v })}
                      min={1}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-12 text-right">
                      {globalConfig.concurrency || 15}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher values = faster processing (but more API usage)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Verbose Logging</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable detailed logs
                      </p>
                    </div>
                    <Switch
                      checked={globalConfig.verbose || false}
                      onCheckedChange={(checked) => setGlobalConfig({ verbose: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dry Run (no writes)</Label>
                      <p className="text-xs text-muted-foreground">
                        Simulate without saving
                      </p>
                    </div>
                    <Switch
                      checked={globalConfig.dry_run || false}
                      onCheckedChange={(checked) => setGlobalConfig({ dry_run: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                Global settings are applied when executing the pipeline. Stage-specific values can still override these defaults.
              </AlertDescription>
            </Alert>

            {/* Apply to All Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Explicitly copy these values to all stage configurations
              </p>
              <Button
                onClick={handleApplyToAll}
                variant="default"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Apply to All Stages
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

