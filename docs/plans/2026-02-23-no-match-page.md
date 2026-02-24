# No Match Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a two-screen No Match flow — a result screen that orients the user and a submission form to report a potentially new turtle.

**Architecture:** Two new page components (`NoMatchPage`, `NewTurtleSubmissionPage`) wired into App.tsx alongside a small change to lift photo state out of InstructionPage so photos can be displayed on the submission screen. All form submission logs to console for now; Airtable wiring is deferred.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, CSS custom properties (var(--color-*), var(--font-*))

---

### Task 1: Define SubmittedPhotos type and lift photo state out of InstructionPage

The photos taken on InstructionPage need to be available on the submission form. Currently they live as local state inside InstructionPage. We'll pass them out via the `onIdentify` callback.

**Files:**
- Modify: `src/pages/InstructionPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Add SubmittedPhotos type to InstructionPage and update onIdentify signature**

In `src/pages/InstructionPage.tsx`, add this type and update the props interface:

```tsx
export interface SubmittedPhotos {
  top: File;
  left: File | null;
  right: File | null;
}

interface InstructionPageProps {
  onBack: () => void;
  onIdentify: (photos: SubmittedPhotos) => void;  // was: () => void
  siteName: string;
}
```

Then update the onClick handler for the Identify button (near bottom of file):

```tsx
onClick={() => {
  if (!identifyEnabled || !topImage) return;
  onIdentify({ top: topImage, left: leftImage, right: rightImage });
}}
```

**Step 2: Type-check to verify the change compiles**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run build 2>&1 | head -30`

Expected: TypeScript error about `onIdentify` callers in `App.tsx` not passing photos yet. That's expected — we'll fix it next.

**Step 3: Update App.tsx to accept and store photos**

In `src/App.tsx`:

1. Import the new type at the top:
```tsx
import { InstructionPage } from './pages/InstructionPage';
import type { SubmittedPhotos } from './pages/InstructionPage';
```

2. Add photos state alongside existing state:
```tsx
const [submittedPhotos, setSubmittedPhotos] = useState<SubmittedPhotos | null>(null);
```

3. Update the `onIdentify` call inside the instructions block:
```tsx
onIdentify={(photos) => {
  setSubmittedPhotos(photos);
  if (import.meta.env.DEV) {
    setShowDevModal(true);
  } else {
    setPage('possible-match');
  }
}}
```

**Step 4: Type-check**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run build 2>&1 | head -30`

Expected: Clean build (no TypeScript errors).

**Step 5: Commit**

```bash
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" add src/pages/InstructionPage.tsx src/App.tsx
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" commit -m "refactor: lift photo state out of InstructionPage via onIdentify callback"
```

---

### Task 2: Create NoMatchPage (Screen 1)

**Files:**
- Create: `src/pages/NoMatchPage.tsx`

**Step 1: Create the component**

```tsx
// src/pages/NoMatchPage.tsx

interface NoMatchPageProps {
  onRetakePhotos: () => void;
  onSubmitNewTurtle: () => void;
  siteName: string;
}

export function NoMatchPage({ onRetakePhotos, onSubmitNewTurtle, siteName }: NoMatchPageProps) {
  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onRetakePhotos}
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
          {siteName}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Main content */}
      <div className="flex flex-col gap-6">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            margin: 0,
          }}
        >
          No Match Found
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          This turtle doesn't appear to be in our database. It may be a new individual that hasn't been documented yet.
        </p>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div className="flex flex-col gap-4 mb-8">
        <button
          type="button"
          onClick={onSubmitNewTurtle}
          className="w-full py-4 text-xs uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.25em',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Submit as New Turtle
        </button>
        <button
          type="button"
          onClick={onRetakePhotos}
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '0.5rem 0',
          }}
        >
          Retake Photos
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run build 2>&1 | head -30`

Expected: Clean build.

**Step 3: Wire NoMatchPage into App.tsx**

In `src/App.tsx`:

1. Import the component:
```tsx
import { NoMatchPage } from './pages/NoMatchPage';
```

2. Add `'new-turtle'` to the Page type:
```tsx
type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match' | 'new-turtle';
```

3. Add the no-match render block (before the instructions block):
```tsx
if (page === 'no-match') {
  return (
    <NoMatchPage
      onRetakePhotos={() => setPage('instructions')}
      onSubmitNewTurtle={() => setPage('new-turtle')}
      siteName={siteName}
    />
  );
}
```

**Step 4: Type-check**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run build 2>&1 | head -30`

Expected: Clean build.

**Step 5: Commit**

```bash
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" add src/pages/NoMatchPage.tsx src/App.tsx
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" commit -m "feat: add NoMatchPage (screen 1 of no-match flow)"
```

---

### Task 3: Create NewTurtleSubmissionPage (Screen 2)

**Files:**
- Create: `src/pages/NewTurtleSubmissionPage.tsx`

**Step 1: Create the component**

