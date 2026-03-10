# Separate Encounter Notes Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the match confirmation flow into three screens — MatchProfilePage (confirm identity), MatchEncounterPage (record observation), ThankYouPage (confirmation) — replacing the current single long page that combined all three.

**Architecture:** Remove the EncounterForm and mode prop from MatchProfilePage entirely. Create two new page components (MatchEncounterPage, ThankYouPage). Wire everything through App.tsx using two new page types and one new piece of state (confirmedTurtle). NewTurtleSubmissionPage also routes to ThankYouPage after submit.

**Tech Stack:** React + TypeScript, inline CSS-in-JS using CSS vars, existing SiteBand/Footer/EncounterForm components.

---

## Task 1: Simplify MatchProfilePage

Remove the EncounterForm, mode prop, submitted state, and encounterData state. Replace "This Is My Turtle" / "Submit for Review" button logic with a single `onConfirm` prop. Add a dev mock fallback so Airtable errors in DEV don't show an error screen.

**Files:**
- Modify: `src/pages/MatchProfilePage.tsx`

**Step 1: Replace the file**

The new MatchProfilePage has these props:
```ts
interface MatchProfilePageProps {
  onBack: () => void;
  onConfirm: () => void;
  onNotMyTurtle: () => void;
  onAbout: () => void;
  turtleNickname?: string;
  siteName?: string;
  site: Site;
}
```

Remove these imports: `EncounterForm`, `defaultEncounterFormData`, `EncounterFormData`.

Remove these state vars: `encounterData`, `submitted`, `confirmHovered`.

Replace the `PageState` error handler: in DEV (`import.meta.env.DEV`), fall back to a hardcoded mock turtle instead of showing an error screen. Add this constant at the top of the file:

```ts
const DEV_MOCK_TURTLE: TurtleRecord = {
  airtableId: 'mock',
  nickname: 'T106',
  gender: 'Female',
  dateFirstIdentified: '2021-06-15',
  carapaceTop: [],
  carapaceLeft: [],
  carapaceRight: [],
  notes: 'Mock turtle for dev — Airtable unavailable.',
};
```

The error render branch becomes:
```tsx
if (state.status === 'error') {
  if (import.meta.env.DEV) {
    // Fall through with mock data
    const mockState = { status: 'loaded' as const, turtle: DEV_MOCK_TURTLE, encounterCount: 3, lastEncounter: '2024-08-10' };
    // use mockState below by reassigning state — see step below
  }
  // prod: show error screen (unchanged)
  return ( ... );
}
```

Actually, handle the dev mock more cleanly: after the `load()` function catches an error, in DEV mode set state to loaded with the mock data instead of error:

```ts
} catch (err: any) {
  if (import.meta.env.DEV) {
    setState({ status: 'loaded', turtle: DEV_MOCK_TURTLE, encounterCount: 3, lastEncounter: '2024-08-10' });
  } else {
    setState({ status: 'error', message: err.message ?? 'Failed to load turtle data.' });
  }
}
```

Replace the "Encounter form + action" section (lines 232-314 in current file) with just the two buttons:

```tsx
{/* Actions */}
<div className="flex flex-col gap-3 mb-8">
  <button
    type="button"
    className="w-full py-4 text-sm uppercase transition-all duration-300"
    style={{
      fontFamily: 'var(--font-body)',
      letterSpacing: '0.2em',
      color: 'var(--color-btn-primary-text)',
      backgroundColor: 'var(--color-btn-primary-bg)',
      border: 'none',
      cursor: 'pointer',
    }}
    onClick={onConfirm}
  >
    This Is My Turtle
  </button>
  <button
    type="button"
    className="w-full py-4 text-sm uppercase border transition-all duration-300"
    style={{
      fontFamily: 'var(--font-body)',
      letterSpacing: '0.2em',
      color: 'var(--color-text-secondary)',
      borderColor: 'var(--color-border-action)',
      backgroundColor: 'transparent',
      cursor: 'pointer',
    }}
    onClick={onNotMyTurtle}
  >
    Not My Turtle
  </button>
</div>
```

Keep hover state for both buttons (add `confirmHovered` and `notMyTurtleHovered` back just for the two buttons, or use CSS `:hover` — inline style approach with useState is fine, keep parity with existing pages).

Update the header subtitle from "We found your turtle" to just show turtle nickname context — keep as-is since it already shows `turtle.nickname` as the h1.

