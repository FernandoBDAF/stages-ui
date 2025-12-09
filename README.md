# Stages-UI

A modern, minimalist UI for configuring and executing GraphRAG and Ingestion pipelines.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

---

## Features

- 🎯 **Dynamic Form Generation** - Forms generated from API schema, not hardcoded
- 🔄 **Auto-Dependency Resolution** - Automatically includes required stage dependencies
- 📊 **Real-Time Monitoring** - Live pipeline execution status with progress tracking
- ✅ **Validation** - Client and server-side validation before execution
- 🎨 **Modern UI** - Built with shadcn/ui and Tailwind CSS
- 📱 **Responsive** - Works on desktop and tablet screens
- 🔐 **Type-Safe** - Full TypeScript coverage with strict mode

---

## Quick Start

### Prerequisites

- Node.js 20+ installed
- Backend API running on `http://localhost:8080/api/v1`

### Installation

```bash
npm install
```

### Configuration

Create or update `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## User Flow

```
1. Select Pipeline → 2. Select Stages → 3. Configure → 4. Execute → 5. Monitor
   (GraphRAG/Ingestion)   (Checkboxes)      (Dynamic Forms)  (Validate+Run)  (Real-time Status)
```

---

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 | App Router, Server Components |
| UI | shadcn/ui | Accessible component library |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| State | Zustand | Lightweight state management |
| Data Fetching | TanStack Query | Caching, polling, optimistic updates |
| Forms | React Hook Form + Zod | Type-safe validation |
| Language | TypeScript 5 | Type safety |

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main application page
│   └── providers.tsx       # React Query provider
│
├── components/
│   ├── pipeline/           # Pipeline/stage selection
│   ├── config/             # Configuration forms
│   ├── execution/          # Validation & execution
│   ├── layout/             # Header & footer
│   └── ui/                 # shadcn/ui components
│
├── hooks/                  # Custom React hooks
│   ├── use-stages.ts       # Fetch pipelines/stages
│   ├── use-stage-config.ts # Fetch stage schemas
│   └── use-pipeline-execution.ts # Execute & monitor
│
├── lib/
│   ├── api/                # API client
│   ├── store/              # Zustand stores
│   └── utils/              # Utilities
│
└── types/                  # TypeScript types
    └── api.ts              # API response types
```

### State Management

Three Zustand stores manage application state:

1. **`pipeline-store`** - Pipeline/stage selection
2. **`config-store`** - Stage configurations
3. **`execution-store`** - Validation & execution state

### API Integration

The application connects to 7 REST endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/stages` | GET | List all pipelines and stages |
| `/stages/{name}/config` | GET | Get configuration schema for a stage |
| `/stages/{name}/defaults` | GET | Get default values for a stage |
| `/pipelines/validate` | POST | Validate pipeline configuration |
| `/pipelines/execute` | POST | Execute pipeline |
| `/pipelines/{id}/status` | GET | Get execution status (polling) |
| `/pipelines/{id}/cancel` | POST | Cancel running pipeline |

---

## Component Guide

### Pipeline Selector
Radio button selector for GraphRAG or Ingestion pipelines.

### Stage Selector
Checkbox-based stage selection with:
- Dependency information
- LLM badges for stages using language models
- Auto-inclusion warnings for missing dependencies

### Stage Config Panel
Collapsible panels for each stage with:
- Grouped fields by category
- 6 field types: text, number, slider, checkbox, select, multiselect
- Reset to defaults button
- Type badges and required indicators

### Execution Panel
Control center for validation and execution:
- Validate configuration button
- Execute pipeline button (enabled after validation)
- Cancel button (when running)
- Validation results with execution plan preview
- Real-time status monitor with progress bar

---

## Field Types

The dynamic form system supports 6 field types:

| Type | UI Element | Features |
|------|------------|----------|
| `text` | Text input | Placeholder support |
| `number` | Number input | Min/max/step validation |
| `slider` | Range slider | Live value display |
| `checkbox` | Checkbox | Boolean toggle |
| `select` | Dropdown | Recommended option marked with ★ |
| `multiselect` | Checkbox array | Multiple selection |

---

## Development

### Code Quality

```bash
# Type checking
npm run build

# Linting
npm run lint
```

### Key Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | Backend API base URL |

### Next.js Config

API rewrites are configured in `next.config.ts` to proxy `/api/*` requests to the backend.

---

## Testing with Backend

1. Ensure your backend API is running on `http://localhost:8080`
2. API must implement all 7 endpoints listed above
3. Start the UI with `npm run dev`
4. Navigate to `http://localhost:3000`

### Expected API Response Formats

See `src/types/api.ts` for complete TypeScript definitions of all API responses.

---

## Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Phase 7 Enhancements (Planned)

- [ ] Inline field validation errors
- [ ] Enhanced loading states
- [ ] Mobile responsiveness refinements
- [ ] Accessibility improvements
- [ ] Error boundaries
- [ ] Dark mode polish

---

## Documentation

- [Implementation Plan](../IMPLEMENTATION_PLAN.md) - Complete technical implementation guide
- [UI Design Specification](../UI_DESIGN_SPECIFICATION.md) - Original design specification
- [MVP Completion Summary](../MVP_COMPLETION_SUMMARY.md) - Phase 1-6 completion details

---

## License

MIT

---

## Support

For issues or questions, please refer to the implementation documentation or create an issue in the repository.

---

**Built with ❤️ using Next.js, TypeScript, and shadcn/ui**
