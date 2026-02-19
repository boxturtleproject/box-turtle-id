# Site Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add site selection to the Welcome page so users choose between Patuxent Research Refuge (Maryland) and Wallkill Valley Land Trust (New York) before proceeding, with the site name displayed in the header of all subsequent pages.

**Architecture:** Four tasks in sequence. First update App.tsx to add the `Site` type and thread `siteName` as a prop to all pages. Then update WelcomePage to replace the "Get Started" button with two site cards. Then add the site name label to InstructionPage, PossibleMatchPage, and MatchProfilePage headers. Each task is a focused change to one or two files.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS

---

### Task 1: Add Site type and state to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Read the current App.tsx**

File: `src/App.tsx`

Current content (for reference):
```tsx
// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';
import { PossibleMatchPage, type CandidateTurtle } from './pages/PossibleMatchPage';

type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match';

const DEMO_CANDIDATES: CandidateTurtle[] = [
  { turtleNickname: 'T106', confidence: 'high' },
  { turtleNickname: 'T107', confidence: 'medium' },
  { turtleNickname: 'T108', confidence: 'low' },
];

function App() {
  const [page, setPage] = useState<Page>('welcome');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  // ...
}
```

**Step 2: Replace App.tsx with updated version**

```tsx
// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';
import { PossibleMatchPage, type CandidateTurtle } from './pages/PossibleMatchPage';

type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match';

export type Site = 'patuxent' | 'wallkill';

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent Research Refuge',
  wallkill: 'Wallkill Valley Land Trust',
};

// Hardcoded candidates for demo — replace with algorithm output when ready
const DEMO_CANDIDATES: CandidateTurtle[] = [
  { turtleNickname: 'T106', confidence: 'high' },
  { turtleNickname: 'T107', confidence: 'medium' },
  { turtleNickname: 'T108', confidence: 'low' },
];

function App() {
  const [page, setPage] = useState<Page>('welcome');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const siteName = selectedSite ? SITE_NAMES[selectedSite] : '';

  if (page === 'match') {
    return (
      <MatchProfilePage
        onBack={() => setPage('instructions')}
        onNotMyTurtle={() => setPage('instructions')}
        mode="confirmed"
        siteName={siteName}
      />
    );
  }

  if (page === 'possible-match') {
    if (selectedCandidate) {
      return (
        <MatchProfilePage
          turtleNickname={selectedCandidate}
          onBack={() => setSelectedCandidate(null)}
          onNotMyTurtle={() => { setSelectedCandidate(null); }}
          mode="review"
          siteName={siteName}
        />
      );
    }
    return (
      <PossibleMatchPage
        candidates={DEMO_CANDIDATES}
        onBack={() => setPage('instructions')}
        onSelectCandidate={(nickname) => setSelectedCandidate(nickname)}
        onNoMatch={() => setPage('no-match')}
        siteName={siteName}
      />
    );
  }

  if (page === 'instructions') {
    return (
      <InstructionPage
        onBack={() => setPage('welcome')}
        onIdentify={() => setPage('possible-match')}
        siteName={siteName}
      />
    );
  }

  return (
    <WelcomePage
      onSelectSite={(site) => {
        setSelectedSite(site);
        setPage('instructions');
      }}
    />
  );
}

export default App;
```

**Step 3: Verify build compiles**

Run: `npm run build`
Expected: TypeScript errors on `siteName` prop — that's expected and will be fixed in subsequent tasks.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Site type and selectedSite state to App"
```

---

### Task 2: Update WelcomePage with site selection cards

**Files:**
- Modify: `src/pages/WelcomePage.tsx`

**Step 1: Replace WelcomePage.tsx with updated version**

```tsx
// src/pages/WelcomePage.tsx
import { useState } from 'react';
import type { Site } from '../App';

interface WelcomePageProps {
  onSelectSite: (site: Site) => void;
}

interface SiteCardProps {
  site: Site;
  name: string;
  location: string;
  onSelect: () => void;
}

