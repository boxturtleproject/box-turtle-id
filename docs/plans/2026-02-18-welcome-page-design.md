# Welcome Page Design — Box Turtle ID

**Date:** 2026-02-18

## Overview

A mobile welcome/splash screen for the Box Turtle ID app. Clean, scientific tone. Pure presentational — no state, no routing logic.

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Vite (build tool)
- Google Fonts (Playfair Display, DM Mono)

## Visual Design

- **Background:** Very dark green-black (`#0a1a0e`) — evokes nature without being literal
- **Layout:** Full viewport height (`h-screen`), content vertically centered, button anchored near bottom
- **Approach:** Full-bleed typographic splash — large confident type, generous negative space

## Typography

| Role | Font | Style |
|------|------|-------|
| Display (app name) | Playfair Display | Large, wide letter-spacing, off-white |
| UI / tagline | DM Mono | Small, uppercase, spaced, muted green |

## Content

| Element | Value |
|---------|-------|
| App name | `Box Turtle ID` |
| Tagline | `SUBMIT A PHOTO TO IDENTIFY YOUR TURTLE` |
| CTA button | `GET STARTED` |

## Button Style

Ghost/outlined button — border in muted green, transparent background, fills on hover/tap. Scientific aesthetic, not garish.

## File Structure

```
/src
  /pages
    WelcomePage.tsx
  App.tsx
  main.tsx
  index.css
```

## Decisions Made

- No background image or illustration — type-only for maximum clarity
- No secondary CTA — single focused action
- No brief description text — tagline carries all context needed
- Dark theme — authoritative, research-grade feel
