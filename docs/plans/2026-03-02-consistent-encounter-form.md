# Consistent Encounter Form Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Capture consistent encounter data (date, location, behavior, health, observation notes, notify opt-in) at the end of every submission path by extracting a shared `EncounterForm` component, adding it to `MatchProfilePage`, and removing the premature observation notes field from `InstructionPage`.

**Architecture:** Extract a controlled `EncounterForm` component that both `NewTurtleSubmissionPage` and `MatchProfilePage` use. Each parent manages the form state and passes it down via `value`/`onChange` props. `MatchProfilePage` renders the form below the turtle profile in both modes; the action button sits at the bottom of the form.

**Tech Stack:** React 19, TypeScript 5.9, Vite, Tailwind CSS. No test framework is configured — verification is done by running the dev server (`npm run dev`) and manually checking each page. TypeScript compilation (`npm run build`) serves as the automated check.

---

### Task 1: Create `EncounterForm` component

**Files:**
- Create: `src/components/EncounterForm.tsx`

**Step 1: Create the file with the data interface and constants**

```tsx
// src/components/EncounterForm.tsx
import { useState } from 'react';

export const BEHAVIORS = [
  'Nesting',
  'Mating',
  'Scouting',
  'Active',
  'Basking',
  'Basking in Rain',
  'Locomoting',
  'Hidden',
  'Stationary',
  'Emerging',
  'Bathing',
  'Digging',
] as const;

export const HEALTH_OPTIONS = [
  'Healthy',
  'Sick',
  'Injured',
  'Deceased',
] as const;

export interface EncounterFormData {
  date: string;
  location: string;
  behaviors: string[];
  health: string;
  observationNotes: string;
  nickname: string;
  notifyMe: boolean;
  email: string;
}

export function defaultEncounterFormData(): EncounterFormData {
  return {
    date: new Date().toISOString().split('T')[0],
    location: '',
    behaviors: [],
    health: '',
    observationNotes: '',
    nickname: '',
    notifyMe: false,
    email: '',
  };
}

interface EncounterFormProps {
  includeNickname?: boolean;
  value: EncounterFormData;
  onChange: (data: EncounterFormData) => void;
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

export function EncounterForm({ includeNickname = false, value, onChange }: EncounterFormProps) {
  const [submitHovered, setSubmitHovered] = useState(false);

  function set<K extends keyof EncounterFormData>(key: K, val: EncounterFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function toggleBehavior(b: string) {
    const next = value.behaviors.includes(b)
      ? value.behaviors.filter(x => x !== b)
      : [...value.behaviors, b];
    set('behaviors', next);
  }

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup label="Date">
        <input
          type="date"
          value={value.date}
          onChange={e => set('date', e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Location">
        <input
          type="text"
          value={value.location}
          onChange={e => set('location', e.target.value)}
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
                checked={value.behaviors.includes(b)}
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
          value={value.health}
          onChange={e => set('health', e.target.value)}
          style={inputStyle}
        >
          <option value="">Select...</option>
          {HEALTH_OPTIONS.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Observation Notes">
        <textarea
          value={value.observationNotes}
          onChange={e => set('observationNotes', e.target.value)}
          rows={4}
          placeholder="Any additional observations..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </FieldGroup>

      {includeNickname && (
        <FieldGroup label="Suggested Nickname">
          <input
            type="text"
            value={value.nickname}
            onChange={e => set('nickname', e.target.value)}
            placeholder="Optional"
            style={inputStyle}
          />
        </FieldGroup>
      )}

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
            checked={value.notifyMe}
            onChange={e => set('notifyMe', e.target.checked)}
            style={{ accentColor: 'var(--color-btn-primary-bg)' }}
          />
          Notify me about this turtle
        </label>
        {value.notifyMe && (
          <input
            type="email"
            value={value.email}
            onChange={e => set('email', e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
          />
        )}
        {value.notifyMe && (
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
  );
}
```

