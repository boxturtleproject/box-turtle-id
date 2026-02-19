# Possible Match Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build PossibleMatchPage showing up to 3 candidate turtles with confidence badges, and update MatchProfilePage to support a `review` mode where the user can submit a sighting for site director approval.

**Architecture:** Three tasks in sequence. First add `review` mode to the existing MatchProfilePage (minimal prop addition). Then build PossibleMatchPage as a new component that fetches turtle data for each candidate and renders cards. Finally wire both into App.tsx navigation under a new `possible-match` page state. Candidates are hardcoded in App.tsx for now (same pattern as hardcoded T106) until the matching algorithm is connected.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Airtable REST API (existing service layer)

---

### Task 1: Add `mode` prop to MatchProfilePage

**Files:**
- Modify: `src/pages/MatchProfilePage.tsx`

**Step 1: Add `mode` prop to the interface and default it to `'confirmed'`**

In `MatchProfilePage.tsx`, update `MatchProfilePageProps`:

```tsx
interface MatchProfilePageProps {
  onBack: () => void;
  onNotMyTurtle: () => void;
  turtleNickname?: string;
  mode?: 'confirmed' | 'review';
}
```

Update the function signature:

```tsx
export function MatchProfilePage({
  onBack,
  onNotMyTurtle,
  turtleNickname = DEFAULT_TURTLE_ID,
  mode = 'confirmed',
}: MatchProfilePageProps) {
```

**Step 2: Add `submitted` state for review mode**

Add this alongside the existing state declarations:

```tsx
const [submitted, setSubmitted] = useState(false);
```

**Step 3: Replace the "Action buttons" section**

Find the `{/* Action buttons */}` block and replace it with:

```tsx
{/* Action buttons */}
<div className="flex flex-col gap-3 mb-8">
  {mode === 'review' ? (
    submitted ? (
      /* Post-submission: confirmation + email signup */
      <div className="flex flex-col gap-3">
        <p style={{
          fontFamily: "'DM Mono', monospace",
          color: '#6b8f71',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          ✓ Submitted for review. We'll be in touch.
        </p>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          color: '#a8c5ae',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
        }}>
          Sign up for updates when this turtle is confirmed
        </p>
        {emailSubmitted ? (
          <p style={{
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            ✓ You're signed up for updates
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#0f2414',
                border: '1px solid #3a5c40',
                color: '#f0ede6',
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
                outline: 'none',
              }}
            />
            <button
              type="button"
              className="w-full py-3 text-sm uppercase border transition-all duration-300"
              style={{
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.2em',
                color: '#6b8f71',
                borderColor: '#6b8f71',
                backgroundColor: 'transparent',
              }}
              onClick={() => { if (email) setEmailSubmitted(true); }}
            >
              Notify Me of Future Sightings
            </button>
          </>
        )}
      </div>
    ) : (
      /* Pre-submission: Submit for Review button */
      <button
        type="button"
        className="w-full py-4 text-sm uppercase transition-all duration-300"
        style={{
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.2em',
          color: '#0a1a0e',
          backgroundColor: confirmHovered ? '#8aab90' : '#6b8f71',
          border: 'none',
        }}
        onMouseEnter={() => setConfirmHovered(true)}
        onMouseLeave={() => setConfirmHovered(false)}
        onClick={() => {
          // TODO: send submission to Airtable / site director
          setSubmitted(true);
        }}
      >
        Submit for Review
      </button>
    )
  ) : (
    /* Confirmed mode: original buttons */
    <>
      <button
        type="button"
        className="w-full py-4 text-sm uppercase transition-all duration-300"
        style={{
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.2em',
          color: '#0a1a0e',
          backgroundColor: confirmHovered ? '#8aab90' : '#6b8f71',
          border: 'none',
        }}
        onMouseEnter={() => setConfirmHovered(true)}
        onMouseLeave={() => setConfirmHovered(false)}
        onClick={() => {
          console.log('Confirmed turtle:', turtle.nickname);
        }}
      >
        This Is My Turtle
      </button>
      <button
        type="button"
        className="w-full py-4 text-sm uppercase border transition-all duration-300"
        style={{
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.2em',
          color: notMyTurtleHovered ? '#0a1a0e' : '#6b8f71',
          borderColor: '#6b8f71',
          backgroundColor: notMyTurtleHovered ? '#6b8f71' : 'transparent',
        }}
        onMouseEnter={() => setNotMyTurtleHovered(true)}
        onMouseLeave={() => setNotMyTurtleHovered(false)}
        onClick={onNotMyTurtle}
      >
        Not My Turtle
      </button>
    </>
  )}
</div>
```

