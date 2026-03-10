# SiteBand Navigation — Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

Make the site name in the SiteBand header tappable so users can navigate back to the WelcomePage to switch sites at any point in the flow.

## Behavior

### Default state
The SiteBand looks exactly as it does today. No visual affordance in the resting state — the interaction is intentionally subtle.

### Hover / active state
On hover (desktop) or active touch (mobile): `cursor: pointer` + slight opacity reduction (e.g. `0.75`) to hint at interactivity. No underline, no color change, no permanent indicator.

### Navigation
- **Non-form pages** (InstructionPage, MatchProfilePage, PossibleMatchPage, NoMatchPage, ThankYouPage): tapping navigates to `welcome` immediately.
- **Form pages** (MatchEncounterPage, NewTurtleSubmissionPage): tapping opens a confirmation modal before navigating.

### Leave confirmation modal (form pages only)
A small centered overlay using existing design tokens:

```
┌─────────────────────────────┐
│  Switch sites?              │
│  Your progress will be      │
│  lost.                      │
│                             │
│  [Cancel]  [Switch Sites]   │
└─────────────────────────────┘
```

- Background: `rgba(0,0,0,0.6)` overlay, card at `#0f2414`, border `1px solid #1e3a24`
- "Cancel" → dismisses modal, stays on current page
- "Switch Sites" → calls `onWelcome`, resets app state

## Implementation Approach

**Approach A — Prop threading (chosen)**

### SiteBand changes
Add `onWelcome?: () => void` to `SiteBandProps`. When provided, wrap the text in a `<button>` styled to be invisible in default state (no border, no bg, same font/color/spacing as current `<span>`). Apply hover opacity via `onMouseEnter`/`onMouseLeave` state or CSS `:hover` via inline `style` + `onMouseEnter`.

### App.tsx changes
Add `handleWelcome` function:
```ts
const handleWelcome = () => {
  setSelectedCandidate(null);
  setConfirmedTurtle(null);
  setPage('welcome');
};
```
Pass as `onWelcome` prop to every page that uses SiteBand.

### Page changes
Each page adds `onWelcome: () => void` to its props interface and passes it to `<SiteBand>`.

Form pages additionally:
- Add `showLeaveConfirm: boolean` local state (default `false`)
- Pass `onWelcome={() => setShowLeaveConfirm(true)}` to SiteBand
- Render modal when `showLeaveConfirm` is true
- "Switch Sites" button calls the actual `onWelcome` prop

## Files to Change

| File | Change |
|------|--------|
| `src/components/SiteBand.tsx` | Add `onWelcome?` prop; render button vs span conditionally |
| `src/App.tsx` | Add `handleWelcome`; pass as `onWelcome` to all pages |
| `src/pages/InstructionPage.tsx` | Add `onWelcome` prop, thread to SiteBand |
| `src/pages/MatchProfilePage.tsx` | Add `onWelcome` prop, thread to SiteBand |
| `src/pages/PossibleMatchPage.tsx` | Add `onWelcome` prop, thread to SiteBand |
| `src/pages/NoMatchPage.tsx` | Add `onWelcome` prop, thread to SiteBand |
| `src/pages/ThankYouPage.tsx` | Add `onWelcome` prop, thread to SiteBand |
| `src/pages/MatchEncounterPage.tsx` | Add `onWelcome` prop, `showLeaveConfirm` state, modal |
| `src/pages/NewTurtleSubmissionPage.tsx` | Add `onWelcome` prop, `showLeaveConfirm` state, modal |
