# Match Profile Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Match Profile page that fetches a turtle record (hardcoded to T106) and its encounters from Airtable, displays the profile, and collects an email for future sighting notifications.

**Architecture:** A thin Airtable service layer handles all API calls using fetch + the Airtable REST API. MatchProfilePage consumes this service and renders turtle data. App.tsx gets a new `match` page state. Secrets live in `.env` (never committed).

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Airtable REST API

---

### Task 1: Set up environment variables

**Files:**
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Create `.env` with Airtable credentials**

```bash
# In /Users/robertfabricant/Desktop/FAB/9_TURTLES/Box Turtle ID/.env
VITE_AIRTABLE_TOKEN=pat_YOUR_TOKEN_HERE
VITE_AIRTABLE_BASE_ID=appd4ajEdEAQ7bF4C
VITE_AIRTABLE_TURTLES_TABLE=tblKjFWv4Qy0JL6Wd
VITE_AIRTABLE_ENCOUNTERS_TABLE=tbl9MJ4oADtMvVmXq
```

Replace `pat_YOUR_TOKEN_HERE` with your actual Airtable personal access token.

**Step 2: Create `.env.example`**

```
VITE_AIRTABLE_TOKEN=pat_YOUR_TOKEN_HERE
VITE_AIRTABLE_BASE_ID=appd4ajEdEAQ7bF4C
VITE_AIRTABLE_TURTLES_TABLE=tblKjFWv4Qy0JL6Wd
VITE_AIRTABLE_ENCOUNTERS_TABLE=tbl9MJ4oADtMvVmXq
```

**Step 3: Ensure `.env` is in `.gitignore`**

Check that `.gitignore` contains `.env` — add it if missing.

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add Airtable env config"
```

Note: Never `git add .env` — it contains your secret token.

---

### Task 2: Create Airtable service layer

**Files:**
- Create: `src/services/airtable.ts`

**Step 1: Create the service file**

```ts
// src/services/airtable.ts

const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TURTLES_TABLE = import.meta.env.VITE_AIRTABLE_TURTLES_TABLE;
const ENCOUNTERS_TABLE = import.meta.env.VITE_AIRTABLE_ENCOUNTERS_TABLE;

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  width?: number;
  height?: number;
}

export interface TurtleRecord {
  airtableId: string;
  nickname: string;
  gender: string;
  dateFirstIdentified: string;
  carapaceTop: AirtableAttachment[];
  carapaceLeft: AirtableAttachment[];
  carapaceRight: AirtableAttachment[];
  notes: string;
}

export interface EncounterRecord {
  airtableId: string;
  date: string;
  turtleIds: string[];
}

function parseTurtle(record: any): TurtleRecord {
  const f = record.fields;
  return {
    airtableId: record.id,
    nickname: f['Nickname'] ?? '',
    gender: f['Gender'] ?? '',
    dateFirstIdentified: f['Date First Identified'] ?? '',
    carapaceTop: f['Carapace Top'] ?? [],
    carapaceLeft: f['Carapace Left'] ?? [],
    carapaceRight: f['Carapace Right'] ?? [],
    notes: f['Notes'] ?? '',
  };
}

function parseEncounter(record: any): EncounterRecord {
  const f = record.fields;
  return {
    airtableId: record.id,
    date: f['Date'] ?? '',
    turtleIds: f['Turtle ID'] ?? [],
  };
}

