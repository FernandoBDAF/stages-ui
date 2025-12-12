'use client';

import { useEffect, useCallback } from 'react';

type ModifierKey = 'ctrl' | 'meta' | 'shift' | 'alt';

export interface ShortcutConfig {
  key: string;
  modifiers?: ModifierKey[];
  action: () => void;
  description: string;
  context?: 'global' | 'document' | 'collection' | 'timeline' | 'compare';
  /**
   * If true, the shortcut will not trigger when focus is in an input/textarea
   */
  ignoreInputs?: boolean;
}

/**
 * Check if focus is currently in an input or textarea element
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    (activeElement as HTMLElement).isContentEditable
  );
}

/**
 * Check if all required modifiers are pressed and no extra modifiers
 */
function checkModifiers(e: KeyboardEvent, modifiers?: ModifierKey[]): boolean {
  const required = new Set(modifiers || []);
  
  const hasCtrl = e.ctrlKey;
  const hasMeta = e.metaKey;
  const hasShift = e.shiftKey;
  const hasAlt = e.altKey;
  
  // Check required modifiers
  if (required.has('ctrl') !== hasCtrl) return false;
  if (required.has('meta') !== hasMeta) return false;
  if (required.has('shift') !== hasShift) return false;
  if (required.has('alt') !== hasAlt) return false;
  
  return true;
}

/**
 * Hook for registering keyboard shortcuts
 * 
 * @param shortcuts - Array of shortcut configurations
 * @param currentContext - Current view context for filtering shortcuts
 * @param enabled - Whether shortcuts should be active
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     modifiers: ['meta'],
 *     action: () => openBrowser(),
 *     description: 'Open database browser',
 *     context: 'global'
 *   }
 * ], 'document');
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  currentContext: 'global' | 'document' | 'collection' | 'timeline' | 'compare' = 'global',
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Find matching shortcut
    for (const shortcut of shortcuts) {
      // Check context - global shortcuts always work, others only in their context
      if (shortcut.context && shortcut.context !== 'global' && shortcut.context !== currentContext) {
        continue;
      }
      
      // Check if we should ignore when in inputs
      if (shortcut.ignoreInputs !== false && isInputFocused()) {
        continue;
      }
      
      // Check key match (case insensitive)
      if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) {
        continue;
      }
      
      // Check modifiers
      if (!checkModifiers(e, shortcut.modifiers)) {
        continue;
      }
      
      // Match found - execute action
      e.preventDefault();
      e.stopPropagation();
      shortcut.action();
      return;
    }
  }, [shortcuts, currentContext, enabled]);
  
  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Utility to format shortcut for display
 * 
 * @example
 * formatShortcut({ key: 'k', modifiers: ['meta'] }) // '⌘K'
 */
export function formatShortcut(shortcut: Pick<ShortcutConfig, 'key' | 'modifiers'>): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers?.includes('ctrl')) {
    parts.push('⌃');
  }
  if (shortcut.modifiers?.includes('meta')) {
    parts.push('⌘');
  }
  if (shortcut.modifiers?.includes('alt')) {
    parts.push('⌥');
  }
  if (shortcut.modifiers?.includes('shift')) {
    parts.push('⇧');
  }
  
  // Format key
  let keyDisplay = shortcut.key.toUpperCase();
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
  if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
  if (shortcut.key === 'ArrowLeft') keyDisplay = '←';
  if (shortcut.key === 'ArrowRight') keyDisplay = '→';
  if (shortcut.key === 'Enter') keyDisplay = '↵';
  
  parts.push(keyDisplay);
  
  return parts.join('');
}

/**
 * Returns available shortcuts for the current context
 */
export function getContextShortcuts(
  shortcuts: ShortcutConfig[],
  context: 'global' | 'document' | 'collection' | 'timeline' | 'compare'
): ShortcutConfig[] {
  return shortcuts.filter(s => 
    !s.context || s.context === 'global' || s.context === context
  );
}

