'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ReadingProgress {
  percentage: number;
  currentParagraph: number;
  totalParagraphs: number;
  estimatedReadingTime: number; // in minutes
  wordsRead: number;
  totalWords: number;
}

// Average reading speed (words per minute)
const WORDS_PER_MINUTE = 200;

export function useReadingProgress(
  containerRef: React.RefObject<HTMLElement | null>,
  wordCount: number = 0
) {
  const [progress, setProgress] = useState<ReadingProgress>({
    percentage: 0,
    currentParagraph: 0,
    totalParagraphs: 0,
    estimatedReadingTime: 0,
    wordsRead: 0,
    totalWords: wordCount,
  });

  const paragraphsRef = useRef<HTMLElement[]>([]);

  // Calculate estimated reading time
  const estimatedReadingTime = Math.ceil(wordCount / WORDS_PER_MINUTE);

  // Update paragraphs list
  useEffect(() => {
    if (containerRef.current) {
      paragraphsRef.current = Array.from(
        containerRef.current.querySelectorAll('p, .paragraph')
      );
    }
  }, [containerRef]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    
    // Calculate percentage
    const percentage = scrollHeight > 0 
      ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100))
      : 0;

    // Find current paragraph
    const paragraphs = paragraphsRef.current;
    let currentParagraph = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const rect = paragraphs[i].getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // If paragraph is visible in viewport
      if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
        currentParagraph = i + 1;
        break;
      }
    }

    // Estimate words read based on scroll position
    const wordsRead = Math.round((percentage / 100) * wordCount);

    setProgress({
      percentage,
      currentParagraph,
      totalParagraphs: paragraphs.length,
      estimatedReadingTime,
      wordsRead,
      totalWords: wordCount,
    });
  }, [containerRef, wordCount, estimatedReadingTime]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initial calculation
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, handleScroll]);

  // Reset on word count change
  useEffect(() => {
    setProgress((prev) => ({
      ...prev,
      totalWords: wordCount,
      estimatedReadingTime,
    }));
    handleScroll();
  }, [wordCount, estimatedReadingTime, handleScroll]);

  return progress;
}

