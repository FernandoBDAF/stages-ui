'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, ExternalLink, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useObservabilityHealth } from '@/hooks/use-management';
import type { ServiceStatus } from '@/types/management';

export function ObservabilityPanel() {
  const { data: health, isLoading, refetch } = useObservabilityHealth();

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    const variants: Record<ServiceStatus, 'default' | 'secondary' | 'destructive'> = {
      healthy: 'default',
      down: 'destructive',
      degraded: 'secondary',
      unknown: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Observability
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Overall Status</span>
          {health && getStatusBadge(health.overall)}
        </div>

        {/* Service List */}
        <div className="space-y-2">
          {health?.services && Object.entries(health.services).map(([name, service]) => (
            <div key={name} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="text-sm capitalize">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {service.url?.replace('http://', '')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('http://localhost:3000', '_blank')}
          >
            Grafana
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('http://localhost:9090', '_blank')}
          >
            Prometheus
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('http://localhost:3100', '_blank')}
          >
            Loki
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground text-center">
            Checking health...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

