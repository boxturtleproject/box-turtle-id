# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (Vite, typically port 5173+)
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint` (ESLint 9 flat config)
- **No test framework is configured.**

## Architecture

Citizen science web app for identifying box turtles at field sites. Users upload turtle photos, get matched against known turtles, and record encounter data. Built with React 19 + TypeScript + Vite + Tailwind CSS 3.

### Routing

No React Router. App.tsx manages a `page` state variable with manual page transitions:
`'welcome' → 'instructions' → 'possible-match' → 'match-profile' → 'match-encounter' → 'thank-you'`
(Also: `'no-match'`, `'new-turtle'`, `'about'`)

All cross-page state (selected site, candidate turtle, photos, confirmed turtle) lives in App.tsx and is passed as props.

### Sites

Two field sites with distinct theming: **Patuxent** (green `#3a7d44`) and **Wallkill** (orange `#c8622a`). Site selection drives color theming throughout the app. Many components receive `site`/`siteName` props.

### Backend

Airtable serves as the database. The service layer is in `src/services/airtable.ts`. Requires env vars:
- `VITE_AIRTABLE_TOKEN`
- `VITE_AIRTABLE_BASE_ID`
- `VITE_AIRTABLE_TURTLES_TABLE`
- `VITE_AIRTABLE_ENCOUNTERS_TABLE`

Field names in Airtable queries (e.g. `{Turtle ID}`, `{Carapace Top}`) are tightly coupled to the Airtable schema.

### Dev Mode

A `DevRoutingModal` component appears in development after photo submission to simulate match outcomes (confirmed/possible/no match) since the image matching algorithm is not yet implemented. `MatchProfilePage` has a `DEV_MOCK_TURTLE` fallback when Airtable is unavailable.

### Styling

Mix of Tailwind utility classes and inline styles. CSS custom properties defined in `src/index.css`. Inline styles are used for dynamic site-based color theming.

### Key Structure

- `src/pages/` — Full-page view components (9 pages)
- `src/components/` — Shared UI: SiteBand (fixed top bar), Footer, EncounterForm, DevRoutingModal
- `src/services/` — Airtable API integration
- `src/assets/` — Static images (maps, turtle reference photos)
