# Design: Separate Encounter Notes Page

**Date:** 2026-03-06
**Branch:** `feature/separate-encounter-notes`

## Problem

The MatchProfilePage combined the turtle profile (photos, stats, notes) and the full EncounterForm on one long page. The volume of fields made the experience feel overwhelming and unclear.

## Solution

Split the match flow into two distinct screens:

1. **MatchProfilePage** — confirmation only. Shows the turtle profile and two actions: "This Is My Turtle" / "Not My Turtle". The encounter form is removed entirely.
2. **MatchEncounterPage** — new page. Records the observation (EncounterForm + Submit). Turtle nickname shown small at top for context.
3. **ThankYouPage** — new page. Confirmation message + the site blurb from WelcomePage. Single CTA: "Identify Another Turtle".

## Flow

```
Confirmed match:
  InstructionPage → MatchProfilePage → MatchEncounterPage → ThankYouPage → InstructionPage

Possible match:
  PossibleMatchPage → MatchProfilePage → MatchEncounterPage → ThankYouPage → InstructionPage
  PossibleMatchPage → MatchProfilePage → "Not My Turtle" → back to candidate list
```

Both match modes (confirmed and possible-match review) now use the same MatchProfilePage and the same MatchEncounterPage. The `mode` prop is removed.

## Components Changed

### MatchProfilePage (modified)
- Removed: `EncounterForm`, `submitted` state, `mode` prop, "Submit for Review" button
- Added: `onConfirm: () => void` prop (navigates to MatchEncounterPage)
- Both modes now show: "This Is My Turtle" + "Not My Turtle"
- Dev fallback: Airtable errors in dev fall back to a mock turtle (T106) instead of showing an error screen

### MatchEncounterPage (new)
- Props: `turtleNickname`, `onBack`, `onSubmitted`, `onAbout`, `siteName`, `site`
- Header: back arrow + turtle nickname (small/muted) + "Record Observation" heading
- Body: EncounterForm (no nickname field)
- Footer: "Submit Observation" button + Footer component
- Instructions to be added at top of form

### ThankYouPage (new)
- Props: `onDone`, `onAbout`, `site`
- Layout: SiteBand + centered content (heading + blurb) + "Identify Another Turtle" button + Footer
- Blurb: same text as WelcomePage site blurb

### App.tsx (modified)
- New page types: `'match-encounter'`, `'thank-you'`
- New state: `confirmedTurtle` (string | null) — holds nickname for MatchEncounterPage
- NewTurtleSubmissionPage now routes to `'thank-you'` instead of `'instructions'` on submit

## Dev Mock

`MatchProfilePage` falls back to a hardcoded `DEV_MOCK_TURTLE` when Airtable is unavailable in dev mode. This is the intended pattern for all future branches where Airtable is needed.
