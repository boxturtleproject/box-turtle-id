# Design: Consistent Encounter Data Across All Submission Paths

**Date:** 2026-03-02

## Problem

The app currently captures encounter metadata (date, location, behavior, health, notes) only on the new turtle submission path. When a user confirms an existing turtle match, no encounter data is recorded. Additionally, the image submission page captures "Observation Notes" out of sequence — before the user even knows which turtle they've found.

## Goal

Capture a consistent set of encounter data at the end of every submission path (new turtle and existing turtle match), and remove the premature observation notes field from the image submission page.

## Design

### Shared `EncounterForm` Component

A new reusable component that renders all encounter fields. Accepts a single prop:

- `includeNickname: boolean` — shows the Suggested Nickname field only on the new turtle path

**Fields (in order):**
1. **Date** — required date input, defaults to today
2. **Location** — free-text input
3. **Observed Behavior** — multi-select checkboxes (Nesting, Mating, Scouting, Active, Basking, Basking in Rain, Locomoting, Hidden, Stationary, Emerging, Bathing, Digging)
4. **Health** — dropdown (Healthy, Sick, Injured, Deceased)
5. **Observation Notes** — textarea
6. **Suggested Nickname** — text input, rendered only when `includeNickname={true}`
7. **Notify me about this turtle** — checkbox with conditional email input

---

### MatchProfilePage

- Add `<EncounterForm includeNickname={false} />` below the turtle profile in both "confirmed" and "review" modes
- Move the action button ("This Is My Turtle" / "Submit for Review") to the bottom of the form
- Remove the existing standalone email signup in "confirmed" mode — the notify opt-in in the form replaces it

---

### NewTurtleSubmissionPage

- Replace current inline form fields with `<EncounterForm includeNickname={true} />`
- Rename "General Notes" → "Observation Notes" (handled by the shared component)
- Field order and labels align with the shared component

---

### InstructionPage

- Remove the Observation Notes textarea
- Drop `notes` from the `SubmittedPhotos` interface and all downstream consumers

---

## Out of Scope

- Airtable integration for the new encounter data fields (pre-existing TODO)
- Any changes to the PossibleMatchPage or NoMatchPage routing
