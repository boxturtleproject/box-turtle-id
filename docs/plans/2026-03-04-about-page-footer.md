# About Page & Footer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent footer with About and Contact links to every page, create an About page with project copy, and add a descriptive blurb with "Learn more here" link to the WelcomePage.

**Architecture:** Footer is a shared component added to the bottom of all pages. App.tsx gains an `'about'` page state and a `returnPage` state so the back button on AboutPage returns the user to wherever they came from. All pages receive an `onAbout` callback that triggers the navigation.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS (utility classes only), CSS custom properties for theming.

---

### Task 1: Create git worktree

**Files:**
- No file changes — git setup only

**Step 1: Create worktree and branch**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID"
git worktree add .claude/worktrees/about-footer -b feature/about-footer
```

**Step 2: Verify**

```bash
git worktree list
```
Expected: new entry for `.claude/worktrees/about-footer` on `feature/about-footer`.

All subsequent work is done inside `.claude/worktrees/about-footer`.

---

### Task 2: Create Footer component

**Files:**
- Create: `src/components/Footer.tsx`

**Step 1: Create the file**

```tsx
// src/components/Footer.tsx

interface FooterProps {
  onAbout: () => void;
}

export function Footer({ onAbout }: FooterProps) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={onAbout}
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        About
      </button>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        Contact
      </span>
    </div>
  );
}
```

**Step 2: Verify build passes**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID/.claude/worktrees/about-footer"
npm run build
```
Expected: `✓ built in` — no TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "feat: add Footer component with About and Contact links"
```

---

### Task 3: Create AboutPage

**Files:**
- Create: `src/pages/AboutPage.tsx`

**Step 1: Create the file**

```tsx
// src/pages/AboutPage.tsx

interface AboutPageProps {
  onBack: () => void;
}

const paraStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-muted)',
  fontSize: '0.875rem',
  lineHeight: 1.7,
  letterSpacing: '0.03em',
  margin: 0,
};

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-16 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          style={{
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M13 4L7 10l6 6"
              stroke="var(--color-text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          About
        </h1>
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-6">
        <p style={paraStyle}>
          Box Turtle ID is an experimental project to build local awareness and strengthen citizen
          engagement with box turtle conservation within their community. The platform takes advantage
          of the unusually wide array of shell patterns, limited range and extended life expectancy
          that characterize this species, making them ideal candidates for identification and tracking
          via image recognition technology.
        </p>
        <p style={paraStyle}>
          The underlying software was developed by Andy Royle, Ph.D., from the Patuxent Research
          Refuge as part of his statical research into local reptile populations. It is now in use
          across a growing number of sites by scientists, conservation organizations and communities
          to better support the study of isolated and threatened populations in increasingly
          fragmented natural environments. In the future, we hope that it will offer a more seamless
          platform for integrating citizen science with academic research to provide a more complete
          and timely picture of population health throughout the distributed range of these amazing
          and resilient creatures across the USA.
        </p>
        <p style={paraStyle}>
          Box turtles are a trafficked species, so care has been taken to ensure that any data
          collected through this platform is stored securely. The project sponsors request that you
          keep any data you collect on these unique creatures strictly confidential. Thank you.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in` — no errors.

**Step 3: Commit**

```bash
git add src/pages/AboutPage.tsx
git commit -m "feat: add AboutPage with project copy"
```

---

### Task 4: Wire About navigation in App.tsx + update WelcomePage

This task touches both files together to avoid a TypeScript build failure — updating WelcomePage's props interface requires App.tsx to pass the new prop simultaneously.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/WelcomePage.tsx`

**Step 1: Update `src/App.tsx`**

Make these changes:

1. Add import at the top:
```tsx
import { AboutPage } from './pages/AboutPage';
```

2. Extend the `Page` type (line 12):
```tsx
type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match' | 'new-turtle' | 'about';
```

3. Add `returnPage` state after existing state declarations:
```tsx
const [returnPage, setReturnPage] = useState<Page>('welcome');
```

4. Add a shared `onAbout` handler (add before the first `if (page === ...)` block):
```tsx
const handleAbout = () => {
  setReturnPage(page);
  setPage('about');
};
```

5. Add About page render — insert before the final `return` (WelcomePage render):
```tsx
if (page === 'about') {
  return <AboutPage onBack={() => setPage(returnPage)} />;
}
```

6. Update the WelcomePage render to pass `onAbout`:
```tsx
return (
  <WelcomePage
    onSelectSite={(site) => {
      setSelectedSite(site);
      setPage('instructions');
    }}
    onAbout={handleAbout}
  />
);
```

**Step 2: Update `src/pages/WelcomePage.tsx`**

1. Add `Footer` import at the top:
```tsx
import { Footer } from '../components/Footer';
```

2. Add `onAbout` to `WelcomePageProps`:
```tsx
interface WelcomePageProps {
  onSelectSite: (site: Site) => void;
  onAbout: () => void;
}
```

3. Destructure it in the function signature:
```tsx
export function WelcomePage({ onSelectSite, onAbout }: WelcomePageProps) {
```

4. Add blurb and Footer after the site cards `<div>`, before the closing outer `</div>`:
```tsx
{/* Blurb */}
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
  and conservation efforts.{' '}
  <button
    type="button"
    onClick={onAbout}
    style={{
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-secondary)',
      fontSize: '0.8rem',
      letterSpacing: '0.05em',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      textDecoration: 'underline',
    }}
  >
    Learn more here.
  </button>
</p>

{/* Footer */}
<Footer onAbout={onAbout} />
```

**Step 3: Verify build passes**

```bash
npm run build
```
Expected: `✓ built in` — no errors.

**Step 4: Commit**

```bash
git add src/App.tsx src/pages/WelcomePage.tsx
git commit -m "feat: wire About navigation and add blurb + footer to WelcomePage"
```

---

### Task 5: Add Footer to InstructionPage

**Files:**
- Modify: `src/pages/InstructionPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Update `src/pages/InstructionPage.tsx`**

1. Add import:
```tsx
import { Footer } from '../components/Footer';
```

2. Add `onAbout` to `InstructionPageProps`:
```tsx
interface InstructionPageProps {
  onBack: () => void;
  onIdentify: (photos: SubmittedPhotos) => void;
  siteName: string;
  site: Site;
  onAbout: () => void;
}
```

3. Destructure in function signature:
```tsx
export function InstructionPage({ onBack, onIdentify, siteName: _siteName, site, onAbout }: InstructionPageProps) {
```

4. Add `<Footer onAbout={onAbout} />` after the "Identify My Turtle" button, before the closing outer `</div>`.

**Step 2: Update `src/App.tsx` — pass `onAbout` to InstructionPage**

In the `if (page === 'instructions')` block, add `onAbout={handleAbout}` to `<InstructionPage>`.

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built in`.

**Step 4: Commit**

```bash
git add src/pages/InstructionPage.tsx src/App.tsx
git commit -m "feat: add footer to InstructionPage"
```

---

### Task 6: Add Footer to MatchProfilePage

**Files:**
- Modify: `src/pages/MatchProfilePage.tsx`
- Modify: `src/App.tsx`

**Step 1: Update `src/pages/MatchProfilePage.tsx`**

1. Add import:
```tsx
import { Footer } from '../components/Footer';
```

2. Add `onAbout` to `MatchProfilePageProps`:
```tsx
interface MatchProfilePageProps {
  onBack: () => void;
  onNotMyTurtle: () => void;
  turtleNickname?: string;
  mode?: 'confirmed' | 'review';
  siteName?: string;
  site: Site;
  onAbout: () => void;
}
```

3. Destructure in function signature (add `onAbout` alongside existing params).

4. Add `<Footer onAbout={onAbout} />` at the bottom of the main loaded render — after the `{submitted ? ... : ...}` block, before the closing outer `</div>`.

**Step 2: Update `src/App.tsx` — pass `onAbout` to both MatchProfilePage renders**

There are two places MatchProfilePage is rendered (one for `page === 'match'`, one inside `page === 'possible-match'`). Add `onAbout={handleAbout}` to both.

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built in`.

**Step 4: Commit**

```bash
git add src/pages/MatchProfilePage.tsx src/App.tsx
git commit -m "feat: add footer to MatchProfilePage"
```

---

### Task 7: Add Footer to PossibleMatchPage

**Files:**
- Modify: `src/pages/PossibleMatchPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Update `src/pages/PossibleMatchPage.tsx`**

1. Add import:
```tsx
import { Footer } from '../components/Footer';
```

2. Add `onAbout` to `PossibleMatchPageProps`:
```tsx
interface PossibleMatchPageProps {
  candidates: CandidateTurtle[];
  onBack: () => void;
  onSelectCandidate: (turtleNickname: string) => void;
  onNoMatch: () => void;
  siteName: string;
  site: Site;
  onAbout: () => void;
}
```

3. Destructure in function signature.

4. Add `<Footer onAbout={onAbout} />` after the "None of these are my turtle" button div, before the closing outer `</div>`.

**Step 2: Update `src/App.tsx`**

In the `page === 'possible-match'` block, add `onAbout={handleAbout}` to `<PossibleMatchPage>`.

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built in`.

**Step 4: Commit**

```bash
git add src/pages/PossibleMatchPage.tsx src/App.tsx
git commit -m "feat: add footer to PossibleMatchPage"
```

---

### Task 8: Add Footer to NoMatchPage

**Files:**
- Modify: `src/pages/NoMatchPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Update `src/pages/NoMatchPage.tsx`**

1. Add import:
```tsx
import { Footer } from '../components/Footer';
```

2. Add `onAbout` to `NoMatchPageProps`:
```tsx
interface NoMatchPageProps {
  onRetakePhotos: () => void;
  onSubmitNewTurtle: () => void;
  siteName: string;
  site: Site;
  onAbout: () => void;
}
```

3. Destructure in function signature.

4. Add `<Footer onAbout={onAbout} />` after the actions `<div>`, before the closing outer `</div>`.

**Step 2: Update `src/App.tsx`**

Add `onAbout={handleAbout}` to `<NoMatchPage>`.

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built in`.

**Step 4: Commit**

```bash
git add src/pages/NoMatchPage.tsx src/App.tsx
git commit -m "feat: add footer to NoMatchPage"
```

---

### Task 9: Add Footer to NewTurtleSubmissionPage

**Files:**
- Modify: `src/pages/NewTurtleSubmissionPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Update `src/pages/NewTurtleSubmissionPage.tsx`**

1. Add import:
```tsx
import { Footer } from '../components/Footer';
```

2. Add `onAbout` to `NewTurtleSubmissionPageProps`:
```tsx
interface NewTurtleSubmissionPageProps {
  photos: SubmittedPhotos | null;
  onBack: () => void;
  onSubmitted: () => void;
  siteName: string;
  site: Site;
  onAbout: () => void;
}
```

3. Destructure in function signature.

4. Add `<Footer onAbout={onAbout} />` after the Submit button, before the closing outer `</div>`.

**Step 2: Update `src/App.tsx`**

Add `onAbout={handleAbout}` to `<NewTurtleSubmissionPage>`.

**Step 3: Verify build**

```bash
npm run build
```
Expected: `✓ built in`.

**Step 4: Commit**

```bash
git add src/pages/NewTurtleSubmissionPage.tsx src/App.tsx
git commit -m "feat: add footer to NewTurtleSubmissionPage"
```

---

### Task 10: Final verification and finish branch

**Step 1: Full build verify**

```bash
cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID/.claude/worktrees/about-footer"
npm run build
```
Expected: `✓ built in` — clean.

**Step 2: Use finishing-a-development-branch skill**

Invoke `superpowers:finishing-a-development-branch` to merge, push PR, or clean up.
