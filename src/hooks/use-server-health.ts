'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface HealthStatus {
  isConnected: boolean;
  lastChecked: Date | null;
  error: string | null;
  serverInfo: {
    version: string;
    activePipelines: number;
  } | null;
}

export function useServerHealth(checkInterval = 30000) {
  const [health, setHealth] = useState<HealthStatus>({
    isConnected: true, // Assume connected initially
    lastChecked: null,
    error: null,
    serverInfo: null,
  });

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      setHealth({
        isConnected: data.status === 'healthy',
        lastChecked: new Date(),
        error: null,
        serverInfo: {
          version: data.version || 'unknown',
          activePipelines: data.active_pipelines || 0,
        },
      });
    } catch (error) {
      setHealth((prev) => ({
        ...prev,
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Server unavailable',
        serverInfo: null,
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();
    
    // Periodic checks
    const interval = setInterval(checkHealth, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return {
    ...health,
    refresh: checkHealth,
  };
}

