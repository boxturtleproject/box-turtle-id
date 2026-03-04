# About Page & Footer Design

**Date:** 2026-03-04

## Overview

Add a persistent footer to every page (Welcome + all 5 post-welcome pages) with links to a new About page and a Contact email. Add a descriptive blurb below the site cards on the WelcomePage with an inline "Learn more here" link to the About page.

## Components

### Footer (`src/components/Footer.tsx`)

- `border-top: 1px solid var(--color-border)` separator
- Two small uppercase DM Mono links in a flex row:
  - **About** — button that calls `onAbout` callback
  - **Contact** — `<a href="mailto:PLACEHOLDER">` (email TBD, placeholder text for now)
- Text style: `var(--font-body)`, `var(--color-text-muted)`, `0.65rem`, `letterSpacing: 0.2em`, `textTransform: uppercase`
- Added to bottom of: WelcomePage, InstructionPage, MatchProfilePage, NewTurtleSubmissionPage, NoMatchPage, PossibleMatchPage
- Not shown on AboutPage itself

### About Page (`src/pages/AboutPage.tsx`)

- No SiteBand (site-agnostic)
- Back button top-left, returns user to the page they came from
- Three paragraphs of copy, `var(--font-body)`, generous line-height, muted color:
  1. "Box Turtle ID is an experimental project to build local awareness and strengthen citizen engagement with box turtle conservation within their community. The platform takes advantage of the unusually wide array of shell patterns, limited range and extended life expectancy that characterize this species, making them ideal candidates for identification and tracking via image recognition technology."
  2. "The underlying software was developed by Andy Royle, Ph.D., from the Patuxent Research Refuge as part of his statical research into local reptile populations. It is now in use across a growing number of sites by scientists, conservation organizations and communities to better support the study of isolated and threatened populations in increasingly fragmented natural environments. In the future, we hope that it will offer a more seamless platform for integrating citizen science with academic research to provide a more complete and timely picture of population health throughout the distributed range of these amazing and resilient creatures across the USA."
  3. "Box turtles are a trafficked species, so care has been taken to ensure that any data collected through this platform is stored securely. The project sponsors request that you keep any data you collect on these unique creatures strictly confidential. Thank you."

## WelcomePage Changes

- Add blurb paragraph below site cards, above Footer:
  > "Thank you for contributing to Box Turtle ID, an experimental project that uses pattern recognition technology to make it more fun and engaging for citizens to identify box turtles in their environment and share observations about their behavior to support local scientific and conservation efforts. Learn more here."
- "Learn more here" is an inline styled button (secondary text color, underline) that calls `onAbout`

## App.tsx Changes

- Extend page state to include `'about'`
- Add `returnPage` state (type: all existing page names) to remember where the user navigated from
- `onAbout` handler: saves current page to `returnPage`, sets page to `'about'`
- AboutPage receives `onBack` that restores `returnPage`
- Pass `onAbout` callback to Footer on all pages

## Out of Scope

- Contact email address (placeholder text only, link to be added later)
- Any additional About page links or external resources
