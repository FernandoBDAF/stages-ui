'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, RefreshCw, Download } from 'lucide-react';
import { useDatabaseInspector, useGraphStatistics } from '@/hooks/use-management';

export function AnalyticsPanel() {
  const { data: databases } = useDatabaseInspector();
  const [selectedDb, setSelectedDb] = useState('');

  const { data: stats, isLoading, refetch } = useGraphStatistics(selectedDb || null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={!selectedDb}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedDb} onValueChange={setSelectedDb}>
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

        {isLoading && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Loading statistics...
          </div>
        )}

        {stats && (
          <div className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Entities" value={stats.entities?.total || 0} />
              <StatCard label="Relationships" value={stats.relationships?.total || 0} />
              <StatCard label="Communities" value={stats.communities?.total || 0} />
              <StatCard label="Avg Degree" value={(stats.graph?.avg_degree || 0).toFixed(1)} />
            </div>

            {/* Graph Metrics */}
            {stats.graph && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="text-xs font-medium">Graph Metrics</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Density</span>
                    <span className="font-mono">{(stats.graph.density || 0).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Degree</span>
                    <span className="font-mono">{stats.graph.max_degree || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Isolated</span>
                    <span className="font-mono">{stats.graph.isolated_nodes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Components</span>
                    <span className="font-mono">{stats.graph.connected_components || 1}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <Button variant="outline" size="sm" className="w-full" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export Full Report (Coming Soon)
            </Button>
          </div>
        )}

        {!selectedDb && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Select a database to view analytics
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

