'use client';

import { useEffect, useState } from 'react';

export function Footer() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stages`, {
          method: 'HEAD',
        });
        setApiStatus(response.ok ? 'connected' : 'disconnected');
      } catch {
        setApiStatus('disconnected');
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    checking: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
  };

  const statusText = {
    checking: 'Checking...',
    connected: 'Connected',
    disconnected: 'Disconnected',
  };

  return (
    <footer className="border-t bg-background">
      <div className="container flex h-12 items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>API Status:</span>
          <span className={`inline-block h-2 w-2 rounded-full ${statusColors[apiStatus]}`} />
          <span>{statusText[apiStatus]}</span>
        </div>
        <div>
          <span>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}