function SiteCard({ name, location, onSelect }: SiteCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      className="w-full text-left"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div
        style={{
          backgroundColor: hovered ? '#142b19' : '#0f2414',
          border: '1px solid #1e3a24',
          overflow: 'hidden',
          transition: 'background-color 0.2s',
        }}
      >
        {/* Placeholder map image */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#0a1a0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #1e3a24',
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#2a4030',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Map coming soon
          </span>
        </div>

        {/* Card body */}
        <div style={{ padding: '1rem' }} className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              color: '#f0ede6',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#a8c5ae',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            {location}
          </span>
        </div>
      </div>
    </button>
  );
}

export function WelcomePage({ onSelectSite }: WelcomePageProps) {
  return (
    <div
      className="flex flex-col w-full px-8 py-16 gap-10"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Title */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1
          className="text-5xl font-bold"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            letterSpacing: '0.12em',
          }}
        >
          Box Turtle ID
        </h1>
        <p
          className="text-xs uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
            letterSpacing: '0.3em',
          }}
        >
          Select your research site to get started
        </p>
      </div>

      {/* Site cards */}
      <div className="flex flex-col gap-4">
        <SiteCard
          site="patuxent"
          name="Patuxent Research Refuge"
          location="Maryland"
          onSelect={() => onSelectSite('patuxent')}
        />
        <SiteCard
          site="wallkill"
          name="Wallkill Valley Land Trust"
          location="New York"
          onSelect={() => onSelectSite('wallkill')}
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Still TypeScript errors on `siteName` prop for other pages — that's fine, will be fixed in Task 3.

**Step 3: Commit**

```bash
git add src/pages/WelcomePage.tsx
git commit -m "feat: replace Get Started button with site selection cards on WelcomePage"
```

---

### Task 3: Add siteName prop to InstructionPage and PossibleMatchPage

**Files:**
- Modify: `src/pages/InstructionPage.tsx`
- Modify: `src/pages/PossibleMatchPage.tsx`

**Step 1: Update InstructionPage**

In `src/pages/InstructionPage.tsx`:

Add `siteName: string` to `InstructionPageProps`:
```tsx
interface InstructionPageProps {
  onBack: () => void;
  onIdentify: () => void;
  siteName: string;
}
```

Update the function signature:
```tsx
export function InstructionPage({ onBack, onIdentify, siteName }: InstructionPageProps) {
```

Update the header section — replace the current `{/* Header */}` block with:
```tsx
{/* Header */}
<div className="flex flex-col gap-1">
  <button
    type="button"
    onClick={onBack}
    style={{ color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
    aria-label="Go back"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M13 4L7 10l6 6" stroke="#6b8f71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
  {siteName && (
    <p
      style={{
        fontFamily: "'DM Mono', monospace",
        color: '#a8c5ae',
        fontSize: '0.6rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
      }}
    >
      {siteName}
    </p>
  )}
  <h1
    style={{
      fontFamily: "'Playfair Display', serif",
      color: '#f0ede6',
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
    }}
  >
    How to Photograph Your Turtle
  </h1>
</div>
```

Note: The current InstructionPage header uses `flex items-center gap-4` with the back arrow and title side by side. Replace that entire `{/* Header */}` div (lines 170–193 in the current file) with the vertical layout above.

**Step 2: Update PossibleMatchPage**

In `src/pages/PossibleMatchPage.tsx`:

Add `siteName: string` to `PossibleMatchPageProps`:
```tsx
interface PossibleMatchPageProps {
  candidates: CandidateTurtle[];
  onBack: () => void;
  onSelectCandidate: (turtleNickname: string) => void;
  onNoMatch: () => void;
  siteName: string;
}
```

Update the function signature:
```tsx
export function PossibleMatchPage({
  candidates,
  onBack,
  onSelectCandidate,
  onNoMatch,
  siteName,
}: PossibleMatchPageProps) {
```

