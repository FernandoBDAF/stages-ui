/**
 * Source Selection Constants
 * 
 * Centralized configuration for the source selection module.
 */

export const SOURCE_SELECTION = {
  /** Cache times for React Query */
  CACHE_TIMES: {
    /** Channels don't change often - 5 minutes */
    CHANNELS_MS: 5 * 60 * 1000,
    /** Previews can cache briefly - 30 seconds */
    PREVIEW_MS: 30 * 1000,
  },
  
  /** Preview configuration */
  PREVIEW: {
    /** Number of sample videos to show */
    SAMPLE_LIMIT: 5,
    /** Debounce delay for filter changes (ms) */
    DEBOUNCE_MS: 300,
  },
  
  /** Slider bounds */
  SLIDERS: {
    VIEWS: {
      MAX: 100000,
      STEP: 1000,
    },
    ENGAGEMENT: {
      MAX: 20, // percentage
      STEP: 0.5,
    },
  },
  
  /** Default database fallback */
  DEFAULT_DB_NAME: 'mongo_hack',
} as const;

