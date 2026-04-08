# Agent Guidelines

This document provides context for AI agents working on the Hermes Session Viewer project.

## Project Overview

Hermes Session Viewer is a read-only web viewer for [Hermes Agent](https://hermes-agent.nousresearch.com/) conversation sessions. It allows users to explore local Hermes session data including messages, reasoning traces, and tool calls.

## Tech Stack

- **Runtime**: Node.js with pnpm (packageManager: pnpm@10.33.0)
- **Framework**: React 19 with TanStack Start (file-based routing)
- **Styling**: Tailwind CSS v4 with daisyUI plugin (custom themes: `hermes`, `hermes-dark`)
- **Markdown**: Unified ecosystem (remark-gfm, rehype-shiki for syntax highlighting)
- **Fonts**: Space Grotesk (sans), IBM Plex Mono (monospace)
- **State**: use-local-storage-state for persisting user preferences

## Data Sources

- Session index: `~/.hermes/sessions/sessions.json`
- Individual sessions: `~/.hermes/sessions/<session_id>.jsonl`
- Session metadata: `~/.hermes/sessions/session_<session_id>.json`

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/hermes-types.ts` | TypeScript type definitions for session/message/tool data |
| `src/lib/server/hermes.ts` | Server-side logic for loading and parsing Hermes session files |
| `src/lib/server/markdown.ts` | Markdown rendering with Shiki syntax highlighting |
| `src/components/viewer.tsx` | Main UI components (sidebar, header, message cards, tool panels) |
| `src/routes/index.tsx` | Main route with loader and component |
| `src/styles/app.css` | Tailwind/daisyUI theme config and custom component styles |

## Code Conventions

### TypeScript
- Use explicit return types on exported functions
- Prefer `type` over `interface` for object shapes
- Use `Record<string, T>` for dictionary types
- Helper type guards: `isRecord()`, `isJsonValue()`

### Styling
- Custom CSS via Tailwind `@layer components` for complex patterns
- Use daisyUI component classes (btn, badge, modal, etc.)
- Custom OKLCH color definitions in theme config
- Use `color-mix(in oklch, ...)` for transparent/overlay effects
- Use `rem` units with 0.25rem (4px) base step for spacing
- Large border-radius values (1.35rem-1.75rem) for modern feel

### Components
- Prefer native HTML elements (`<details>` for collapsible sections)
- Component composition via props (no context providers for core data)
- LocalStorage state via `use-local-storage-state` hook for user preferences

### Markdown Rendering
- Use `renderMarkdown()` from `~/lib/server/markdown` for server-side rendering
- Shiki uses `github-light` theme
- Supports GFM (tables, strikethrough, task lists)

## Tool-Specific Display Optimizations

The viewer has special handling for certain tools (defined in `hermes.ts`):

| Tool | Preview Key | Special Rendering |
|------|-------------|-------------------|
| `terminal` | `command` | Rendered as shell code block |
| `browser_vision` | `question` | `analysis` field rendered as Markdown |
| `browser_navigate` | `url` | Rendered as clickable link |
| `browser_click`, `browser_type`, etc. | Various | Standard preview |

Preview keys are configured in `PREVIEW_KEYS` object and `DEFAULT_PREVIEW_KEYS` array.

## Theme System

- Three themes: `system` (follows OS), `hermes` (light), `hermes-dark` (dark)
- Custom OKLCH color palette defined in `app.css`
- Applied via `data-theme` attribute on `<html>`
- User preference persisted in localStorage

## Build & Development

```bash
pnpm dev      # Start dev server on port 3000
pnpm build   # Production build with type checking
pnpm preview # Preview production build
```
