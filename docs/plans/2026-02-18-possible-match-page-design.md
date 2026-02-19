# Possible Match Page Design
_2026-02-18_

## Overview

State 2 of the results flow: the algorithm found candidates but confidence is not high enough for a confirmed match. The user sees up to 3 candidate turtles with confidence levels, can view any full profile, and can select one as their turtle (which routes to MatchProfilePage in review mode for submission to the site director).

## User Flow

```
InstructionPage
  └── "Identify My Turtle" (low/medium confidence result)
        └── PossibleMatchPage
              ├── "View Profile" on a card → MatchProfilePage (review mode)
              │     └── "Submit for Review" → inline confirmation + email signup
              └── "None of these are my turtle" → NoMatchPage
```

## Page Layout (top → bottom, single scroll)

### Header
- Back arrow (←) — returns to InstructionPage
- Label: "Possible matches" — DM Mono, small, green (`#6b8f71`)
- Subtext: "We found some turtles that might be yours" — DM Mono, muted (`#a8c5ae`)

### Candidate Cards (up to 3, stacked vertically)
Each card contains:
- Carapace top photo — full card width, 16:9 crop
- Turtle nickname — Playfair Display, cream (`#f0ede6`)
- Confidence badge — DM Mono, small pill label: "High" / "Medium" / "Low"
  - High: green (`#6b8f71`)
  - Medium: amber (`#c8a84b`)
  - Low: muted (`#a8c5ae`)
- Two actions:
  - "View Full Profile →" — text link, routes to MatchProfilePage in review mode
  - "This Is My Turtle" — outlined button, also routes to MatchProfilePage in review mode

### Footer
- "None of these are my turtle" — outlined button, full width → routes to NoMatchPage

## MatchProfilePage: Review Mode

MatchProfilePage accepts a `mode` prop: `'confirmed' | 'review'`

In `review` mode:
- "This Is My Turtle" button is replaced with "Submit for Review"
- After submission, button area transforms inline to show:
  - Confirmation message: "Submitted for review. We'll be in touch."
  - Email signup: "Sign up for updates when this turtle is confirmed"

## Navigation

App.tsx page state expands to: `welcome | instructions | match | possible-match | no-match`

## Props

```ts
interface PossibleMatchPageProps {
  candidates: CandidateTurtle[];
  onBack: () => void;
  onNoMatch: () => void;
}

interface CandidateTurtle {
  turtleNickname: string;
  confidence: 'high' | 'medium' | 'low';
}
```

## Visual Style

Consistent with existing pages:
- Background: `#0a1a0e`
- Card bg: `#0f2414`
- Border: `1px solid #1e3a24`
- Primary green: `#6b8f71`
- Amber (medium confidence): `#c8a84b`
- Light green / muted: `#a8c5ae`
- Text: `#f0ede6`
- Fonts: Playfair Display (nickname), DM Mono (labels, badges, buttons)

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/pages/PossibleMatchPage.tsx` | Create |
| `src/pages/MatchProfilePage.tsx` | Modify — add `mode` prop (`confirmed | review`), swap button, add post-submit email state |
| `src/App.tsx` | Modify — add `possible-match` to Page type, wire navigation |