export async function fetchTurtleByNickname(nickname: string): Promise<TurtleRecord | null> {
  const formula = encodeURIComponent(`{Nickname} = "${nickname}"`);
  const url = `${BASE_URL}/${TURTLES_TABLE}?filterByFormula=${formula}&maxRecords=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  const data = await res.json();
  if (!data.records?.length) return null;
  return parseTurtle(data.records[0]);
}

export async function fetchEncountersForTurtle(turtleAirtableId: string): Promise<EncounterRecord[]> {
  // Fetch all encounters and filter client-side (Airtable linked record filter is complex)
  const url = `${BASE_URL}/${ENCOUNTERS_TABLE}?fields[]=Date&fields[]=Turtle+ID`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  const data = await res.json();
  const all: EncounterRecord[] = (data.records ?? []).map(parseEncounter);
  return all.filter(e => e.turtleIds.includes(turtleAirtableId));
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors related to `src/services/airtable.ts`

**Step 3: Commit**

```bash
git add src/services/airtable.ts
git commit -m "feat: add Airtable service layer"
```

---

### Task 3: Create MatchProfilePage component

**Files:**
- Create: `src/pages/MatchProfilePage.tsx`

**Step 1: Create the component**

```tsx
// src/pages/MatchProfilePage.tsx
import { useEffect, useState } from 'react';
import {
  fetchTurtleByNickname,
  fetchEncountersForTurtle,
  TurtleRecord,
  EncounterRecord,
} from '../services/airtable';

const DEFAULT_TURTLE_ID = 'T106';

interface MatchProfilePageProps {
  onBack: () => void;
  onNotMyTurtle: () => void;
  turtleNickname?: string;
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; turtle: TurtleRecord; encounterCount: number; lastEncounter: string | null };

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          color: '#6b8f71',
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          color: '#f0ede6',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function MatchProfilePage({ onBack, onNotMyTurtle, turtleNickname = DEFAULT_TURTLE_ID }: MatchProfilePageProps) {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [confirmHovered, setConfirmHovered] = useState(false);
  const [notMyTurtleHovered, setNotMyTurtleHovered] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const turtle = await fetchTurtleByNickname(turtleNickname);
        if (!turtle) {
          setState({ status: 'error', message: `Turtle "${turtleNickname}" not found.` });
          return;
        }
        const encounters = await fetchEncountersForTurtle(turtle.airtableId);
        const encounterCount = encounters.length;
        const dates = encounters.map(e => e.date).filter(Boolean).sort();
        const lastEncounter = dates.length ? dates[dates.length - 1] : null;
        setState({ status: 'loaded', turtle, encounterCount, lastEncounter });
      } catch (err: any) {
        setState({ status: 'error', message: err.message ?? 'Failed to load turtle data.' });
      }
    }
    load();
  }, [turtleNickname]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center w-full" style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', letterSpacing: '0.2em', fontSize: '0.75rem', textTransform: 'uppercase' }}>
          Identifying...
        </span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full px-8" style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {state.message}
        </span>
        <button onClick={onBack} style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const { turtle, encounterCount, lastEncounter } = state;
  const topPhoto = turtle.carapaceTop[0]?.url;
  const leftPhoto = turtle.carapaceLeft[0]?.url;
  const rightPhoto = turtle.carapaceRight[0]?.url;

  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-8"
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

      {/* Photo gallery */}
      <div className="flex flex-col gap-2">
        {topPhoto && (
          <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
            <img src={topPhoto} alt="Carapace top" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div className="flex gap-2">
          {leftPhoto && (
            <div style={{ flex: 1, aspectRatio: '1/1', overflow: 'hidden' }}>
              <img src={leftPhoto} alt="Carapace left" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {rightPhoto && (
            <div style={{ flex: 1, aspectRatio: '1/1', overflow: 'hidden' }}>
              <img src={rightPhoto} alt="Carapace right" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex justify-between"
        style={{ borderTop: '1px solid #1e3a24', borderBottom: '1px solid #1e3a24', paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        <StatChip label="Gender" value={turtle.gender || '—'} />
        <StatChip label="First Seen" value={formatDate(turtle.dateFirstIdentified)} />
        <StatChip label="Encounters" value={String(encounterCount)} />
      </div>
      {lastEncounter && (
        <p style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '-1.5rem' }}>
          Last seen {formatDate(lastEncounter)}
        </p>
      )}

      {/* Notes */}
      {turtle.notes && (
        <div
          style={{
            backgroundColor: '#0f2414',
            border: '1px solid #1e3a24',
            padding: '1rem',
          }}
        >
          <p style={{ fontFamily: "'DM Mono', monospace", color: '#a8c5ae', fontSize: '0.8rem', letterSpacing: '0.08em', lineHeight: 1.6 }}>
            {turtle.notes}
          </p>
        </div>
      )}

      {/* Email signup */}
      <div className="flex flex-col gap-3">
        <p style={{ fontFamily: "'DM Mono', monospace", color: '#a8c5ae', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          We'll email you when this turtle is spotted again
        </p>
        {emailSubmitted ? (
          <p style={{ fontFamily: "'DM Mono', monospace", color: '#6b8f71', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
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
              onClick={() => {
                if (email) setEmailSubmitted(true);
                // TODO: persist email to Airtable or email service
              }}
            >
              Notify Me of Future Sightings
            </button>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mb-8">
        <button
          type="button"
          className="w-full py-4 text-sm uppercase transition-all duration-300"
          style={{
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.2em',
            color: confirmHovered ? '#0a1a0e' : '#0a1a0e',
            backgroundColor: confirmHovered ? '#8aab90' : '#6b8f71',
            border: 'none',
          }}
          onMouseEnter={() => setConfirmHovered(true)}
          onMouseLeave={() => setConfirmHovered(false)}
          onClick={() => {
            // TODO: record confirmed sighting
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
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/MatchProfilePage.tsx
git commit -m "feat: add MatchProfilePage component"
```

---

### Task 4: Wire MatchProfilePage into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update App.tsx**

```tsx
// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';

type Page = 'welcome' | 'instructions' | 'match';

function App() {
  const [page, setPage] = useState<Page>('welcome');

  if (page === 'match') {
    return (
      <MatchProfilePage
        onBack={() => setPage('instructions')}
        onNotMyTurtle={() => setPage('instructions')} // stub — update when other result states built
      />
    );
  }

  if (page === 'instructions') {
    return (
      <InstructionPage
        onBack={() => setPage('welcome')}
        onIdentify={() => setPage('match')}
      />
    );
  }

  return <WelcomePage onGetStarted={() => setPage('instructions')} />;
}

export default App;
```

**Step 2: Update InstructionPage to accept and use onIdentify prop**

In `src/pages/InstructionPage.tsx`, add `onIdentify: () => void` to `InstructionPageProps`, and wire it to the "Identify My Turtle" button's `onClick`.

Current onClick:
```tsx
onClick={() => {
  if (!identifyEnabled) return;
  console.log('Identify with:', { topImage, leftImage, rightImage });
}}
```

Replace with:
```tsx
onClick={() => {
  if (!identifyEnabled) return;
  onIdentify();
}}
```

**Step 3: Verify the full flow works in browser**
- Welcome → Get Started → Instruction page
- Submit Top View image → Identify My Turtle activates
- Click Identify My Turtle → loading state → turtle profile loads
- Back arrow on profile → returns to instructions
- "Not My Turtle" → returns to instructions (stub)

**Step 4: Commit**

```bash
git add src/App.tsx src/pages/InstructionPage.tsx
git commit -m "feat: wire MatchProfilePage into app navigation"
```

---

## Notes for later

- Email signup: persist to Airtable or a mailing list service (Mailchimp, etc.)
- "This Is My Turtle": record the confirmed sighting in the encounters table
- Replace hardcoded `T106` with the matched turtle ID from the algorithm
- Pagination: Airtable returns max 100 records per request — add offset handling for encounters if dataset grows large
