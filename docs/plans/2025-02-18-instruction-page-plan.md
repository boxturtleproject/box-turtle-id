# Instruction Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a photo instruction page between the Welcome screen and turtle identification, guiding users to submit top (required), left, and right (optional) turtle photos.

**Architecture:** Simple local state in App.tsx switches between 'welcome' and 'instructions' views — no router needed. InstructionPage holds three independent file inputs with preview state. Identify button activates when top image is present.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

---

### Task 1: Update App.tsx to support page navigation

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace static render with page state**

```tsx
// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';

type Page = 'welcome' | 'instructions';

function App() {
  const [page, setPage] = useState<Page>('welcome');

  if (page === 'instructions') {
    return <InstructionPage onBack={() => setPage('welcome')} />;
  }

  return <WelcomePage onGetStarted={() => setPage('instructions')} />;
}

export default App;
```

**Step 2: Verify the app still compiles (InstructionPage doesn't exist yet — expect a TS error, that's fine for now)**

Run: `npm run build 2>&1 | head -20`
Expected: Error about missing InstructionPage module — confirms wiring is in place

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add page state navigation to App"
```

---

### Task 2: Update WelcomePage to accept and use onGetStarted prop

**Files:**
- Modify: `src/pages/WelcomePage.tsx`

**Step 1: Add prop interface and wire up button**

Replace the current WelcomePage with the following. Key changes:
- Accept `onGetStarted: () => void` prop
- Remove the `inputRef` and file input (no longer needed here)
- Remove `hovered` state — keep it for button style
- Button label: "Get Started"
- Button onClick: calls `onGetStarted()`

```tsx
// src/pages/WelcomePage.tsx
import { useState } from 'react';

interface WelcomePageProps {
  onGetStarted: () => void;
}

export function WelcomePage({ onGetStarted }: WelcomePageProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex flex-col items-center justify-between w-full px-8 py-16"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6 text-center">
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
          Submit a photo to identify your turtle
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="w-full max-w-xs">
        <button
          type="button"
          className="w-full py-4 text-xs uppercase border transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.25em',
            color: hovered ? '#0a1a0e' : '#6b8f71',
            borderColor: '#6b8f71',
            backgroundColor: hovered ? '#6b8f71' : 'transparent',
            outlineColor: '#6b8f71',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onGetStarted}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/WelcomePage.tsx
git commit -m "feat: update WelcomePage button to Get Started with navigation prop"
```

---

### Task 3: Create InstructionPage with three photo cards

**Files:**
- Create: `src/pages/InstructionPage.tsx`

**Step 1: Create the file with full implementation**

```tsx
// src/pages/InstructionPage.tsx
import { useRef, useState } from 'react';

interface InstructionPageProps {
  onBack: () => void;
}

interface PhotoCardProps {
  label: string;
  tip: string;
  required?: boolean;
  large?: boolean;
  image: File | null;
  onImageSelect: (file: File) => void;
}

function PhotoCard({ label, tip, required, large, image, onImageSelect }: PhotoCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  const previewUrl = image ? URL.createObjectURL(image) : null;

  return (
    <div
      className="w-full flex flex-col gap-3"
      style={{
        borderTop: '1px solid #1e3a24',
        paddingTop: '1.5rem',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            fontSize: large ? '1.25rem' : '1rem',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {required && (
          <span
            className="text-xs uppercase"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#6b8f71',
              letterSpacing: '0.2em',
            }}
          >
            Required
          </span>
        )}
      </div>

      {/* Placeholder / Preview image area */}
      <div
        style={{
          width: '100%',
          aspectRatio: large ? '4/3' : '16/9',
          border: '1px dashed #3a5c40',
          backgroundColor: '#0f2414',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={`${label} preview`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Checkmark overlay */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: '#6b8f71',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#0a1a0e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        ) : (
          <span
            className="text-xs uppercase text-center px-4"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#3a5c40',
              letterSpacing: '0.2em',
            }}
          >
            Illustration placeholder
          </span>
        )}
      </div>

      {/* Tip */}
      <p
        className="text-xs"
        style={{
          fontFamily: "'DM Mono', monospace",
          color: '#6b8f71',
          letterSpacing: '0.15em',
        }}
      >
        {tip}
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageSelect(file);
        }}
      />

      {/* Submit button */}
      <button
        type="button"
        className="w-full py-3 text-xs uppercase border transition-all duration-300"
        style={{
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.25em',
          color: hovered ? '#0a1a0e' : '#6b8f71',
          borderColor: '#6b8f71',
          backgroundColor: hovered ? '#6b8f71' : 'transparent',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => inputRef.current?.click()}
      >
        {image ? 'Replace Image' : 'Submit Image'}
      </button>
    </div>
  );
}

export function InstructionPage({ onBack }: InstructionPageProps) {
  const [topImage, setTopImage] = useState<File | null>(null);
  const [leftImage, setLeftImage] = useState<File | null>(null);
  const [rightImage, setRightImage] = useState<File | null>(null);
  const [identifyHovered, setIdentifyHovered] = useState(false);

  const identifyEnabled = topImage !== null;

  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-8"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          style={{ color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="#6b8f71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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

      {/* Cards */}
      <PhotoCard
        label="Top View"
        tip="Position yourself directly above the turtle"
        required
        large
        image={topImage}
        onImageSelect={setTopImage}
      />
      <PhotoCard
        label="Left Side"
        tip="Optional — helps improve accuracy"
        image={leftImage}
        onImageSelect={setLeftImage}
      />
      <PhotoCard
        label="Right Side"
        tip="Optional — helps improve accuracy"
        image={rightImage}
        onImageSelect={setRightImage}
      />

      {/* Identify button */}
      <button
        type="button"
        disabled={!identifyEnabled}
        className="w-full py-4 text-xs uppercase border transition-all duration-300 mt-4 mb-8"
        style={{
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.25em',
          cursor: identifyEnabled ? 'pointer' : 'not-allowed',
          color: identifyEnabled
            ? identifyHovered ? '#0a1a0e' : '#6b8f71'
            : '#2a4030',
          borderColor: identifyEnabled ? '#6b8f71' : '#2a4030',
          backgroundColor: identifyEnabled && identifyHovered ? '#6b8f71' : 'transparent',
        }}
        onMouseEnter={() => identifyEnabled && setIdentifyHovered(true)}
        onMouseLeave={() => setIdentifyHovered(false)}
        onClick={() => {
          if (!identifyEnabled) return;
          // TODO: wire up identification logic
          console.log('Identify with:', { topImage, leftImage, rightImage });
        }}
      >
        Identify My Turtle
      </button>
    </div>
  );
}
```

**Step 2: Verify the app compiles cleanly**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Verify in browser**
- Welcome page shows "Get Started" button
- Clicking navigates to instruction page
- Back arrow returns to welcome
- Each card has a placeholder area and "Submit Image" button
- Submitting an image on a card shows a thumbnail + checkmark
- "Identify My Turtle" is muted until Top View image is submitted
- After submitting a Top View image, "Identify My Turtle" activates

**Step 4: Commit**

```bash
git add src/pages/InstructionPage.tsx
git commit -m "feat: add InstructionPage with top/left/right photo cards"
```

---

## Notes for later

- Replace placeholder image areas with real illustration assets when available
- Wire `onClick` of "Identify My Turtle" to actual identification API/logic
- Consider URL.revokeObjectURL cleanup if memory becomes a concern on low-end devices
