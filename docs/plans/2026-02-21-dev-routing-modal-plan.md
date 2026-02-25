# Dev Routing Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dev-only modal overlay on InstructionPage that lets the developer manually select which result flow to test (Confirmed Match, Possible Match, No Match).

**Architecture:** A `DevRoutingModal` component rendered inside `App.tsx`, gated behind `import.meta.env.DEV`. When "Identify My Turtle" is tapped in dev mode, the modal opens instead of routing directly. Selecting a flow closes the modal and navigates to the chosen result state.

**Tech Stack:** React, TypeScript, Vite (`import.meta.env.DEV`), inline styles matching existing design tokens.

---

### Task 1: Create `DevRoutingModal` component

**Files:**
- Create: `src/components/DevRoutingModal.tsx`

**Step 1: Create the component file**

```tsx
// src/components/DevRoutingModal.tsx

interface DevRoutingModalProps {
  onConfirmedMatch: () => void;
  onPossibleMatch: () => void;
  onNoMatch: () => void;
  onDismiss: () => void;
}

export function DevRoutingModal({
  onConfirmedMatch,
  onPossibleMatch,
  onNoMatch,
  onDismiss,
}: DevRoutingModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 26, 14, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#0f2414',
          border: '1px solid #1e3a24',
          padding: '2rem',
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* DEV badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#c8a84b',
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              border: '1px solid #c8a84b',
              padding: '0.15rem 0.4rem',
            }}
          >
            Dev
          </span>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#a8c5ae',
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
            }}
          >
            ✕ Cancel
          </button>
        </div>

        {/* Title */}
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            margin: 0,
          }}
        >
          Select Test Flow
        </p>

        {/* Flow buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onConfirmedMatch}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              backgroundColor: '#6b8f71',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              color: '#0a1a0e',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            Confirmed Match →
          </button>
          <button
            type="button"
            onClick={onPossibleMatch}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid #6b8f71',
              cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              color: '#6b8f71',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            Possible Match →
          </button>
          <button
            type="button"
            onClick={onNoMatch}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid #6b8f71',
              cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              color: '#6b8f71',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            No Match →
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/components/DevRoutingModal.tsx"
git commit -m "feat: add DevRoutingModal component (dev-only test flow selector)"
```

---

### Task 2: Wire modal into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add `showDevModal` state and import**

Add to imports:
```tsx
import { DevRoutingModal } from './components/DevRoutingModal';
```

Add to state (alongside existing state):
```tsx
const [showDevModal, setShowDevModal] = useState(false);
```

**Step 2: Update `InstructionPage`'s `onIdentify` prop**

Replace:
```tsx
onIdentify={() => setPage('possible-match')}
```
With:
```tsx
onIdentify={() => {
  if (import.meta.env.DEV) {
    setShowDevModal(true);
  } else {
    setPage('possible-match');
  }
}}
```

**Step 3: Render `DevRoutingModal` inside the `instructions` branch**

In the `page === 'instructions'` return block, wrap with a fragment and add the modal:
```tsx
if (page === 'instructions') {
  return (
    <>
      <InstructionPage
        onBack={() => setPage('welcome')}
        onIdentify={() => {
          if (import.meta.env.DEV) {
            setShowDevModal(true);
          } else {
            setPage('possible-match');
          }
        }}
        siteName={siteName}
      />
      {import.meta.env.DEV && showDevModal && (
        <DevRoutingModal
          onConfirmedMatch={() => {
            setShowDevModal(false);
            setPage('match');
          }}
          onPossibleMatch={() => {
            setShowDevModal(false);
            setPage('possible-match');
          }}
          onNoMatch={() => {
            setShowDevModal(false);
            setPage('no-match');
          }}
          onDismiss={() => setShowDevModal(false)}
        />
      )}
    </>
  );
}
```

**Step 4: Verify the app compiles and modal appears in dev**

```bash
npm run dev
```

Tap "Identify My Turtle" — modal should appear with 3 flow buttons. Each should route correctly. Cancel should dismiss.

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire DevRoutingModal into InstructionPage (dev mode only)"
```
