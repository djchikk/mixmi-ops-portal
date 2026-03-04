# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production build
```

No test framework is configured.

## Architecture

This is a Next.js 15 (App Router) + React 19 + TypeScript internal ops dashboard for managing pilot nodes, milestones, contacts, and decisions. The entire UI lives in a single client component at `app/page.tsx` with inline sub-components (no files in `components/` yet).

**Stack:** Tailwind CSS 3.4, Supabase (Postgres + Auth), Google Fonts (Newsreader serif).

**Auth flow:** Supabase email/password auth via `@supabase/supabase-js`. Client singleton in `lib/supabase.ts`. No middleware or server-side session management — auth is purely client-side with a token gate pattern.

**Data access:** All queries go directly to Supabase from the browser (no API routes). Five tables: `pilot_nodes`, `milestones`, `community_contacts`, `decisions_log`, `engagement_logs`. Milestones, contacts, and engagement logs join to `pilot_nodes(name)`.

**UI pattern:** Dark theme with custom "sand" color palette (warm beige/terracotta tones). Tab navigation across Overview, Milestones, Nodes, Contacts, Decisions views. Status enums drive colored badges throughout.

## Environment Variables

Two `NEXT_PUBLIC_` variables required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).
