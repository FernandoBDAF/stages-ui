# Text Viewer Module - Implementation Plan

**Version:** 1.0  
**Created:** December 9, 2025  
**Status:** ✅ Implemented  
**Route:** `/viewer`

---

## 1. Overview

### 1.1 Purpose

Create an independent, minimalist text viewing module for consuming long-form texts from MongoDB collections. These texts (transcripts, cleaned texts) are the source data used to build entities, relations, and ultimately the knowledge graph.

### 1.2 Target Data

| Collection | Field | Content Type |
|------------|-------|--------------|
| `raw_videos` | `transcript_raw` | Raw transcription text |
| `cleaned_transcripts` | `cleaned_text` | Processed/cleaned text |

### 1.3 Design Philosophy

- **Minimalist**: Clean reading interface, no visual clutter
- **Focused**: Reader-first experience, tools appear on demand
- **Powerful**: Hidden depth - simple surface, powerful features underneath
- **Contextual**: Features relevant to knowledge graph source material

---

## 2. Core Features (MVP)

### 2.1 Feature Summary

| Feature | Priority | Description |
|---------|----------|-------------|
| **Source Selector** | P0 | Select collection and document |
| **Text Display** | P0 | Clean, readable text rendering |
| **Side-by-Side View** | P0 | Compare raw vs cleaned text |
| **Search & Highlight** | P0 | Find text with keyboard shortcut |
| **Reading Progress** | P1 | Visual progress indicator |
| **Typography Controls** | P1 | Font size, line height |
| **Entity Spotlight** | P1 | Highlight potential entities |
| **Copy & Export** | P2 | Copy text, download as file |

> **Note:** Using mock data initially. Backend endpoints exist and will be integrated later.

### 2.2 Feature Details

#### 2.2.1 Source Selector (Command Palette Style)

A floating command palette (⌘K / Ctrl+K) to select:
1. Collection (raw_videos / cleaned_transcripts)
2. Document (searchable list by title/id)

```
┌─────────────────────────────────────────────┐
│ 🔍 Search documents...                 ⌘K   │
├─────────────────────────────────────────────┤
│  📄 raw_videos                              │
│     └─ Interview_John_2024-01-15            │
│     └─ Podcast_Episode_42                   │
│     └─ Meeting_Transcript_Q4                │
│  📄 cleaned_transcripts                     │
│     └─ Interview_John_2024-01-15_cleaned    │
│     └─ Podcast_Episode_42_cleaned           │
└─────────────────────────────────────────────┘
```

#### 2.2.2 Text Display

Clean reading area with:
- Optimal line width (65-75 characters)
- Comfortable line height (1.6-1.8)
- Subtle paragraph spacing
- Monospace option for technical review

#### 2.2.3 Search & Highlight (⌘F / Ctrl+F)

- Inline search bar (appears at top)
- Highlight all matches
- Navigate between matches (↑/↓)
- Match count display
- Regex support (toggle)

```
┌─────────────────────────────────────────────┐
│ Find: [entity        ] 12 of 47  ↑ ↓  ✕    │
└─────────────────────────────────────────────┘
```

#### 2.2.4 Entity Spotlight ⭐ (Key Differentiator)

Toggle to highlight potential entities in the text:
- **People** (names) → Blue highlight
- **Places** (locations) → Green highlight
- **Concepts** (key terms) → Purple highlight
- **Dates/Times** → Orange highlight

Uses simple pattern matching + common entity patterns.
Click highlighted entity → Show context menu (copy, search, frequency)

#### 2.2.5 Reading Progress

- Thin progress bar at top of viewport
- Percentage indicator
- Estimated reading time
- Current position (e.g., "Paragraph 12 of 45")

#### 2.2.6 Typography Controls

Floating toolbar (appears on hover at corner):
- Font size: S / M / L / XL
- Font: Sans / Serif / Mono
- Width: Narrow / Normal / Wide
- Theme: Light / Dark / Sepia