**Step 4: Also remove the existing email signup block from the loaded state**

In `review` mode the email signup only appears post-submission (inside the action buttons block above), so the standalone email signup section should only render in `confirmed` mode. Wrap the existing `{/* Email signup */}` block:

```tsx
{/* Email signup — confirmed mode only */}
{mode === 'confirmed' && (
  <div className="flex flex-col gap-3">
    {/* ...existing email signup JSX unchanged... */}
  </div>
)}
```

**Step 5: Verify the build compiles**

Run: `npm run build`
Expected: No TypeScript errors.

**Step 6: Commit**

```bash
git add src/pages/MatchProfilePage.tsx
git commit -m "feat: add review mode to MatchProfilePage"
```

---

### Task 2: Create PossibleMatchPage

**Files:**
- Create: `src/pages/PossibleMatchPage.tsx`

**Step 1: Create the component**

```tsx
// src/pages/PossibleMatchPage.tsx
import { useEffect, useState } from 'react';
import { fetchTurtleByNickname, type TurtleRecord } from '../services/airtable';

export type Confidence = 'high' | 'medium' | 'low';

export interface CandidateTurtle {
  turtleNickname: string;
  confidence: Confidence;
}

interface PossibleMatchPageProps {
  candidates: CandidateTurtle[];
  onBack: () => void;
  onSelectCandidate: (turtleNickname: string) => void;
  onNoMatch: () => void;
}

type CardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; turtle: TurtleRecord };

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  high: '#6b8f71',
  medium: '#c8a84b',
  low: '#a8c5ae',
};

function CandidateCard({
  candidate,
  onSelect,
}: {
  candidate: CandidateTurtle;
  onSelect: () => void;
}) {
  const [cardState, setCardState] = useState<CardState>({ status: 'loading' });
  const [selectHovered, setSelectHovered] = useState(false);

  useEffect(() => {
    fetchTurtleByNickname(candidate.turtleNickname)
      .then(turtle => {
        if (turtle) setCardState({ status: 'loaded', turtle });
        else setCardState({ status: 'error' });
      })
      .catch(() => setCardState({ status: 'error' }));
  }, [candidate.turtleNickname]);

  const badgeColor = CONFIDENCE_COLORS[candidate.confidence];
  const badgeLabel = candidate.confidence.charAt(0).toUpperCase() + candidate.confidence.slice(1);

  return (
    <div
      style={{
        backgroundColor: '#0f2414',
        border: '1px solid #1e3a24',
        overflow: 'hidden',
      }}
    >
      {/* Photo */}
      {cardState.status === 'loading' && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#0a1a0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
            Loading...
          </span>
        </div>
      )}
      {cardState.status === 'error' && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#0a1a0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: "'DM Mono', monospace", color: '#a8c5ae', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
            Photo unavailable
          </span>
        </div>
      )}
      {cardState.status === 'loaded' && cardState.turtle.carapaceTop[0] && (
        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          <img
            src={cardState.turtle.carapaceTop[0].url}
            alt={`${candidate.turtleNickname} carapace top`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-col gap-3" style={{ padding: '1rem' }}>
        {/* Nickname + badge */}
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              color: '#f0ede6',
              fontSize: '1.4rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {candidate.turtleNickname}
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              color: badgeColor,
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              border: `1px solid ${badgeColor}`,
              padding: '0.2rem 0.5rem',
            }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onSelect}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: "'DM Mono', monospace",
            color: '#6b8f71',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          View Full Profile →
        </button>

        <button
          type="button"
          className="w-full py-3 text-sm uppercase border transition-all duration-300"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.2em',
            color: selectHovered ? '#0a1a0e' : '#6b8f71',
            borderColor: '#6b8f71',
            backgroundColor: selectHovered ? '#6b8f71' : 'transparent',
          }}
          onMouseEnter={() => setSelectHovered(true)}
          onMouseLeave={() => setSelectHovered(false)}
          onClick={onSelect}
        >
          This Is My Turtle
        </button>
      </div>
    </div>
  );
}

export function PossibleMatchPage({
  candidates,
  onBack,
  onSelectCandidate,
  onNoMatch,
}: PossibleMatchPageProps) {
  const [noMatchHovered, setNoMatchHovered] = useState(false);

  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-6"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
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

      {/* Candidate cards */}
      <div className="flex flex-col gap-4">
        {candidates.map(candidate => (
          <CandidateCard
            key={candidate.turtleNickname}
            candidate={candidate}
            onSelect={() => onSelectCandidate(candidate.turtleNickname)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 mb-8">
        <button
          type="button"
          className="w-full py-4 text-sm uppercase border transition-all duration-300"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.2em',
            color: noMatchHovered ? '#0a1a0e' : '#6b8f71',
            borderColor: '#6b8f71',
            backgroundColor: noMatchHovered ? '#6b8f71' : 'transparent',
          }}
          onMouseEnter={() => setNoMatchHovered(true)}
          onMouseLeave={() => setNoMatchHovered(false)}
          onClick={onNoMatch}
        >
          None of these are my turtle
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify the build compiles**

Run: `npm run build`
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add src/pages/PossibleMatchPage.tsx
git commit -m "feat: add PossibleMatchPage component"
```

