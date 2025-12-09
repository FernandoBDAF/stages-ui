'use client';

import { useServerHealth } from '@/hooks/use-server-health';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConnectionBanner() {
  const { isConnected, error, refresh, lastChecked } = useServerHealth();

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span>
          <strong>Backend Unavailable:</strong> {error || 'Cannot connect to server'}
          {lastChecked && (
            <span className="text-xs ml-2 opacity-70">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </span>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