---

## 3. User Interface Design

### 3.1 Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 35%        │ Progress Bar
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                     ┌─────────────────────────┐                  │
│                     │                         │                  │
│                     │  Interview Transcript   │  ← Document Title│
│                     │  John Smith - Jan 2024  │  ← Metadata      │
│                     │                         │                  │
│                     │  ─────────────────────  │                  │
│                     │                         │                  │
│                     │  Lorem ipsum dolor sit  │                  │
│                     │  amet, consectetur      │                  │
│                     │  adipiscing elit. The   │                  │
│                     │  [John] mentioned that  │  ← Entity        │
│                     │  [New York] was...      │  ← Entity        │
│                     │                         │                  │
│                     │  Sed do eiusmod tempor  │                  │
│                     │  incididunt ut labore   │                  │
│                     │  et dolore magna...     │                  │
│                     │                         │                  │
│                     └─────────────────────────┘                  │
│                                                                   │
│  ┌────┐                                              ┌────────┐  │
│  │ Aa │  Typography                                  │ ⌘K     │  │
│  └────┘  Controls                                    └────────┘  │
│          (hover)                                     Source      │
│                                                      Selector    │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Color Scheme

**Light Theme:**
```css
--bg-primary: #FAFAFA;
--bg-paper: #FFFFFF;
--text-primary: #1A1A1A;
--text-secondary: #6B7280;
--accent: #3B82F6;
```

**Dark Theme:**
```css
--bg-primary: #0A0A0A;
--bg-paper: #141414;
--text-primary: #FAFAFA;
--text-secondary: #9CA3AF;
--accent: #60A5FA;
```

**Sepia Theme (Reading Mode):**
```css
--bg-primary: #F4ECD8;
--bg-paper: #FBF7EE;
--text-primary: #433422;
--text-secondary: #7D6E5B;
--accent: #B8860B;
```

### 3.3 Entity Highlight Colors

| Entity Type | Light Theme | Dark Theme |
|-------------|-------------|------------|
| Person | `#DBEAFE` (blue-100) | `#1E3A5F` |
| Place | `#D1FAE5` (green-100) | `#1E3F2E` |
| Concept | `#EDE9FE` (purple-100) | `#2E1F5E` |
| Date/Time | `#FEF3C7` (amber-100) | `#3F2E1E` |

---

## 4. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open source selector |
| `⌘F` / `Ctrl+F` | Open search |
| `Escape` | Close overlay / Clear search |
| `⌘+` / `Ctrl++` | Increase font size |
| `⌘-` / `Ctrl+-` | Decrease font size |
| `⌘E` / `Ctrl+E` | Toggle entity spotlight |
| `⌘D` / `Ctrl+D` | Toggle dark mode |
| `⌘↓` / `Ctrl+↓` | Next search match |
| `⌘↑` / `Ctrl+↑` | Previous search match |

---

## 5. Technical Architecture

### 5.1 Route Structure

```
src/app/
├── viewer/
│   ├── page.tsx              # Main viewer page
│   ├── layout.tsx            # Viewer-specific layout (minimal)
│   └── loading.tsx           # Loading skeleton
```

### 5.2 Component Structure

```
src/components/viewer/
├── source-selector.tsx       # Command palette for document selection
├── text-display.tsx          # Main text rendering area
├── search-bar.tsx            # Search overlay
├── progress-bar.tsx          # Reading progress indicator
├── typography-controls.tsx   # Font/theme settings
├── entity-highlighter.tsx    # Entity detection & highlighting
└── viewer-toolbar.tsx        # Floating action toolbar
```

### 5.3 Hooks

```
src/hooks/
├── use-documents.ts          # Fetch document list from API
├── use-document-content.ts   # Fetch specific document content
├── use-text-search.ts        # Search within loaded text
├── use-entity-detection.ts   # Simple entity pattern matching
├── use-reading-progress.ts   # Scroll position tracking
└── use-viewer-settings.ts    # Typography/theme preferences (localStorage)
```