---

### Task 3: Wire PossibleMatchPage into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace App.tsx with the updated version**

```tsx
// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';
import { PossibleMatchPage, type CandidateTurtle } from './pages/PossibleMatchPage';

type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match';

// Hardcoded candidates for demo — replace with algorithm output when ready
const DEMO_CANDIDATES: CandidateTurtle[] = [
  { turtleNickname: 'T106', confidence: 'high' },
  { turtleNickname: 'T107', confidence: 'medium' },
  { turtleNickname: 'T108', confidence: 'low' },
];

function App() {
  const [page, setPage] = useState<Page>('welcome');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  if (page === 'match') {
    return (
      <MatchProfilePage
        onBack={() => setPage('instructions')}
        onNotMyTurtle={() => setPage('instructions')}
        mode="confirmed"
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
        />
      );
    }
    return (
      <PossibleMatchPage
        candidates={DEMO_CANDIDATES}
        onBack={() => setPage('instructions')}
        onSelectCandidate={(nickname) => setSelectedCandidate(nickname)}
        onNoMatch={() => setPage('no-match')}
      />
    );
  }

  if (page === 'instructions') {
    return (
      <InstructionPage
        onBack={() => setPage('welcome')}
        onIdentify={() => setPage('possible-match')}
      />
    );
  }

  return <WelcomePage onGetStarted={() => setPage('instructions')} />;
}

export default App;
```

Note: `onIdentify` now routes to `possible-match` for demo purposes. Swap back to `match` when the algorithm is connected and can return a confidence level.

**Step 2: Verify full flow in browser**

Run: `npm run dev`

Check the following flow:
- Welcome → Get Started → InstructionPage
- Upload top photo → click "Identify My Turtle" → PossibleMatchPage with 3 cards
- Each card loads its photo and shows confidence badge
- "View Full Profile →" or "This Is My Turtle" → MatchProfilePage in review mode
- "Submit for Review" → inline confirmation + email signup appears
- Back arrow on MatchProfilePage → returns to candidate list
- "None of these are my turtle" → routes to `no-match` (blank for now, will be NoMatchPage)

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire PossibleMatchPage into app navigation"
```
