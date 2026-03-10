# SiteBand Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the site name in the SiteBand tappable so users can navigate back to the WelcomePage to switch sites at any point in the flow.

**Architecture:** Add an optional `onWelcome` prop to SiteBand; render a styled button (visually identical to the current span in default state, subtle opacity on hover) when the prop is provided. Thread `onWelcome` from App.tsx through every page. Form pages (MatchEncounterPage, NewTurtleSubmissionPage) intercept the tap with a local leave-confirmation modal before calling through.

**Tech Stack:** React, TypeScript, inline styles (no Tailwind needed for this feature)

---

### Task 1: Update SiteBand to accept and handle `onWelcome`

**Files:**
- Modify: `src/components/SiteBand.tsx`

**Step 1: Replace the file with the updated version**

```tsx
// src/components/SiteBand.tsx
import { useState } from 'react';
import type { Site } from '../App';

const SITE_COLORS: Record<Site, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent Research Refuge',
  wallkill: 'Wallkill Valley Land Trust',
};

interface SiteBandProps {
  site: Site;
  onWelcome?: () => void;
}

export function SiteBand({ site, onWelcome }: SiteBandProps) {
  const [hovered, setHovered] = useState(false);

  const textStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    color: 'white',
    fontSize: '0.6rem',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    fontVariant: 'small-caps',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2.5rem',
        backgroundColor: SITE_COLORS[site],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      {onWelcome ? (
        <button
          type="button"
          onClick={onWelcome}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...textStyle,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            opacity: hovered ? 0.75 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          {SITE_NAMES[site]}
        </button>
      ) : (
        <span style={textStyle}>{SITE_NAMES[site]}</span>
      )}
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `npm run build` from the repo root.
Expected: `✓ built in` with no TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/SiteBand.tsx
git commit -m "feat: add onWelcome prop to SiteBand — renders interactive button with hover opacity"
```

---

### Task 2: Add `handleWelcome` to App.tsx and thread it to all pages

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add `handleWelcome` and pass `onWelcome` to every page**

Add this function in `App()` after `handleAbout`:

```ts
const handleWelcome = () => {
  setSelectedCandidate(null);
  setConfirmedTurtle(null);
  setPage('welcome');
};
```

Then add `onWelcome={handleWelcome}` to every page component that accepts a `site` prop (all pages except `WelcomePage` and `AboutPage`). Here is every call site that needs the addition:

```tsx
// page === 'match'
<MatchProfilePage
  ...
  onWelcome={handleWelcome}
/>

// page === 'possible-match', selectedCandidate branch
<MatchProfilePage
  ...
  onWelcome={handleWelcome}
/>

// page === 'possible-match', candidate list
<PossibleMatchPage
  ...
  onWelcome={handleWelcome}
/>

// page === 'new-turtle'
<NewTurtleSubmissionPage
  ...
  onWelcome={handleWelcome}
/>

// page === 'match-encounter'
<MatchEncounterPage
  ...
  onWelcome={handleWelcome}
/>

// page === 'thank-you'
<ThankYouPage
  ...
  onWelcome={handleWelcome}
/>

// page === 'no-match'
<NoMatchPage
  ...
  onWelcome={handleWelcome}
/>

// page === 'instructions'
<InstructionPage
  ...
  onWelcome={handleWelcome}
/>
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: TypeScript errors on every page that now receives `onWelcome` but doesn't declare it in its props interface — that's expected and will be fixed in Task 3.

Actually, TypeScript will error here since the pages don't accept `onWelcome` yet. **Do this step AFTER Task 3 instead.** Skip the build check for now.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add handleWelcome in App.tsx and pass onWelcome to all pages"
```

---

### Task 3: Add `onWelcome` prop to all non-form pages

Non-form pages: `InstructionPage`, `MatchProfilePage`, `PossibleMatchPage`, `NoMatchPage`, `ThankYouPage`.

Each page needs the same two changes:
1. Add `onWelcome: () => void` to the props interface
2. Pass `onWelcome={onWelcome}` to `<SiteBand>`

**Files:**
- Modify: `src/pages/InstructionPage.tsx`
- Modify: `src/pages/MatchProfilePage.tsx`
- Modify: `src/pages/PossibleMatchPage.tsx`
- Modify: `src/pages/NoMatchPage.tsx`
- Modify: `src/pages/ThankYouPage.tsx`

**Step 1: InstructionPage — add prop and thread to SiteBand**

Find the props interface (look for `InstructionPageProps`) and add:
```ts
onWelcome: () => void;
```

