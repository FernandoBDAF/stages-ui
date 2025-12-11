'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ViewerSettings, FontSize, FontFamily, Theme, LineWidth, ViewMode } from '@/types/viewer';
import { DEFAULT_VIEWER_SETTINGS } from '@/types/viewer';

const STORAGE_KEY = 'viewer-settings';

export function useViewerSettings() {
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ViewerSettings>;
        setSettings({ ...DEFAULT_VIEWER_SETTINGS, ...parsed });
      }
    } catch {
      // Use defaults on error
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const setFontSize = useCallback((fontSize: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize }));
  }, []);

  const setFontFamily = useCallback((fontFamily: FontFamily) => {
    setSettings((prev) => ({ ...prev, fontFamily }));
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setLineWidth = useCallback((lineWidth: LineWidth) => {
    setSettings((prev) => ({ ...prev, lineWidth }));
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setSettings((prev) => ({ ...prev, viewMode }));
  }, []);

  const toggleEntitySpotlight = useCallback(() => {
    setSettings((prev) => ({ ...prev, entitySpotlightEnabled: !prev.entitySpotlightEnabled }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_VIEWER_SETTINGS);
  }, []);

  return {
    settings,
    isLoaded,
    setFontSize,
    setFontFamily,
    setTheme,
    setLineWidth,
    setViewMode,
    toggleEntitySpotlight,
    resetSettings,
  };
}

