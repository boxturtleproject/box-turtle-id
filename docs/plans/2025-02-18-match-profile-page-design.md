# Match Profile Page Design
_2025-02-18_

## Overview

State 1 of the results flow: a confirmed turtle match. Fetches live data from Airtable for a given turtle ID (hardcoded to `T106` until the matching algorithm is connected), displays the turtle's profile, and collects an email address for future sighting notifications.

## User Flow

```
InstructionPage
  └── "Identify My Turtle" button
        └── MatchProfilePage
              ├── Turtle profile (from Airtable)
              ├── Email signup
              └── "This Is My Turtle" / "Not My Turtle" buttons
```

## Data Sources

### Turtles table
- Base ID: `appd4ajEdEAQ7bF4C`
- Table ID: `tblKjFWv4Qy0JL6Wd`
- Fields used: Nickname, Gender, Date First Identified, Carapace Top, Carapace Left, Carapace Right, Notes

### Encounters table
- Table ID: `tbl9MJ4oADtMvVmXq`
- Fields: Date, Turtle ID (linked record)
- Derived: count of encounters, most recent encounter date

### Default match
- Hardcoded turtle ID: `T106` (swap for algorithm output when ready)

## Page Layout (top → bottom, single scroll)

### Header
- Back arrow (←) — returns to InstructionPage
- Label: "We found your turtle" — DM Mono, small, green (`#6b8f71`)

### Hero title
- Turtle nickname — Playfair Display, large, cream (`#f0ede6`)

### Photo gallery
- Carapace Top: full width, 4:3 aspect ratio
- Carapace Left + Right: side-by-side below, square crop, equal width

### Stats row
- Three compact chips in a horizontal row: Gender · First Identified [date] · [N] Encounters
- Last Encounter date on its own line below, slightly smaller, muted

### Notes
- Displayed only if Notes field is non-empty
- Subtle inset block, DM Mono, muted green text

### Email signup
- Text input: placeholder "Your email address"
- Button: "Notify Me of Future Sightings" — full width, same outlined style
- Context line: "We'll email you when this turtle is spotted again"

### Action buttons
- "This Is My Turtle" — filled green, full width
- "Not My Turtle" — outlined, full width (stubbed — routes to possible/no match flow later)

## State

```ts
type MatchProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; turtle: TurtleRecord; encounterCount: number; lastEncounter: string | null }

interface TurtleRecord {
  id: string
  nickname: string
  gender: string
  dateFirstIdentified: string
  carapaceTop: AirtableAttachment[]
  carapaceLeft: AirtableAttachment[]
  carapaceRight: AirtableAttachment[]
  notes: string
}
```

## Data Fetching

1. On mount, fetch turtle record by searching for `T106` in the Nickname field (or record ID — confirm with data)
2. Fetch all encounters where `Turtle ID` contains the matched turtle's record ID
3. Derive `encounterCount = encounters.length`
4. Derive `lastEncounter = max(encounters.map(e => e.Date))`

API calls use the Airtable REST API with a personal access token stored in `.env`:
```
VITE_AIRTABLE_TOKEN=pat...
VITE_AIRTABLE_BASE_ID=appd4ajEdEAQ7bF4C
```

## Visual Style

Consistent with existing pages:
- Background: `#0a1a0e`
- Primary text: `#f0ede6`
- Accent / borders: `#6b8f71`
- Muted text: `#a8c5ae`
- Fonts: Playfair Display (headings), DM Mono (labels, stats, buttons)

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/MatchProfilePage.tsx` | Create |
| `src/services/airtable.ts` | Create — Airtable fetch utilities |
| `src/App.tsx` | Modify — add `match` to Page type, navigate from InstructionPage |
| `.env` | Create — Airtable token + base ID |
| `.env.example` | Create — template without secrets |