### 5.4 API Endpoints (Backend Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/documents` | List available documents |
| GET | `/api/v1/documents/{collection}/{id}` | Get document content |

**Response Format:**
```typescript
// GET /api/v1/documents
interface DocumentListResponse {
  documents: {
    id: string;
    collection: 'raw_videos' | 'cleaned_transcripts';
    title: string;
    created_at: string;
    word_count: number;
  }[];
}

// GET /api/v1/documents/{collection}/{id}
interface DocumentResponse {
  id: string;
  collection: string;
  title: string;
  content: string;        // The actual text
  metadata: {
    source?: string;
    created_at: string;
    word_count: number;
    char_count: number;
  };
}
```

### 5.5 State Management

Use **local state** (useState/useReducer) - no need for global store:

```typescript
interface ViewerState {
  // Document
  selectedCollection: string | null;
  selectedDocumentId: string | null;
  content: string | null;
  
  // Search
  searchQuery: string;
  searchMatches: number[];
  currentMatchIndex: number;
  
  // Settings
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  fontFamily: 'sans' | 'serif' | 'mono';
  theme: 'light' | 'dark' | 'sepia';
  lineWidth: 'narrow' | 'normal' | 'wide';
  
  // Features
  entitySpotlightEnabled: boolean;
  
  // UI
  isSourceSelectorOpen: boolean;
  isSearchOpen: boolean;
}
```

---

## 6. Entity Detection (Simple Pattern Matching)

### 6.1 Approach

Use regex patterns for basic entity detection (no ML required):

```typescript
const ENTITY_PATTERNS = {
  // Names: Capitalized words (2+ consecutive)
  person: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
  
  // Places: Common location patterns
  place: /\b(?:New York|Los Angeles|London|Paris|...)\b/gi,
  
  // Dates: Various date formats
  date: /\b(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\w+ \d{1,2},? \d{4}|(?:January|February|...) \d{1,2})\b/gi,
  
  // Concepts: Words in quotes or emphasized
  concept: /"[^"]+"|'[^']+'|\*\*[^*]+\*\*/g,
};
```

### 6.2 Performance

- Process text once on load
- Store entity positions in state
- Re-render only highlights layer on toggle

---

## 7. Implementation Phases

### Phase 1: Core Viewer (Day 1)
- [ ] Create `/viewer` route with layout
- [ ] Text display component with basic styling
- [ ] Document fetching hook (mock data initially)
- [ ] Progress bar component

### Phase 2: Source Selection (Day 1-2)
- [ ] Source selector command palette
- [ ] Document list API integration
- [ ] Document content loading

### Phase 3: Search (Day 2)
- [ ] Search bar component
- [ ] Text search hook with highlighting
- [ ] Match navigation
- [ ] Keyboard shortcuts

### Phase 4: Entity Spotlight (Day 2-3)
- [ ] Entity detection patterns
- [ ] Highlight rendering
- [ ] Toggle functionality
- [ ] Entity click actions

### Phase 5: Typography & Polish (Day 3)
- [ ] Typography controls component
- [ ] Theme switching (light/dark/sepia)
- [ ] Settings persistence (localStorage)
- [ ] Final polish & animations

---

## 8. Deliverables Checklist

### Components
- [ ] `source-selector.tsx` - Command palette
- [ ] `text-display.tsx` - Main content area
- [ ] `search-bar.tsx` - Search overlay
- [ ] `progress-bar.tsx` - Reading progress
- [ ] `typography-controls.tsx` - Settings panel
- [ ] `entity-highlighter.tsx` - Entity highlights

### Hooks
- [ ] `use-documents.ts` - Document list fetching
- [ ] `use-document-content.ts` - Document content fetching
- [ ] `use-text-search.ts` - In-text search
- [ ] `use-entity-detection.ts` - Entity pattern matching
- [ ] `use-reading-progress.ts` - Scroll tracking
- [ ] `use-viewer-settings.ts` - User preferences