Find the destructure at the top of the function and add `onWelcome`.

Find `<SiteBand site={site} />` and change to:
```tsx
<SiteBand site={site} onWelcome={onWelcome} />
```

**Step 2: MatchProfilePage — add prop and thread to SiteBand**

Same pattern: add `onWelcome: () => void` to `MatchProfilePageProps`, destructure it, and pass to `<SiteBand site={site} onWelcome={onWelcome} />`.

**Step 3: PossibleMatchPage — add prop and thread to SiteBand**

Same pattern.

**Step 4: NoMatchPage — add prop and thread to SiteBand**

Same pattern.

**Step 5: ThankYouPage — add prop and thread to SiteBand**

Same pattern.

**Step 6: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` — all TypeScript errors resolved.

**Step 7: Commit**

```bash
git add src/pages/InstructionPage.tsx src/pages/MatchProfilePage.tsx src/pages/PossibleMatchPage.tsx src/pages/NoMatchPage.tsx src/pages/ThankYouPage.tsx
git commit -m "feat: thread onWelcome prop through non-form pages to SiteBand"
```

---

### Task 4: Add leave-confirmation modal to MatchEncounterPage

**Files:**
- Modify: `src/pages/MatchEncounterPage.tsx`

**Step 1: Add `onWelcome` prop and `showLeaveConfirm` state**

Add to `MatchEncounterPageProps`:
```ts
onWelcome: () => void;
```

Add to the destructure and add local state:
```ts
const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
```

**Step 2: Pass intercept handler to SiteBand**

Change `<SiteBand site={site} />` to:
```tsx
<SiteBand site={site} onWelcome={() => setShowLeaveConfirm(true)} />
```

**Step 3: Add the leave-confirmation modal JSX**

Add this just before the closing `</div>` of the page wrapper:

```tsx
{/* Leave confirmation modal */}
{showLeaveConfirm && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '2rem',
    }}
  >
    <div
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-border)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '20rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Switch sites?
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem',
            letterSpacing: '0.03em',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Your progress will be lost.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onWelcome}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            border: 'none',
            padding: '1rem',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Switch Sites
        </button>
        <button
          type="button"
          onClick={() => setShowLeaveConfirm(false)}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            padding: '1rem',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no errors.

**Step 5: Commit**

```bash
git add src/pages/MatchEncounterPage.tsx
git commit -m "feat: add leave-confirmation modal to MatchEncounterPage on SiteBand tap"
```

---

### Task 5: Add leave-confirmation modal to NewTurtleSubmissionPage

**Files:**
- Modify: `src/pages/NewTurtleSubmissionPage.tsx`

**Step 1: Add `onWelcome` prop and `showLeaveConfirm` state**

Add to `NewTurtleSubmissionPageProps`:
```ts
onWelcome: () => void;
```

Add to the destructure. Add local state:
```ts
const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
```

**Step 2: Pass intercept handler to SiteBand**

Change `<SiteBand site={site} />` to:
```tsx
<SiteBand site={site} onWelcome={() => setShowLeaveConfirm(true)} />
```

**Step 3: Add the leave-confirmation modal JSX**

Use the exact same modal JSX from Task 4 (copy verbatim), placed just before the closing `</div>` of the page wrapper.

**Step 4: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no errors.

**Step 5: Commit**

```bash
git add src/pages/NewTurtleSubmissionPage.tsx
git commit -m "feat: add leave-confirmation modal to NewTurtleSubmissionPage on SiteBand tap"
```

---

### Task 6: Verify end-to-end in browser

Start the dev server (`npm run dev`). Manually check each scenario:

1. **InstructionPage** → tap site band → lands on WelcomePage ✓
2. **MatchProfilePage** → tap site band → lands on WelcomePage ✓
3. **PossibleMatchPage** → tap site band → lands on WelcomePage ✓
4. **NoMatchPage** → tap site band → lands on WelcomePage ✓
5. **ThankYouPage** → tap site band → lands on WelcomePage ✓
6. **MatchEncounterPage** → tap site band → modal appears → Cancel → stays on page ✓
7. **MatchEncounterPage** → tap site band → modal appears → Switch Sites → lands on WelcomePage ✓
8. **NewTurtleSubmissionPage** → tap site band → modal appears → Cancel → stays on page ✓
9. **NewTurtleSubmissionPage** → tap site band → modal appears → Switch Sites → lands on WelcomePage ✓
10. **Hover check** (desktop): hovering site band shows cursor:pointer and slight opacity reduction ✓
