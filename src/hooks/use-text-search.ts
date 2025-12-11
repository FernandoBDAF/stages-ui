'use client';

import { useState, useCallback, useMemo } from 'react';
import type { SearchMatch } from '@/types/viewer';

interface UseTextSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  totalMatches: number;
  nextMatch: () => void;
  prevMatch: () => void;
  goToMatch: (index: number) => void;
  clearSearch: () => void;
  isRegex: boolean;
  toggleRegex: () => void;
}

export function useTextSearch(text: string): UseTextSearchReturn {
  const [query, setQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isRegex, setIsRegex] = useState(false);

  const matches = useMemo(() => {
    if (!query || !text) return [];

    const results: SearchMatch[] = [];
    
    try {
      const searchRegex = isRegex
        ? new RegExp(query, 'gi')
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

      let match;
      let index = 0;
      while ((match = searchRegex.exec(text)) !== null) {
        results.push({
          index,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
        index++;
        // Prevent infinite loops with zero-length matches
        if (match[0].length === 0) {
          searchRegex.lastIndex++;
        }
      }
    } catch {
      // Invalid regex, return empty results
    }

    return results;
  }, [text, query, isRegex]);

  const totalMatches = matches.length;

  const nextMatch = useCallback(() => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  }, [totalMatches]);

  const prevMatch = useCallback(() => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  }, [totalMatches]);

  const goToMatch = useCallback((index: number) => {
    if (index >= 0 && index < totalMatches) {
      setCurrentMatchIndex(index);
    }
  }, [totalMatches]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setCurrentMatchIndex(0);
  }, []);

  const toggleRegex = useCallback(() => {
    setIsRegex((prev) => !prev);
  }, []);

  // Reset current match when query changes
  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setCurrentMatchIndex(0);
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    matches,
    currentMatchIndex,
    totalMatches,
    nextMatch,
    prevMatch,
    goToMatch,
    clearSearch,
    isRegex,
    toggleRegex,
  };
}