```tsx
// src/pages/NewTurtleSubmissionPage.tsx
import { useState } from 'react';
import type { SubmittedPhotos } from './InstructionPage';

const BEHAVIORS = [
  'Basking',
  'Foraging',
  'Crossing road',
  'Nesting',
  'Mating',
  'Other',
] as const;

const HEALTH_OPTIONS = [
  'Healthy',
  'Injured',
  'Lethargic',
  'Shell damage',
  'Unknown',
] as const;

interface NewTurtleSubmissionPageProps {
  photos: SubmittedPhotos | null;
  onBack: () => void;
  onSubmitted: () => void;
  siteName: string;
}

function PhotoThumbnail({ file, label }: { file: File | null; label: string }) {
  if (!file) return null;
  const url = URL.createObjectURL(file);
  return (
    <div className="flex flex-col gap-1">
      <img
        src={url}
        alt={label}
        style={{
          width: '100%',
          aspectRatio: '4/3',
          objectFit: 'cover',
          border: '1px solid var(--color-border)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border-input)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

export function NewTurtleSubmissionPage({ photos, onBack, onSubmitted, siteName }: NewTurtleSubmissionPageProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState('');
  const [behaviors, setBehaviors] = useState<string[]>([]);
  const [health, setHealth] = useState('');
  const [notes, setNotes] = useState('');
  const [nickname, setNickname] = useState('');
  const [notifyMe, setNotifyMe] = useState(false);
  const [email, setEmail] = useState('');
  const [submitHovered, setSubmitHovered] = useState(false);

  function toggleBehavior(b: string) {
    setBehaviors(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  }

  function handleSubmit() {
    const payload = {
      date,
      location,
      behaviors,
      health,
      notes,
      nickname,
      notifyMe,
      email: notifyMe ? email : null,
      photos: {
        top: photos?.top ?? null,
        left: photos?.left ?? null,
        right: photos?.right ?? null,
      },
    };
    console.log('New turtle submission:', payload);
    onSubmitted();
  }

  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            margin: 0,
          }}
        >
          Submit New Turtle
        </h1>
      </div>

      {/* Photos */}
      {photos && (
        <div className="flex flex-col gap-3">
          <span style={labelStyle}>Submitted Photos</span>
          <div className="grid grid-cols-3 gap-2">
            <PhotoThumbnail file={photos.top} label="Top" />
            <PhotoThumbnail file={photos.left} label="Left" />
            <PhotoThumbnail file={photos.right} label="Right" />
          </div>
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-6">

        <FieldGroup label="Date">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Location">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. North meadow trail"
            style={inputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Observed Behavior">
          <div className="flex flex-col gap-2">
            {BEHAVIORS.map(b => (
              <label
                key={b}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={behaviors.includes(b)}
                  onChange={() => toggleBehavior(b)}
                  style={{ accentColor: 'var(--color-btn-primary-bg)' }}
                />
                {b}
              </label>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Health">
          <select
            value={health}
            onChange={e => setHealth(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select...</option>
            {HEALTH_OPTIONS.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="General Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Any additional observations..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </FieldGroup>

        <FieldGroup label="Suggested Nickname">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </FieldGroup>

        {/* Notify me */}
        <div className="flex flex-col gap-3">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={notifyMe}
              onChange={e => setNotifyMe(e.target.checked)}
              style={{ accentColor: 'var(--color-btn-primary-bg)' }}
            />
            Notify me about this turtle
          </label>
          {notifyMe && (
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={inputStyle}
            />
          )}
          {notifyMe && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-muted)',
                fontSize: '0.75rem',
                lineHeight: 1.5,
              }}
            >
              We'll email you if this turtle is identified or added to the database.
            </span>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        onMouseEnter={() => setSubmitHovered(true)}
        onMouseLeave={() => setSubmitHovered(false)}
        className="w-full py-4 text-xs uppercase transition-all duration-300 mb-8"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.25em',
          backgroundColor: submitHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
          color: 'var(--color-btn-primary-text)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Submit for Review
      </button>
    </div>
  );
}
```

**Step 2: Type-check**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run build 2>&1 | head -30`

Expected: Clean build.

**Step 3: Wire NewTurtleSubmissionPage into App.tsx**

In `src/App.tsx`:

1. Import:
```tsx
import { NewTurtleSubmissionPage } from './pages/NewTurtleSubmissionPage';
```

2. Add the new-turtle render block (before the no-match block):
```tsx
if (page === 'new-turtle') {
  return (
    <NewTurtleSubmissionPage
      photos={submittedPhotos}
      onBack={() => setPage('no-match')}
      onSubmitted={() => setPage('instructions')}
      siteName={siteName}
    />
  );
}
```

**Step 4: Type-check**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run build 2>&1 | head -30`

Expected: Clean build.

**Step 5: Commit**

```bash
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" add src/pages/NewTurtleSubmissionPage.tsx src/App.tsx
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" commit -m "feat: add NewTurtleSubmissionPage (screen 2 of no-match flow)"
```

---

### Task 4: Manual smoke test

**Step 1: Start the dev server**

Run: `cd "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" && npm run dev`

**Step 2: Walk through the no-match flow**

1. Select a site on WelcomePage
2. On InstructionPage, submit the top photo
3. Click "Identify My Turtle" → DevRoutingModal opens
4. Click "No Match" → NoMatchPage appears
5. Verify: heading says "No Match Found", two buttons visible
6. Click "Submit as New Turtle" → NewTurtleSubmissionPage appears
7. Verify: photo thumbnails show (top photo only, left/right blank)
8. Fill in a few fields, check a behavior, check "Notify me" → email field appears
9. Click "Submit for Review" → console.log appears in browser dev tools, navigates back to InstructionPage
10. On NoMatchPage, click "Retake Photos" → navigates back to InstructionPage ✓

**Step 3: Push to GitHub**

```bash
git -C "/Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID" push origin main
```
