# Encounters page: Site + Year filters

**Date:** 2026-07-04
**Status:** Approved

## Goal

Add **Site** and **Year** filters to the admin Encounters page (`src/admin/Encounters.tsx`),
alongside the existing turtle filter. Filters are **cascading**: selecting a value in one
dropdown narrows the options in the other two. Year options are derived from the years
actually present in the data (from `encounter_date`).

## Constraint driving the design

The encounter **list** is paginated and filtered server-side (25/page), so site/year
filtering for the list must happen in the backend query — filtering client-side would only
affect the 25 rows currently loaded. The **map** loads every capture location at once and
already filters client-side, so it filters in the browser.

Cascading dropdowns need a complete view of every encounter's `(turtle, site, year)`, which
no existing endpoint exposes. The current turtle dropdown is built from the *locations*
endpoint, which silently omits turtles whose captures lack GPS. A dedicated facets endpoint
sourced from `encounter_date` fixes that gap and keeps the year options consistent with the
server-side list filter.

## Backend (`backend/app/api/turtles.py`)

1. **Extend `GET /api/encounters`** with two optional query params:
   - `site: Optional[str]` → `Encounter … join Turtle`, filter `Turtle.site == site`.
   - `year: Optional[int]` → filter `extract('year', Encounter.encounter_date) == year`.
   Both apply to the `total` count query and the main paginated query.

2. **New `GET /api/encounters/facets`** — returns one lightweight row per encounter:
   ```json
   [{ "turtle_id": 1, "turtle_external_id": "T001", "turtle_name": "Shelly",
      "site": "patuxent", "year": 2024 }]
   ```
   `year` may be `null` when `encounter_date` is missing. This is the source of truth for
   building the three dropdowns, their counts, and cascading behavior.

## Frontend

3. **`src/shared/lib/api.ts`**
   - Add `site?: string` and `year?: number` to `fetchAllEncounters` opts and querystring.
   - Add `EncounterFacet` interface + `fetchEncounterFacets()`.

4. **`src/admin/Encounters.tsx`**
   - Add `siteFilter: string | 'all'` and `yearFilter: number | 'all'` state.
   - Fetch facets via react-query.
   - Build three cascading option lists from facets — each dropdown's options honor the
     other two active filters (e.g. picking Patuxent narrows Year and Turtle to Patuxent's).
   - Pass `site`/`year` into the encounters query (list, server-side) and into `EncountersMap`
     (client-side: filter markers by `site` and `captured_date` year, alongside the existing
     turtle/encounter filters).
   - Reset to page 0 and clear the selected encounter whenever any filter changes.
   - Replace the single turtle filter bar with a three-control bar (Site · Year · Turtle)
     plus a shared "Clear filters" affordance shown when any filter is active.

## Scope / YAGNI

- Site is a plain dropdown (only two sites exist); no free-text.
- No URL-persisted filter state.
- The map's year filter keys off `captured_date` rather than `encounter_date`. These are
  effectively always the same day; a one-line code comment notes the approximation rather
  than plumbing encounter-ids through the map.

## Verification

- Backend: pytest covering the new `site`/`year` params on `/api/encounters` and the
  `/api/encounters/facets` shape.
- Frontend: `npm run lint` + `npm run build`; manual check that cascading + list + map
  all react to the three filters.
