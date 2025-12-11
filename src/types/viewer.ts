// Types for the Text Viewer module

export type CollectionType = 'raw_videos' | 'cleaned_transcripts';

export interface DocumentMeta {
  id: string;
  collection: CollectionType;
  title: string;
  created_at: string;
  word_count: number;
  char_count: number;
  source?: string;
}

export interface DocumentContent {
  id: string;
  collection: CollectionType;
  title: string;
  content: string;
  metadata: {
    source?: string;
    created_at: string;
    word_count: number;
    char_count: number;
  };
}

export interface DocumentPair {
  raw: DocumentContent | null;
  cleaned: DocumentContent | null;
}

export type EntityType = 'person' | 'place' | 'concept' | 'date';

export interface DetectedEntity {
  type: EntityType;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface SearchMatch {
  index: number;
  startIndex: number;
  endIndex: number;
}

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type Theme = 'light' | 'dark' | 'sepia';
export type LineWidth = 'narrow' | 'normal' | 'wide';
export type ViewMode = 'single' | 'split';

export interface ViewerSettings {
  fontSize: FontSize;
  fontFamily: FontFamily;
  theme: Theme;
  lineWidth: LineWidth;
  viewMode: ViewMode;
  entitySpotlightEnabled: boolean;
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  fontSize: 'md',
  fontFamily: 'sans',
  theme: 'light',
  lineWidth: 'normal',
  viewMode: 'single',
  entitySpotlightEnabled: false,
};