Update the header section — replace the existing `{/* Header */}` div with:
```tsx
{/* Header */}
<div className="flex flex-col gap-1">
  <button
    type="button"
    onClick={onBack}
    style={{ color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
    aria-label="Go back"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M13 4L7 10l6 6" stroke="#6b8f71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
  {siteName && (
    <p
      style={{
        fontFamily: "'DM Mono', monospace",
        color: '#a8c5ae',
        fontSize: '0.6rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
      }}
    >
      {siteName}
    </p>
  )}
  <p
    style={{
      fontFamily: "'DM Mono', monospace",
      color: '#6b8f71',
      fontSize: '0.7rem',
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
    }}
  >
    Possible matches
  </p>
  <p
    style={{
      fontFamily: "'DM Mono', monospace",
      color: '#a8c5ae',
      fontSize: '0.8rem',
      letterSpacing: '0.05em',
    }}
  >
    We found some turtles that might be yours
  </p>
</div>
```

**Step 3: Verify build compiles**

Run: `npm run build`
Expected: One remaining TypeScript error for `siteName` on MatchProfilePage — fixed in Task 4.

**Step 4: Commit**

```bash
git add src/pages/InstructionPage.tsx src/pages/PossibleMatchPage.tsx
git commit -m "feat: add siteName prop to InstructionPage and PossibleMatchPage headers"
```

---

### Task 4: Add siteName prop to MatchProfilePage

**Files:**
- Modify: `src/pages/MatchProfilePage.tsx`

**Step 1: Add `siteName` to MatchProfilePageProps**

```tsx
interface MatchProfilePageProps {
  onBack: () => void;
  onNotMyTurtle: () => void;
  turtleNickname?: string;
  mode?: 'confirmed' | 'review';
  siteName?: string;
}
```

(`siteName` is optional here since MatchProfilePage can technically be used standalone)

**Step 2: Add `siteName` to the function signature**

```tsx
export function MatchProfilePage({
  onBack,
  onNotMyTurtle,
  turtleNickname = DEFAULT_TURTLE_ID,
  mode = 'confirmed',
  siteName = '',
}: MatchProfilePageProps) {
```

**Step 3: Update the header section in the loaded state**

Find the `{/* Header */}` block (the one inside the loaded return, after the loading/error guards). It currently looks like:

```tsx
{/* Header */}
<div className="flex flex-col gap-2">
  <button
    type="button"
    onClick={onBack}
    ...back arrow SVG...
  </button>
  <p ...>We found your turtle</p>
  <h1 ...>{turtle.nickname}</h1>
</div>
```

Add the site name label between the back arrow and the "We found your turtle" label:

```tsx
{/* Header */}
<div className="flex flex-col gap-2">
  <button
    type="button"
    onClick={onBack}
    style={{ color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
    aria-label="Go back"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M13 4L7 10l6 6" stroke="#6b8f71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
  {siteName && (
    <p
      style={{
        fontFamily: "'DM Mono', monospace",
        color: '#a8c5ae',
        fontSize: '0.6rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
      }}
    >
      {siteName}
    </p>
  )}
  <p
    style={{
      fontFamily: "'DM Mono', monospace",
      color: '#6b8f71',
      fontSize: '0.7rem',
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
    }}
  >
    We found your turtle
  </p>
  <h1
    style={{
      fontFamily: "'Playfair Display', serif",
      color: '#f0ede6',
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      lineHeight: 1.1,
    }}
  >
    {turtle.nickname}
  </h1>
</div>
```

**Step 4: Verify build compiles with zero errors**

Run: `npm run build`
Expected: Clean build, no TypeScript errors, 37 modules transformed.

**Step 5: Verify full flow in browser**

Run: `npm run dev`

Check:
- Welcome page shows two site cards (Patuxent / Wallkill) with placeholder map images
- Tapping a card immediately advances to InstructionPage with site name in header
- InstructionPage header shows: back arrow → site name (muted, small) → "How to Photograph Your Turtle"
- Submitting photos → PossibleMatchPage shows site name in header
- Selecting a candidate → MatchProfilePage shows site name in header
- Back navigation works correctly throughout

**Step 6: Commit**

```bash
git add src/pages/MatchProfilePage.tsx
git commit -m "feat: add siteName prop to MatchProfilePage header"
```