Note: The unused `submitHovered` state was accidentally included above — remove it. The component is purely presentational; no submit button lives inside it.

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/components/EncounterForm.tsx
git commit -m "feat: add shared EncounterForm component with controlled interface"
```

---

### Task 2: Refactor `NewTurtleSubmissionPage` to use `EncounterForm`

**Files:**
- Modify: `src/pages/NewTurtleSubmissionPage.tsx`

**Step 1: Replace the file contents**

Replace the entire file with the following. Key changes:
- Import `EncounterForm`, `EncounterFormData`, `defaultEncounterFormData` from `../components/EncounterForm`
- Remove `BEHAVIORS`, `HEALTH_OPTIONS`, `inputStyle`, `labelStyle`, `FieldGroup` (now in EncounterForm)
- Replace form fields with `<EncounterForm includeNickname value={encounterData} onChange={setEncounterData} />`
- Update `handleSubmit` to use `encounterData` fields

```tsx
// src/pages/NewTurtleSubmissionPage.tsx
import { useState, useEffect } from 'react';
import type { SubmittedPhotos } from './InstructionPage';
import {
  EncounterForm,
  defaultEncounterFormData,
  type EncounterFormData,
} from '../components/EncounterForm';

interface NewTurtleSubmissionPageProps {
  photos: SubmittedPhotos | null;
  onBack: () => void;
  onSubmitted: () => void;
  siteName: string;
}

