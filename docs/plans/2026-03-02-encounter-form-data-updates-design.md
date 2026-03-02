# Design: Encounter Form Data Structure Updates

**Date:** 2026-03-02

## Changes

### `BEHAVIORS` — updated list
Replace the current 12-item list with 8 items:
Digging, Nesting, Mating, Locomoting, Stationary, Basking, Hiding, Bathing

### `CONDITIONS` — new multi-select field
New constant with 8 items: Sunny, Damp, Rainy, Cloudy, Foggy, Dry, Humid, Hot
Rendered as checkboxes, same pattern as Observed Behavior.

### `SETTING` — new multi-select field
New constant with 4 items: Road, Field, Woods, Wetland
Rendered as checkboxes, same pattern as Observed Behavior.

### `EncounterFormData` interface
Add `conditions: string[]` (default `[]`) and `setting: string[]` (default `[]`).

### Form field order
Date → Location → Setting → Conditions → Observed Behavior → Health → Observation Notes → Suggested Nickname (conditional) → Notify

## Out of Scope
- No changes to Health, Observation Notes, Nickname, or Notify fields
- No changes to any page that consumes EncounterForm