**Step 2: Verify TypeScript compiles**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID/.claude/worktrees/objective-austin"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to this change).

**Step 3: Commit**

```bash
git add src/pages/MatchProfilePage.tsx
git commit -m "refactor: simplify MatchProfilePage — remove encounter form and mode prop, add onConfirm, add dev mock fallback"
```

---

## Task 2: Create MatchEncounterPage

New page. Shows the EncounterForm with a submit button. Header shows back arrow + turtle nickname (small/muted) + "Record Observation" title.

**Files:**
- Create: `src/pages/MatchEncounterPage.tsx`

**Step 1: Create the file**

```tsx
// src/pages/MatchEncounterPage.tsx
import { useState } from 'react';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';
import { Footer } from '../components/Footer';
import {
  EncounterForm,
  defaultEncounterFormData,
  type EncounterFormData,
} from '../components/EncounterForm';

interface MatchEncounterPageProps {
  turtleNickname: string;
  onBack: () => void;
  onSubmitted: () => void;
  onAbout: () => void;
  siteName?: string;
  site: Site;
}

export function MatchEncounterPage({
  turtleNickname,
  onBack,
  onSubmitted,
  onAbout,
  site,
}: MatchEncounterPageProps) {
  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [submitHovered, setSubmitHovered] = useState(false);

  function handleSubmit() {
    console.log('Encounter submitted:', turtleNickname, encounterData);
    onSubmitted();
  }

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} />

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10l6 6" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.7rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            {turtleNickname}
          </p>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            lineHeight: 1.1,
          }}
        >
          Record Observation
        </h1>
      </div>

      {/* Form */}
      <EncounterForm value={encounterData} onChange={setEncounterData} />

      {/* Submit */}
      <div className="flex flex-col gap-3 mb-8">
        <button
          type="button"
          className="w-full py-4 text-sm uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: 'var(--color-btn-primary-text)',
            backgroundColor: submitHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setSubmitHovered(true)}
          onMouseLeave={() => setSubmitHovered(false)}
          onClick={handleSubmit}
        >
          Submit Observation
        </button>
      </div>

      <Footer onAbout={onAbout} />
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/pages/MatchEncounterPage.tsx
git commit -m "feat: add MatchEncounterPage — encounter form with submit, separated from profile view"
```

---

## Task 3: Create ThankYouPage

New page. SiteBand + centered content: "Thank You" heading + blurb text from WelcomePage + "Identify Another Turtle" button + Footer.

**Files:**
- Create: `src/pages/ThankYouPage.tsx`

**Step 1: Create the file**

The blurb text (copied exactly from WelcomePage.tsx line 148–151):
> "Thank you for contributing to Box Turtle ID, an experimental project that uses pattern recognition technology to make it more fun and engaging for citizens to identify box turtles in their environment and share observations about their behavior to support local scientific and conservation efforts."

```tsx
// src/pages/ThankYouPage.tsx
import { useState } from 'react';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';
import { Footer } from '../components/Footer';

interface ThankYouPageProps {
  onDone: () => void;
  onAbout: () => void;
  site: Site;
}

export function ThankYouPage({ onDone, onAbout, site }: ThankYouPageProps) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-10"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} />

      {/* Content */}
      <div className="flex flex-col gap-6 flex-1 justify-center">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            lineHeight: 1.1,
          }}
        >
          Thank You
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem',
            lineHeight: 1.7,
            letterSpacing: '0.05em',
          }}
        >
          Thank you for contributing to Box Turtle ID, an experimental project that uses pattern
          recognition technology to make it more fun and engaging for citizens to identify box turtles
          in their environment and share observations about their behavior to support local scientific
          and conservation efforts.
        </p>

        <button
          type="button"
          className="w-full py-4 text-sm uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: 'var(--color-btn-primary-text)',
            backgroundColor: btnHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          onClick={onDone}
        >
          Identify Another Turtle
        </button>
      </div>

      <Footer onAbout={onAbout} />
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/pages/ThankYouPage.tsx
git commit -m "feat: add ThankYouPage — confirmation screen with site blurb and identify-another CTA"
```

---

## Task 4: Wire App.tsx

Add two new page types, one new state, and all navigation handlers.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update Page type and imports**

