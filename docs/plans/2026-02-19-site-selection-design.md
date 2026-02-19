# Site Selection Design
_2026-02-19_

## Overview

Add a site selection step to the Welcome page. Users choose between two research sites before proceeding. The selected site is carried through the entire app and displayed in the header of all subsequent pages.

## User Flow

```
WelcomePage (site selection)
  ├── Tap "Patuxent Research Refuge" card → InstructionPage (site = patuxent)
  └── Tap "Wallkill Valley Land Trust" card → InstructionPage (site = wallkill)
```

Selecting a site immediately navigates to Instructions — no separate "Get Started" button.

## Sites

| Key | Display Name | Location |
|-----|-------------|----------|
| `patuxent` | Patuxent Research Refuge | Maryland |
| `wallkill` | Wallkill Valley Land Trust | New York |

## WelcomePage Changes

The existing title/tagline stays at the top. The "Get Started" button is replaced by two site cards stacked vertically.

### Each site card contains:
- **Placeholder map image** — 16:9 aspect ratio, dark green bg (`#0f2414`) with "Map coming soon" label in DM Mono. Swappable with a real image by changing one line.
- **Site name** — Playfair Display, cream (`#f0ede6`)
- **Location** — DM Mono, muted green (`#a8c5ae`), small, uppercase

Tapping anywhere on a card navigates immediately to InstructionPage with that site selected.

### Props change:
- Remove: `onGetStarted: () => void`
- Add: `onSelectSite: (site: Site) => void`

## Site Name in Subsequent Page Headers

All pages that have a header get a `siteName: string` prop. The site name is displayed as a small DM Mono uppercase label below the back arrow and above the page title:

```
←
PATUXENT RESEARCH REFUGE
[page title]
```

Pages affected:
- `InstructionPage`
- `PossibleMatchPage`
- `MatchProfilePage`

## App.tsx Changes

```ts
type Site = 'patuxent' | 'wallkill';

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent Research Refuge',
  wallkill: 'Wallkill Valley Land Trust',
};
```

- Add `selectedSite` state: `useState<Site | null>(null)`
- `WelcomePage` receives `onSelectSite` — sets `selectedSite` and advances to `instructions`
- All downstream pages receive `siteName={SITE_NAMES[selectedSite]}` prop

## Visual Style

Consistent with existing pages:
- Background: `#0a1a0e`
- Card bg: `#0f2414`
- Border: `1px solid #1e3a24`
- Placeholder image bg: `#0f2414`
- Site name: Playfair Display, `#f0ede6`
- Location / site label in headers: DM Mono, `#a8c5ae`, uppercase, small

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/WelcomePage.tsx` | Modify — replace "Get Started" button with two site cards |
| `src/pages/InstructionPage.tsx` | Modify — add `siteName` prop, display in header |
| `src/pages/PossibleMatchPage.tsx` | Modify — add `siteName` prop, display in header |
| `src/pages/MatchProfilePage.tsx` | Modify — add `siteName` prop, display in header |
| `src/App.tsx` | Modify — add `Site` type, `selectedSite` state, `SITE_NAMES` map, thread `siteName` to all pages |