### Pages
- [ ] `/viewer/page.tsx` - Main page
- [ ] `/viewer/layout.tsx` - Minimal layout
- [ ] `/viewer/loading.tsx` - Loading state

---

## 9. UI Mockup (ASCII)

### 9.1 Initial State (No Document)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                                                                   │
│                                                                   │
│                         📄                                        │
│                                                                   │
│                   Select a document                               │
│                                                                   │
│                   Press ⌘K to browse                              │
│                   available texts                                 │
│                                                                   │
│                                                                   │
│                                                                   │
│                                                                   │
│                                              ┌─────────────────┐  │
│                                              │  ⌘K  Browse     │  │
│                                              └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Document Loaded

```
┌──────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 42% · 8 min │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│         Interview: John Smith on AI Ethics                        │
│         raw_videos · 2,450 words · Jan 15, 2024                  │
│         ─────────────────────────────────────────                │
│                                                                   │
│         So when we think about artificial intelligence           │
│         and its implications for society, [John Smith]           │
│         argues that we need to consider not just the             │
│         immediate benefits, but also the long-term               │
│         consequences. During our conversation in                 │
│         [New York] last [January], he mentioned that             │
│         the concept of "responsible AI" has evolved              │
│         significantly over the past decade.                      │
│                                                                   │
│         "The key challenge," he explained, "is balancing         │
│         innovation with ethical considerations. We can't         │
│         simply move fast and break things when those             │
│         things are people's lives and livelihoods."              │
│                                                                   │
│  [Aa]                                                    [⌘K]    │
│  [🔍]                                                    [◐ ]    │
└──────────────────────────────────────────────────────────────────┘

Legend:
[Aa] = Typography controls
[🔍] = Search (⌘F)
[⌘K] = Source selector
[◐ ] = Entity spotlight toggle
```

### 9.3 Search Active

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🔍 artificial                              3 of 7    ↑ ↓  ✕  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 42% · 8 min │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│         Interview: John Smith on AI Ethics                        │
│         ─────────────────────────────────────────                │
│                                                                   │
│         So when we think about [artificial] intelligence         │
│         and its implications for society, John Smith             │
│         argues that we need to consider not just the             │
│         ...                                                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Key Design Decisions

### 10.1 Why Command Palette for Source Selection?

- **Minimalist**: No sidebar or dropdown cluttering the UI
- **Keyboard-first**: Power users can navigate without mouse
- **Familiar**: Pattern used in VS Code, Slack, Linear, etc.
- **Scalable**: Works for 10 or 10,000 documents

### 10.2 Why Local State vs Zustand?

- **Isolation**: Viewer is independent module
- **Simplicity**: No cross-component state sharing needed
- **Performance**: Avoids unnecessary re-renders
- **Persistence**: Settings saved to localStorage directly

### 10.3 Why Simple Pattern Matching for Entities?

- **No Dependencies**: No NLP libraries needed
- **Fast**: Runs client-side instantly
- **Good Enough**: Catches most obvious entities
- **Extensible**: Can upgrade to ML-based detection later

---

## 11. Future Enhancements (Post-MVP)

| Enhancement | Description |
|-------------|-------------|
| **Side-by-Side View** | Compare raw vs cleaned text |
| **Annotation System** | Add notes/highlights that persist |
| **Export Options** | Download as TXT, MD, PDF |
| **Text Statistics** | Word frequency, readability score |
| **ML Entity Detection** | Use spaCy/NER for better entity detection |
| **Linked Entities** | Click entity → see in knowledge graph |
| **Diff View** | Show what was removed in cleaning |

---

## Document Metadata

**Type:** Implementation Plan  
**Module:** Text Viewer  
**Route:** `/viewer`  
**Estimated Duration:** 3 days  
**Dependencies:** Backend API for document access

---

**Ready for approval. Please review and provide feedback.**

