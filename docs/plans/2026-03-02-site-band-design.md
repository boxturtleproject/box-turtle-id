# Design: Site Identity Band

**Date:** 2026-03-02

## Problem

The site name currently appears inconsistently — left-aligned on some pages, right-aligned on others — as plain inline text in each page's header. It doesn't provide strong visual identity and gives no persistent cue about which site the user is working in.

## Goal

Add a narrow, colored band at the top of every post-welcome page that displays the selected site name and uses a distinct color per site to reinforce context throughout the entire flow.

## Colors

- **Patuxent Research Refuge** → `#3a7d44` (forest green), white text
- **Wallkill Valley Land Trust** → `#c8622a` (earth orange), white text

## `SiteBand` Component

New file: `src/components/SiteBand.tsx`

Accepts `site: Site` (the `'patuxent' | 'wallkill'` type from `App.tsx`). Renders a full-width, narrow band (~2.5rem tall) fixed to the top of the page, with the full site name centered in white, small-caps, DM Mono font.

Color mapping lives inside this component.

## Pages Updated

All pages that currently receive `siteName: string` are updated to:
1. Also accept `site: Site` as a prop
2. Render `<SiteBand site={site} />` as the first element (above existing content, accounts for band height with top padding)
3. Remove the existing inline `siteName` text from their header sections

**Pages affected:**
- `src/pages/InstructionPage.tsx`
- `src/pages/MatchProfilePage.tsx`
- `src/pages/PossibleMatchPage.tsx`
- `src/pages/NoMatchPage.tsx`
- `src/pages/NewTurtleSubmissionPage.tsx`

**WelcomePage:** No band — no site selected yet.

## `App.tsx`

Already has `selectedSite: Site | null`. Pass `site={selectedSite!}` to all post-welcome pages (site is guaranteed non-null once past WelcomePage).

## Out of Scope

- No changes to `siteName` prop wiring for any non-header purposes
- No animation or transition on site band
- `siteName` prop can be retained on pages for now if used elsewhere (e.g. NewTurtleSubmissionPage header title area) — only the inline muted site-name text in headers is removed