Change the `Page` type from:
```ts
type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match' | 'new-turtle' | 'about';
```
to:
```ts
type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match' | 'new-turtle' | 'about' | 'match-encounter' | 'thank-you';
```

Add imports:
```ts
import { MatchEncounterPage } from './pages/MatchEncounterPage';
import { ThankYouPage } from './pages/ThankYouPage';
```

**Step 2: Add confirmedTurtle state**

In the `App` function, after `const [returnPage, setReturnPage] = useState<Page>('welcome');`, add:
```ts
const [confirmedTurtle, setConfirmedTurtle] = useState<string | null>(null);
```

**Step 3: Update page === 'match' handler**

Replace the current `page === 'match'` block. The confirmed match has no explicit turtleNickname in the current code (defaults to T106). Pass it explicitly and wire `onConfirm`:

```tsx
if (page === 'match') {
  const matchNickname = 'T106'; // TODO: replace with real match result
  return (
    <MatchProfilePage
      turtleNickname={matchNickname}
      onBack={() => setPage('instructions')}
      onConfirm={() => { setConfirmedTurtle(matchNickname); setPage('match-encounter'); }}
      onNotMyTurtle={() => setPage('instructions')}
      onAbout={handleAbout}
      siteName={siteName}
      site={selectedSite!}
    />
  );
}
```

**Step 4: Update page === 'possible-match' selectedCandidate handler**

The inner `if (selectedCandidate)` block becomes:

```tsx
if (selectedCandidate) {
  return (
    <MatchProfilePage
      turtleNickname={selectedCandidate}
      onBack={() => setSelectedCandidate(null)}
      onConfirm={() => { setConfirmedTurtle(selectedCandidate); setPage('match-encounter'); }}
      onNotMyTurtle={() => setSelectedCandidate(null)}
      onAbout={handleAbout}
      siteName={siteName}
      site={selectedSite!}
    />
  );
}
```

**Step 5: Add match-encounter page handler**

Add before the `page === 'no-match'` block:

```tsx
if (page === 'match-encounter') {
  return (
    <MatchEncounterPage
      turtleNickname={confirmedTurtle!}
      onBack={() => selectedCandidate ? setPage('possible-match') : setPage('match')}
      onSubmitted={() => setPage('thank-you')}
      onAbout={handleAbout}
      siteName={siteName}
      site={selectedSite!}
    />
  );
}
```

**Step 6: Add thank-you page handler**

Add after the match-encounter block:

```tsx
if (page === 'thank-you') {
  return (
    <ThankYouPage
      onDone={() => setPage('instructions')}
      onAbout={handleAbout}
      site={selectedSite!}
    />
  );
}
```

**Step 7: Update NewTurtleSubmissionPage to route to thank-you**

Change `onSubmitted={() => setPage('instructions')}` to `onSubmitted={() => setPage('thank-you')}`.

**Step 8: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 9: Start dev server and manually test all three flows**

```bash
npm run dev
```

Test flow 1 — Confirmed match:
1. Select a site → Instructions → "Identify" → DevModal → "Confirmed Match"
2. MatchProfilePage shows "This Is My Turtle" + "Not My Turtle"
3. Click "This Is My Turtle" → MatchEncounterPage shows "Record Observation" with T106 in header
4. Fill form or leave blank → "Submit Observation" → ThankYouPage
5. "Identify Another Turtle" → InstructionPage

Test flow 2 — Possible match:
1. Select a site → Instructions → "Identify" → DevModal → "Possible Match"
2. PossibleMatchPage → "View Full Profile" on first candidate
3. MatchProfilePage shows candidate → "This Is My Turtle" → MatchEncounterPage
4. Submit → ThankYouPage → "Identify Another Turtle" → InstructionPage
5. Also test "Not My Turtle" → returns to candidate list

Test flow 3 — No match / new turtle:
1. Select a site → Instructions → "Identify" → DevModal → "No Match"
2. NoMatchPage → "Submit New Turtle" → NewTurtleSubmissionPage
3. Submit → ThankYouPage (previously went to instructions)

Test dev mock fallback:
- In MatchProfilePage, temporarily break the Airtable env var to confirm it shows mock turtle T106 instead of error screen.

**Step 10: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire match-encounter and thank-you pages into App.tsx navigation flow"
```

---

## Final Check

```bash
npx tsc --noEmit 2>&1
```

All pages render without console errors in browser dev tools.