function PhotoThumbnail({ file, label }: { file: File | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
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

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.65rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

export function NewTurtleSubmissionPage({ photos, onBack, onSubmitted, siteName }: NewTurtleSubmissionPageProps) {
  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [submitHovered, setSubmitHovered] = useState(false);

  function handleSubmit() {
    const payload = {
      ...encounterData,
      email: encounterData.notifyMe ? encounterData.email : null,
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
      <div className="flex items-center justify-between">
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

      {/* Encounter Form */}
      <EncounterForm
        includeNickname
        value={encounterData}
        onChange={setEncounterData}
      />

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

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Manually verify in dev server**

Run: `npm run dev`
Navigate to the new turtle submission page via the app. Confirm:
- All form fields render (date, location, behavior, health, observation notes, nickname, notify opt-in)
- Behavior checkboxes work
- Notify opt-in reveals email field
- Submit logs payload to console and returns to start

**Step 4: Commit**

```bash
git add src/pages/NewTurtleSubmissionPage.tsx
git commit -m "refactor: use shared EncounterForm in NewTurtleSubmissionPage"
```

---

### Task 3: Add `EncounterForm` to `MatchProfilePage`

**Files:**
- Modify: `src/pages/MatchProfilePage.tsx`

**Step 1: Update imports and state**

At the top of the file, add the import:
```tsx
import {
  EncounterForm,
  defaultEncounterFormData,
  type EncounterFormData,
} from '../components/EncounterForm';
```

In the component body, replace the existing email/emailSubmitted state with encounter form state. Remove:
```tsx
const [email, setEmail] = useState('');
const [emailSubmitted, setEmailSubmitted] = useState(false);
```
Add:
```tsx
const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
```

**Step 2: Replace the email signup block in "confirmed" mode**

Remove the entire block at lines 229–277 (the `{mode === 'confirmed' && (...)}` email signup section).

**Step 3: Replace the action buttons / post-submission section**

Replace the entire `{/* Action buttons */}` section (lines 279–409) with the following unified block:

```tsx
{/* Encounter form + action */}
{submitted ? (
  <div className="flex flex-col gap-3 mb-8">
    <p style={{
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-secondary)',
      fontSize: '0.75rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
    }}>
      ✓ {mode === 'review' ? "Submitted for review. We'll be in touch." : 'Encounter recorded. Thank you!'}
    </p>
  </div>
) : (
  <div className="flex flex-col gap-8 mb-8">
    <EncounterForm
      value={encounterData}
      onChange={setEncounterData}
    />

    <div className="flex flex-col gap-3">
      {mode === 'confirmed' ? (
        <>
          <button
            type="button"
            className="w-full py-4 text-sm uppercase transition-all duration-300"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.2em',
              color: 'var(--color-btn-primary-text)',
              backgroundColor: confirmHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
              border: 'none',
            }}
            onMouseEnter={() => setConfirmHovered(true)}
            onMouseLeave={() => setConfirmHovered(false)}
            onClick={() => {
              console.log('Confirmed turtle:', turtle.nickname, encounterData);
              setSubmitted(true);
            }}
          >
            This Is My Turtle
          </button>
          <button
            type="button"
            className="w-full py-4 text-sm uppercase border transition-all duration-300"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.2em',
              color: notMyTurtleHovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
              borderColor: 'var(--color-border-action)',
              backgroundColor: notMyTurtleHovered ? 'var(--color-btn-primary-bg)' : 'transparent',
            }}
            onMouseEnter={() => setNotMyTurtleHovered(true)}
            onMouseLeave={() => setNotMyTurtleHovered(false)}
            onClick={onNotMyTurtle}
          >
            Not My Turtle
          </button>
        </>
      ) : (
        <button
          type="button"
          className="w-full py-4 text-sm uppercase transition-all duration-300"
          style={{
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.2em',
            color: 'var(--color-btn-primary-text)',
            backgroundColor: confirmHovered ? 'var(--color-btn-primary-bg-hover)' : 'var(--color-btn-primary-bg)',
            border: 'none',
          }}
          onMouseEnter={() => setConfirmHovered(true)}
          onMouseLeave={() => setConfirmHovered(false)}
          onClick={() => {
            console.log('Review submission:', turtle.nickname, encounterData);
            setSubmitted(true);
          }}
        >
          Submit for Review
        </button>
      )}
    </div>
  </div>
)}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors. Fix any unused variable warnings (e.g., remove `email`, `emailSubmitted` if still referenced anywhere).

**Step 5: Manually verify in dev server**

Run: `npm run dev`
Navigate to the match profile page in both "confirmed" and "review" modes (use DevRoutingModal). Confirm:
- Turtle profile renders correctly
- EncounterForm appears below the turtle notes
- All form fields work
- "This Is My Turtle" / "Submit for Review" button is at the bottom
- Clicking submit logs encounter data and shows confirmation message
- "Not My Turtle" still works in confirmed mode

**Step 6: Commit**

```bash
git add src/pages/MatchProfilePage.tsx
git commit -m "feat: add EncounterForm to MatchProfilePage for consistent encounter data capture"
```

---

### Task 4: Remove observation notes from `InstructionPage`

**Files:**
- Modify: `src/pages/InstructionPage.tsx`

**Step 1: Remove `notes` from `SubmittedPhotos` interface**

Change lines 7–13 from:
```tsx
export interface SubmittedPhotos {
  top: File;
  left: File | null;
  right: File | null;
  other: File[];
  notes: string;
}
```
To:
```tsx
export interface SubmittedPhotos {
  top: File;
  left: File | null;
  right: File | null;
  other: File[];
}
```

**Step 2: Remove notes state**

In the `InstructionPage` component body, remove:
```tsx
const [notes, setNotes] = useState('');
```

**Step 3: Remove the Observation Notes section**

Remove the entire `{/* Observation Notes */}` block (lines 443–493):
```tsx
      {/* Observation Notes */}
      <div
        className="w-full flex flex-col gap-3"
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '1.5rem',
        }}
      >
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text-primary)',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Observation Notes
          </span>
          <span
            className="text-xs uppercase"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.2em',
            }}
          >
            Optional
          </span>
        </div>

        {/* Textarea */}
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you noticed about this turtle or its surroundings..."
          style={{
            width: '100%',
            border: '1px solid var(--color-border-input)',
            backgroundColor: 'var(--color-bg)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            padding: '0.75rem',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
```

**Step 4: Remove `notes` from the `onIdentify` call**

Change line 514 from:
```tsx
onIdentify({ top: topImage, left: leftImage, right: rightImage, other: otherImages.map((item) => item.file), notes });
```
To:
```tsx
onIdentify({ top: topImage, left: leftImage, right: rightImage, other: otherImages.map((item) => item.file) });
```

**Step 5: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds. TypeScript will catch any remaining references to `notes` on `SubmittedPhotos`.

**Step 6: Manually verify in dev server**

Run: `npm run dev`
Navigate to the photo submission page. Confirm:
- No "Observation Notes" section appears
- The page still shows Top View, Left Side, Right Side, Other Photos
- "Identify My Turtle" button still works

**Step 7: Commit**

```bash
git add src/pages/InstructionPage.tsx
git commit -m "feat: remove observation notes from photo submission page"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/EncounterForm.tsx` | **Created** — shared controlled form component |
| `src/pages/NewTurtleSubmissionPage.tsx` | **Refactored** — uses `EncounterForm`; "General Notes" is now "Observation Notes" |
| `src/pages/MatchProfilePage.tsx` | **Updated** — adds `EncounterForm` below turtle profile in both modes; removes standalone email signup |
| `src/pages/InstructionPage.tsx` | **Updated** — removes `notes` from `SubmittedPhotos` and removes the notes textarea |
