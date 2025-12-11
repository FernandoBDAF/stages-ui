'use client';

import { useMemo } from 'react';
import type { DetectedEntity, EntityType } from '@/types/viewer';

// Pattern definitions for entity detection
const ENTITY_PATTERNS: { type: EntityType; pattern: RegExp }[] = [
  // Names: Capitalized words (2+ consecutive) - handles "John Smith", "Dr. Williams"
  {
    type: 'person',
    pattern: /\b(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Professor)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
  },
  // Dates: Various formats
  {
    type: 'date',
    pattern: /\b(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi,
  },
  // Places: Common cities and locations
  {
    type: 'place',
    pattern: /\b(?:New York|Los Angeles|San Francisco|San Mateo|London|Paris|Berlin|Tokyo|Beijing|Stanford|MIT|Berkeley|Harvard|Google|Microsoft|Amazon|IBM|OpenAI|Neo4j|Facebook|LinkedIn|Massachusetts General Hospital|European Union)\b/gi,
  },
  // Concepts: Quoted text or technical terms
  {
    type: 'concept',
    pattern: /"[^"]{3,50}"|'[^']{3,50}'|\*\*[^*]+\*\*/g,
  },
];

// Additional well-known names to detect
const KNOWN_NAMES = [
  'John Smith', 'Mary Johnson', 'Sarah Chen', 'Michael Torres', 'Lisa Park',
  'David Kim', 'Leonhard Euler', 'Edgar Codd',
];

export function useEntityDetection(text: string, enabled: boolean = true) {
  const entities = useMemo(() => {
    if (!enabled || !text) return [];

    const detected: DetectedEntity[] = [];
    const seenRanges = new Set<string>();

    // Helper to check if range overlaps with existing
    const isOverlapping = (start: number, end: number): boolean => {
      for (const range of seenRanges) {
        const [s, e] = range.split('-').map(Number);
        if (!(end <= s || start >= e)) return true;
      }
      return false;
    };

    // Helper to add entity if not overlapping
    const addEntity = (type: EntityType, matchText: string, startIndex: number) => {
      const endIndex = startIndex + matchText.length;
      const rangeKey = `${startIndex}-${endIndex}`;
      
      if (!isOverlapping(startIndex, endIndex)) {
        seenRanges.add(rangeKey);
        detected.push({
          type,
          text: matchText,
          startIndex,
          endIndex,
        });
      }
    };

    // Check for known names first (higher priority)
    for (const name of KNOWN_NAMES) {
      const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
      let match;
      while ((match = nameRegex.exec(text)) !== null) {
        addEntity('person', match[0], match.index);
      }
    }

    // Run pattern matching
    for (const { type, pattern } of ENTITY_PATTERNS) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const matchText = match[0].trim();
        
        // Skip very short matches or common words
        if (matchText.length < 3) continue;
        
        // For person type, skip if it's just one word (likely a sentence start)
        if (type === 'person' && !matchText.includes(' ')) continue;
        
        addEntity(type, matchText, match.index);
        
        // Prevent infinite loops
        if (match[0].length === 0) {
          pattern.lastIndex++;
        }
      }
    }

    // Sort by start index
    return detected.sort((a, b) => a.startIndex - b.startIndex);
  }, [text, enabled]);

  const entityCounts = useMemo(() => {
    const counts: Record<EntityType, number> = {
      person: 0,
      place: 0,
      concept: 0,
      date: 0,
    };
    
    for (const entity of entities) {
      counts[entity.type]++;
    }
    
    return counts;
  }, [entities]);

  return { entities, entityCounts };
}

