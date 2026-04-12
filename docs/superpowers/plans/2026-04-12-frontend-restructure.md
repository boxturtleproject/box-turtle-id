# Frontend Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewire the frontend to use the FastAPI backend instead of Airtable, migrate to Bun + React Router + TanStack Query, reorganize directory structure, and add a minimal admin dashboard.

**Architecture:** Replace `src/services/airtable.ts` with a typed API client in `src/shared/lib/api.ts`. Replace manual page-state routing in App.tsx with React Router. Replace manual fetch patterns with TanStack Query. Move pages into `src/public/` and `src/admin/` directories. Remove DevRoutingModal and all Airtable-specific code.

**Tech Stack:** Bun, Vite, React 19, TypeScript, Tailwind CSS 3, React Router 7, TanStack Query 5

**Spec:** `docs/superpowers/specs/2026-04-12-frontend-restructure-design.md`

**Working directory for all commands:** The repo root `/Users/claudius/github/box-turtle-id/` (NOT the `backend/` subdirectory).

---

## File Map

### Deleted
- `src/services/airtable.ts`
- `src/components/DevRoutingModal.tsx`
- `package-lock.json`

### New files
- `src/shared/lib/api.ts` — Typed fetch wrapper for all backend endpoints
- `src/shared/types/index.ts` — Shared TypeScript interfaces
- `src/shared/components/SiteBand.tsx` — Moved from `src/components/`
- `src/shared/components/Footer.tsx` — Moved from `src/components/`
- `src/shared/components/EncounterForm.tsx` — Moved from `src/components/`
- `src/shared/components/ConfidenceBadge.tsx` — New: renders score + confidence label
- `src/shared/context/SiteContext.tsx` — New: React context for selected site
- `src/public/WelcomePage.tsx` — Moved + modified
- `src/public/InstructionPage.tsx` — Moved + major rewrite (API submission)
- `src/public/PossibleMatchPage.tsx` — Moved + major rewrite (real candidates)
- `src/public/MatchProfilePage.tsx` — Moved + rewrite (fetch from API)
- `src/public/MatchEncounterPage.tsx` — Moved + rewrite (API confirm)
- `src/public/NoMatchPage.tsx` — Moved + modified
- `src/public/NewTurtleSubmissionPage.tsx` — Moved + rewrite (API new-turtle)
- `src/public/ThankYouPage.tsx` — Moved + modified
- `src/public/AboutPage.tsx` — Moved
- `src/admin/Dashboard.tsx` — New
- `src/admin/Compare.tsx` — New
- `src/admin/Search.tsx` — New
- `src/admin/TurtleProfile.tsx` — New
- `src/admin/Settings.tsx` — New
- `src/admin/Sync.tsx` — New
- `.env.development` — New: `VITE_API_URL=http://localhost:8000`

### Modified
- `src/App.tsx` — Complete rewrite: React Router + SiteContext + QueryClient
- `src/main.tsx` — Add QueryClientProvider + BrowserRouter
- `vite.config.ts` — No changes needed
- `tailwind.config.js` — Update content globs for new directories

---

## Task 1: Migrate to Bun

**Files:**
- Delete: `package-lock.json`
- Create: `bun.lock` (auto-generated)

- [ ] **Step 1: Install Bun if not present**

```bash
which bun || curl -fsSL https://bun.sh/install | bash
```

- [ ] **Step 2: Delete npm lockfile and install with Bun**

```bash
rm package-lock.json
bun install
```

- [ ] **Step 3: Verify dev server works**

```bash
bun run dev &
sleep 3 && curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML response from Vite dev server.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: migrate from npm to bun"
```

---

## Task 2: Add Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install React Router and TanStack Query**

```bash
bun add react-router-dom @tanstack/react-query
```

- [ ] **Step 2: Verify build still works**

```bash
bun run build
```

Expected: Build succeeds (existing code doesn't use new deps yet).

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock && git commit -m "feat: add react-router-dom and tanstack-query"
```

---

## Task 3: Create Shared Types

**Files:**
- Create: `src/shared/types/index.ts`

- [ ] **Step 1: Write shared types**

Write `src/shared/types/index.ts`:

```typescript
export type Site = 'patuxent' | 'wallkill';

export type Confidence = 'high' | 'medium' | 'low';

export interface SubmissionCandidate {
  turtle_id: number;
  turtle_nickname: string | null;
  score: number;
  confidence: Confidence;
  visualization_url: string | null;
  thumbnail_url: string | null;
}

export interface IdentifyResponse {
  candidates: SubmissionCandidate[];
  total_compared: number;
  processing_time_ms: number;
  submission_id: string;
}

export interface ConfirmResponse {
  success: boolean;
  encounter_id: number;
}

export interface NewTurtleResponse {
  success: boolean;
  turtle_id: number;
}

export interface EncounterFormData {
  date: string;
  location: string;
  setting: string[];
  conditions: string[];
  behaviors: string[];
  health: string;
  observationNotes: string;
  nickname: string;
  notifyMe: boolean;
  email: string;
}

export interface SubmittedPhotos {
  top: File;
  left: File | null;
  right: File | null;
  other: File[];
}

// Backend API response types
export interface TurtleResponse {
  id: number;
  external_id: string;
  name: string | null;
  site: string | null;
  gender: string | null;
  first_seen: string;
  notes: string | null;
  species: string | null;
  pattern: string | null;
  carapace_flare: string | null;
  cover_capture_id: number | null;
  captures: CaptureResponse[];
}

export interface CaptureResponse {
  id: number;
  turtle_id: number | null;
  image_type: string;
  image_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  keypoint_count: number;
}

export interface EncounterResponse {
  id: number;
  turtle_id: number;
  encounter_date: string | null;
  plot_name: string | null;
  health_status: string | null;
  behavior: string | null;
  setting: string | null;
  conditions: string | null;
  notes: string | null;
  observer_nickname: string | null;
}

export interface CompareResponse {
  score: number;
  is_match: boolean;
  visualization_path: string | null;
  match_count: number;
  keypoints_1: number;
  keypoints_2: number;
}

export interface SearchResult {
  turtle_id: number;
  capture_id: number;
  score: number;
  is_match: boolean;
  thumbnail_path: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total_compared: number;
}

export interface SiftSettingsResponse {
  distance_coefficient: number;
  acceptance_threshold: number;
  resized_width: number;
}

export interface SyncResponse {
  status: string;
  result?: {
    turtles: { created: number; updated: number };
    encounters: { created: number; updated: number };
  };
  message?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types/index.ts && git commit -m "feat: add shared TypeScript types for API responses"
```

---

## Task 4: Create API Client

**Files:**
- Create: `src/shared/lib/api.ts`
- Create: `.env.development`

- [ ] **Step 1: Create env file**

Write `.env.development`:

```
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 2: Write API client**

Write `src/shared/lib/api.ts`:

```typescript
import type {
  CompareResponse,
  ConfirmResponse,
  EncounterFormData,
  EncounterResponse,
  IdentifyResponse,
  NewTurtleResponse,
  SearchResponse,
  SiftSettingsResponse,
  SyncResponse,
  TurtleResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Public submission endpoints ──

export async function submitPhotos(
  site: string,
  files: { top: File; left?: File | null; right?: File | null },
): Promise<IdentifyResponse> {
  const form = new FormData();
  form.append('site', site);
  form.append('top', files.top);
  if (files.left) form.append('left', files.left);
  if (files.right) form.append('right', files.right);
  return apiFetch<IdentifyResponse>('/api/submissions/identify', {
    method: 'POST',
    body: form,
  });
}

export async function confirmMatch(
  submissionId: string,
  turtleId: number,
  encounterData: EncounterFormData,
): Promise<ConfirmResponse> {
  return apiFetch<ConfirmResponse>(`/api/submissions/${submissionId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      turtle_id: turtleId,
      encounter_data: {
        date: encounterData.date,
        location: encounterData.location,
        setting: encounterData.setting,
        conditions: encounterData.conditions,
        behaviors: encounterData.behaviors,
        health: encounterData.health,
        observation_notes: encounterData.observationNotes,
        nickname: encounterData.nickname,
        notify_me: encounterData.notifyMe,
        email: encounterData.email,
      },
    }),
  });
}

export async function submitNewTurtle(
  submissionId: string,
  nickname: string,
  encounterData: EncounterFormData,
  site: string,
): Promise<NewTurtleResponse> {
  return apiFetch<NewTurtleResponse>(`/api/submissions/${submissionId}/new-turtle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname,
      site,
      encounter_data: {
        date: encounterData.date,
        location: encounterData.location,
        setting: encounterData.setting,
        conditions: encounterData.conditions,
        behaviors: encounterData.behaviors,
        health: encounterData.health,
        observation_notes: encounterData.observationNotes,
        nickname: encounterData.nickname,
        notify_me: encounterData.notifyMe,
        email: encounterData.email,
      },
    }),
  });
}

// ── Read endpoints ──

export async function fetchTurtle(turtleId: number): Promise<TurtleResponse> {
  return apiFetch<TurtleResponse>(`/api/turtles/${turtleId}`);
}

export async function fetchTurtles(): Promise<TurtleResponse[]> {
  return apiFetch<TurtleResponse[]>('/api/turtles');
}

export async function fetchEncounters(turtleId: number): Promise<EncounterResponse[]> {
  return apiFetch<EncounterResponse[]>(`/api/turtles/${turtleId}/encounters`);
}

// ── Admin endpoints ──

export async function compareTwoImages(
  image1: File,
  image2: File,
): Promise<CompareResponse> {
  const form = new FormData();
  form.append('image1', image1);
  form.append('image2', image2);
  return apiFetch<CompareResponse>('/api/compare', {
    method: 'POST',
    body: form,
  });
}

export async function searchByImage(image: File): Promise<SearchResponse> {
  const form = new FormData();
  form.append('image', image);
  return apiFetch<SearchResponse>('/api/search', {
    method: 'POST',
    body: form,
  });
}

export async function fetchSettings(): Promise<SiftSettingsResponse> {
  return apiFetch<SiftSettingsResponse>('/api/settings');
}

export async function updateSettings(
  settings: Partial<SiftSettingsResponse>,
): Promise<SiftSettingsResponse> {
  return apiFetch<SiftSettingsResponse>('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function triggerSync(): Promise<SyncResponse> {
  return apiFetch<SyncResponse>('/api/sync/airtable', { method: 'POST' });
}

// ── Helpers ──

/** Build a full URL for an image path from the API */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/api.ts .env.development && git commit -m "feat: add typed API client and dev env config"
```

---

## Task 5: Create SiteContext

**Files:**
- Create: `src/shared/context/SiteContext.tsx`

- [ ] **Step 1: Write SiteContext**

Write `src/shared/context/SiteContext.tsx`:

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Site } from '../types';

interface SiteContextValue {
  site: Site | null;
  setSite: (site: Site) => void;
  siteName: string;
  siteColor: string;
}

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent',
  wallkill: 'Wallkill',
};

const SITE_COLORS: Record<Site, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<Site | null>(null);

  const value: SiteContextValue = {
    site,
    setSite,
    siteName: site ? SITE_NAMES[site] : '',
    siteColor: site ? SITE_COLORS[site] : '#666',
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/context/SiteContext.tsx && git commit -m "feat: add SiteContext provider"
```

---

## Task 6: Create ConfidenceBadge Component

**Files:**
- Create: `src/shared/components/ConfidenceBadge.tsx`

- [ ] **Step 1: Write ConfidenceBadge**

Write `src/shared/components/ConfidenceBadge.tsx`:

```typescript
import type { Confidence } from '../types';

const BADGE_STYLES: Record<Confidence, { bg: string; text: string; border: string }> = {
  high: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  medium: { bg: '#fef9c3', text: '#854d0e', border: '#eab308' },
  low: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
  score: number;
}

export default function ConfidenceBadge({ confidence, score }: ConfidenceBadgeProps) {
  const style = BADGE_STYLES[confidence];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {Math.round(score)}% — {confidence}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/ConfidenceBadge.tsx && git commit -m "feat: add ConfidenceBadge component"
```

---

## Task 7: Move Shared Components

**Files:**
- Move: `src/components/SiteBand.tsx` → `src/shared/components/SiteBand.tsx`
- Move: `src/components/Footer.tsx` → `src/shared/components/Footer.tsx`
- Move: `src/components/EncounterForm.tsx` → `src/shared/components/EncounterForm.tsx`
- Delete: `src/components/DevRoutingModal.tsx`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/shared/components
cp src/components/SiteBand.tsx src/shared/components/SiteBand.tsx
cp src/components/Footer.tsx src/shared/components/Footer.tsx
cp src/components/EncounterForm.tsx src/shared/components/EncounterForm.tsx
```

- [ ] **Step 2: Update SiteBand.tsx imports to use shared types**

In `src/shared/components/SiteBand.tsx`, replace the local `Site` type import with the shared one. The file currently defines `Site` as a local type. Update the import at the top:

Replace:
```typescript
type Site = 'patuxent' | 'wallkill';
```
With:
```typescript
import type { Site } from '../types';
```

Also remove `SITE_COLORS` from SiteBand since it's now in SiteContext. Actually, SiteBand still needs the color map for rendering, so keep it but import Site from shared types.

- [ ] **Step 3: Update EncounterForm.tsx to import from shared types**

In `src/shared/components/EncounterForm.tsx`, the `EncounterFormData` interface is defined locally. Keep it here as the source of truth for the form component, but re-export from shared types. The shared types file already has a compatible `EncounterFormData` — the EncounterForm component should export its type as before so existing consumers work.

No changes needed to EncounterForm.tsx — it defines and exports its own `EncounterFormData` which is compatible with the API client's format.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/ && git commit -m "feat: move shared components to src/shared/components/"
```

---

## Task 8: Move Public Pages

**Files:**
- Move all 9 pages from `src/pages/` to `src/public/`

- [ ] **Step 1: Copy pages to new location**

```bash
mkdir -p src/public
cp src/pages/WelcomePage.tsx src/public/
cp src/pages/InstructionPage.tsx src/public/
cp src/pages/PossibleMatchPage.tsx src/public/
cp src/pages/MatchProfilePage.tsx src/public/
cp src/pages/MatchEncounterPage.tsx src/public/
cp src/pages/NoMatchPage.tsx src/public/
cp src/pages/NewTurtleSubmissionPage.tsx src/public/
cp src/pages/ThankYouPage.tsx src/public/
cp src/pages/AboutPage.tsx src/public/
```

- [ ] **Step 2: Commit**

```bash
git add src/public/ && git commit -m "feat: copy pages to src/public/ directory"
```

---

## Task 9: Rewrite WelcomePage for React Router

**Files:**
- Modify: `src/public/WelcomePage.tsx`

- [ ] **Step 1: Update WelcomePage to use SiteContext and React Router**

Write `src/public/WelcomePage.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import Footer from '../shared/components/Footer';
import { useSite } from '../shared/context/SiteContext';
import type { Site } from '../shared/types';

import patuxentMap from '../assets/patuxent-map.svg';
import wallkillMap from '../assets/wallkill-map.svg';

const SITE_COLORS: Record<Site, string> = {
  patuxent: '#3a7d44',
  wallkill: '#c8622a',
};

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent Research Refuge',
  wallkill: 'Wallkill River NWR',
};

const SITE_MAPS: Record<Site, string> = {
  patuxent: patuxentMap,
  wallkill: wallkillMap,
};

function SiteCard({ site, onClick }: { site: Site; onClick: () => void }) {
  const color = SITE_COLORS[site];
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl overflow-hidden text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ border: `2px solid ${color}` }}
    >
      <div
        className="p-4 flex items-center gap-4"
        style={{ backgroundColor: color }}
      >
        <img
          src={SITE_MAPS[site]}
          alt={`${SITE_NAMES[site]} map`}
          className="w-16 h-16 rounded-lg bg-white/20 p-1"
        />
        <div className="text-white">
          <div className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
            {SITE_NAMES[site]}
          </div>
          <div className="text-sm opacity-90">Tap to begin</div>
        </div>
      </div>
    </button>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const { setSite } = useSite();

  const handleSelectSite = (site: Site) => {
    setSite(site);
    navigate('/instructions');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-1 flex flex-col items-center px-4 pt-12 pb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Box Turtle ID
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          Select your research site to get started
        </p>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <SiteCard site="wallkill" onClick={() => handleSelectSite('wallkill')} />
          <SiteCard site="patuxent" onClick={() => handleSelectSite('patuxent')} />
        </div>
        <p className="text-center mt-8 text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          Help researchers track box turtle populations by submitting photos of turtles you find.{' '}
          <button onClick={() => navigate('/about')} className="underline">
            Learn more here
          </button>
          .
        </p>
      </div>
      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/public/WelcomePage.tsx && git commit -m "feat: rewrite WelcomePage for React Router + SiteContext"
```

---

## Task 10: Rewrite InstructionPage with API Submission

**Files:**
- Modify: `src/public/InstructionPage.tsx`

- [ ] **Step 1: Rewrite InstructionPage**

This is the biggest page rewrite. It needs to POST photos to `/api/submissions/identify` and navigate to `/results` with the response data.

Write `src/public/InstructionPage.tsx`:

```typescript
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import { useSite } from '../shared/context/SiteContext';
import { submitPhotos } from '../shared/lib/api';
import type { SubmittedPhotos } from '../shared/types';

import topIcon from '../assets/camera-top.svg';
import leftIcon from '../assets/camera-left.svg';
import rightIcon from '../assets/camera-right.svg';

interface TrackedFile {
  id: number;
  file: File;
}

function PhotoCard({
  label,
  icon,
  file,
  onSelect,
  required,
}: {
  label: string;
  icon: string;
  file: File | null;
  onSelect: (file: File) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <button
      onClick={() => inputRef.current?.click()}
      className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors"
      style={{
        borderColor: file ? 'var(--color-border-action)' : 'var(--color-border-input)',
        backgroundColor: file ? 'var(--color-bg-card)' : 'transparent',
        minHeight: '140px',
      }}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={label} className="w-full h-24 object-cover rounded-lg" />
      ) : (
        <img src={icon} alt={label} className="w-12 h-12 opacity-50 mb-2" />
      )}
      <span className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
        {required && !file && ' *'}
      </span>
      {file && (
        <span className="absolute top-2 right-2 text-green-600 text-lg">✓</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
    </button>
  );
}

export default function InstructionPage() {
  const navigate = useNavigate();
  const { site, siteName } = useSite();

  const [topImage, setTopImage] = useState<File | null>(null);
  const [leftImage, setLeftImage] = useState<File | null>(null);
  const [rightImage, setRightImage] = useState<File | null>(null);
  const [otherImages, setOtherImages] = useState<TrackedFile[]>([]);
  const idCounterRef = useRef(0);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const identifyMutation = useMutation({
    mutationFn: () => {
      if (!site || !topImage) throw new Error('Site and top image required');
      return submitPhotos(site, { top: topImage, left: leftImage, right: rightImage });
    },
    onSuccess: (data) => {
      const photos: SubmittedPhotos = {
        top: topImage!,
        left: leftImage,
        right: rightImage,
        other: otherImages.map((t) => t.file),
      };
      if (data.candidates.length === 0) {
        navigate('/results/no-match', {
          state: { submissionId: data.submission_id, photos },
        });
      } else {
        navigate('/results', {
          state: {
            submissionId: data.submission_id,
            candidates: data.candidates,
            processingTimeMs: data.processing_time_ms,
            totalCompared: data.total_compared,
            photos,
          },
        });
      }
    },
  });

  const identifyEnabled = topImage !== null && !identifyMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {site && <SiteBand site={site} onWelcome={() => navigate('/')} />}
      <div className="flex-1 px-4 pt-14 pb-8">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← Back
        </button>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Upload Your Photos
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          Take clear photos of the turtle's shell. Top view is required.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <PhotoCard label="Top" icon={topIcon} file={topImage} onSelect={setTopImage} required />
          <PhotoCard label="Left" icon={leftIcon} file={leftImage} onSelect={setLeftImage} />
          <PhotoCard label="Right" icon={rightIcon} file={rightImage} onSelect={setRightImage} />
        </div>

        {/* Other photos section */}
        <button
          onClick={() => otherInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed p-3 text-sm mb-6"
          style={{ borderColor: 'var(--color-border-input)', color: 'var(--color-text-secondary)' }}
        >
          + Add other photos
        </button>
        <input
          ref={otherInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (!files) return;
            const newFiles: TrackedFile[] = Array.from(files).map((f) => ({
              id: ++idCounterRef.current,
              file: f,
            }));
            setOtherImages((prev) => [...prev, ...newFiles]);
          }}
        />
        {otherImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {otherImages.map((item) => (
              <div key={item.id} className="relative">
                <img
                  src={URL.createObjectURL(item.file)}
                  alt="Other"
                  className="w-full h-20 object-cover rounded-lg"
                />
                <button
                  onClick={() => setOtherImages((prev) => prev.filter((p) => p.id !== item.id))}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {identifyMutation.isError && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
          >
            Error: {identifyMutation.error?.message ?? 'Failed to identify turtle'}. Please try again.
          </div>
        )}

        <button
          onClick={() => identifyMutation.mutate()}
          disabled={!identifyEnabled}
          className="w-full rounded-xl py-3 font-semibold text-white transition-opacity"
          style={{
            backgroundColor: identifyEnabled ? 'var(--color-btn-primary-bg)' : '#999',
            opacity: identifyEnabled ? 1 : 0.5,
          }}
        >
          {identifyMutation.isPending ? 'Identifying...' : 'Identify My Turtle'}
        </button>
      </div>
      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/public/InstructionPage.tsx && git commit -m "feat: rewrite InstructionPage with API submission + useMutation"
```

---

## Task 11: Rewrite PossibleMatchPage with Real Candidates

**Files:**
- Modify: `src/public/PossibleMatchPage.tsx`

- [ ] **Step 1: Rewrite PossibleMatchPage**

Write `src/public/PossibleMatchPage.tsx`:

```typescript
import { useLocation, useNavigate } from 'react-router-dom';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import ConfidenceBadge from '../shared/components/ConfidenceBadge';
import { useSite } from '../shared/context/SiteContext';
import { imageUrl } from '../shared/lib/api';
import type { SubmissionCandidate, SubmittedPhotos } from '../shared/types';

interface ResultsState {
  submissionId: string;
  candidates: SubmissionCandidate[];
  processingTimeMs: number;
  totalCompared: number;
  photos: SubmittedPhotos;
}

function CandidateCard({
  candidate,
  onSelect,
  onConfirm,
  siteColor,
}: {
  candidate: SubmissionCandidate;
  onSelect: () => void;
  onConfirm: () => void;
  siteColor: string;
}) {
  const thumbSrc = imageUrl(candidate.thumbnail_url);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `2px solid ${siteColor}`,
        backgroundColor: 'var(--color-bg-card)',
      }}
    >
      <div className="aspect-[4/3] bg-gray-100 relative">
        {thumbSrc ? (
          <img src={thumbSrc} alt={candidate.turtle_nickname ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No photo
          </div>
        )}
        <div className="absolute top-2 right-2">
          <ConfidenceBadge confidence={candidate.confidence} score={candidate.score} />
        </div>
      </div>
      <div className="p-3">
        <div className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {candidate.turtle_nickname ?? `Turtle #${candidate.turtle_id}`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSelect}
            className="flex-1 text-sm py-1.5 rounded-lg border"
            style={{ borderColor: siteColor, color: siteColor }}
          >
            View Profile
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-sm py-1.5 rounded-lg text-white"
            style={{ backgroundColor: siteColor }}
          >
            This Is Mine
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PossibleMatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site, siteName, siteColor } = useSite();
  const state = location.state as ResultsState | undefined;

  if (!state || !site) {
    navigate('/');
    return null;
  }

  const { submissionId, candidates, photos } = state;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SiteBand site={site} onWelcome={() => navigate('/')} />
      <div className="flex-1 px-4 pt-14 pb-8">
        <button
          onClick={() => navigate('/instructions')}
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← Back
        </button>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Possible Matches
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          We found {candidates.length} possible match{candidates.length !== 1 ? 'es' : ''} at {siteName}.
        </p>

        <div className="flex flex-col gap-4 mb-6">
          {candidates.map((c) => (
            <CandidateCard
              key={c.turtle_id}
              candidate={c}
              siteColor={siteColor}
              onSelect={() =>
                navigate(`/results/${c.turtle_id}`, {
                  state: { submissionId, candidate: c, photos },
                })
              }
              onConfirm={() =>
                navigate('/encounter', {
                  state: { submissionId, turtleId: c.turtle_id, turtleNickname: c.turtle_nickname },
                })
              }
            />
          ))}
        </div>

        <button
          onClick={() =>
            navigate('/results/no-match', { state: { submissionId, photos } })
          }
          className="w-full text-sm py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          None of these are my turtle
        </button>
      </div>
      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/public/PossibleMatchPage.tsx && git commit -m "feat: rewrite PossibleMatchPage with real API candidates"
```

---

## Task 12: Rewrite MatchProfilePage

**Files:**
- Modify: `src/public/MatchProfilePage.tsx`

- [ ] **Step 1: Rewrite MatchProfilePage**

Write `src/public/MatchProfilePage.tsx`:

```typescript
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import ConfidenceBadge from '../shared/components/ConfidenceBadge';
import { useSite } from '../shared/context/SiteContext';
import { fetchTurtle, fetchEncounters, imageUrl } from '../shared/lib/api';
import type { SubmissionCandidate, SubmittedPhotos } from '../shared/types';

interface ProfileState {
  submissionId: string;
  candidate: SubmissionCandidate;
  photos: SubmittedPhotos;
}

export default function MatchProfilePage() {
  const { turtleId } = useParams<{ turtleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { site, siteColor } = useSite();
  const state = location.state as ProfileState | undefined;

  const id = Number(turtleId);

  const turtleQuery = useQuery({
    queryKey: ['turtle', id],
    queryFn: () => fetchTurtle(id),
    enabled: !isNaN(id),
  });

  const encountersQuery = useQuery({
    queryKey: ['encounters', id],
    queryFn: () => fetchEncounters(id),
    enabled: !isNaN(id),
  });

  if (!site) {
    navigate('/');
    return null;
  }

  const turtle = turtleQuery.data;
  const encounters = encountersQuery.data ?? [];
  const candidate = state?.candidate;

  // Find captures by type
  const topCapture = turtle?.captures?.find((c) => c.image_type === 'carapace_top');
  const leftCapture = turtle?.captures?.find((c) => c.image_type === 'carapace_left');
  const rightCapture = turtle?.captures?.find((c) => c.image_type === 'carapace_right');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SiteBand site={site} onWelcome={() => navigate('/')} />
      <div className="flex-1 px-4 pt-14 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← Back
        </button>

        {turtleQuery.isLoading && (
          <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            Loading turtle profile...
          </div>
        )}

        {turtleQuery.isError && (
          <div className="text-center py-12" style={{ color: 'var(--color-text-error)' }}>
            Failed to load turtle profile.
          </div>
        )}

        {turtle && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
              >
                {turtle.name || turtle.external_id}
              </h2>
              {candidate && (
                <ConfidenceBadge confidence={candidate.confidence} score={candidate.score} />
              )}
            </div>

            {/* SIFT Visualization */}
            {candidate?.visualization_url && (
              <div className="mb-4">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Match visualization
                </p>
                <img
                  src={imageUrl(candidate.visualization_url)}
                  alt="SIFT match visualization"
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* Photos */}
            <div className="mb-4">
              {topCapture && (
                <img
                  src={imageUrl(topCapture.image_path)}
                  alt="Top view"
                  className="w-full aspect-[4/3] object-cover rounded-lg mb-2"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                {leftCapture && (
                  <img
                    src={imageUrl(leftCapture.image_path)}
                    alt="Left view"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                )}
                {rightCapture && (
                  <img
                    src={imageUrl(rightCapture.image_path)}
                    alt="Right view"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Stats */}
            <div
              className="rounded-lg p-3 mb-4 flex flex-wrap gap-4 text-sm"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              {turtle.gender && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Gender: </span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{turtle.gender}</span>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>First seen: </span>
                <span style={{ color: 'var(--color-text-primary)' }}>{turtle.first_seen}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Encounters: </span>
                <span style={{ color: 'var(--color-text-primary)' }}>{encounters.length}</span>
              </div>
            </div>

            {turtle.notes && (
              <div
                className="rounded-lg p-3 mb-6 text-sm"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
              >
                {turtle.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-3 rounded-xl border font-semibold"
                style={{ borderColor: siteColor, color: siteColor }}
              >
                Not My Turtle
              </button>
              <button
                onClick={() =>
                  navigate('/encounter', {
                    state: {
                      submissionId: state?.submissionId,
                      turtleId: turtle.id,
                      turtleNickname: turtle.name || turtle.external_id,
                    },
                  })
                }
                className="flex-1 py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: siteColor }}
              >
                This Is My Turtle
              </button>
            </div>
          </>
        )}
      </div>
      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/public/MatchProfilePage.tsx && git commit -m "feat: rewrite MatchProfilePage to fetch from API"
```

---

## Task 13: Rewrite MatchEncounterPage

**Files:**
- Modify: `src/public/MatchEncounterPage.tsx`

- [ ] **Step 1: Rewrite MatchEncounterPage**

Write `src/public/MatchEncounterPage.tsx`:

```typescript
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import EncounterForm, { defaultEncounterFormData } from '../shared/components/EncounterForm';
import type { EncounterFormData } from '../shared/components/EncounterForm';
import { useSite } from '../shared/context/SiteContext';
import { confirmMatch } from '../shared/lib/api';

interface EncounterState {
  submissionId: string;
  turtleId: number;
  turtleNickname: string;
}

export default function MatchEncounterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site, siteColor } = useSite();
  const state = location.state as EncounterState | undefined;

  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!state) throw new Error('Missing submission state');
      return confirmMatch(state.submissionId, state.turtleId, encounterData);
    },
    onSuccess: () => navigate('/thank-you'),
  });

  if (!site || !state) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SiteBand site={site} onWelcome={() => setShowLeaveConfirm(true)} />
      <div className="flex-1 px-4 pt-14 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← Back
        </button>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Record Encounter
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          Recording encounter with <strong>{state.turtleNickname}</strong>
        </p>

        <EncounterForm value={encounterData} onChange={setEncounterData} />

        {mutation.isError && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
          >
            Error: {mutation.error?.message ?? 'Submission failed'}. Please try again.
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full mt-6 rounded-xl py-3 font-semibold text-white"
          style={{ backgroundColor: siteColor }}
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Encounter'}
        </button>
      </div>
      <Footer onAbout={() => navigate('/about')} />

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100] px-4"
          style={{ backgroundColor: 'var(--color-overlay)' }}
        >
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2">Switch sites?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Your encounter data will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 rounded-lg border"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-2 rounded-lg text-white"
                style={{ backgroundColor: siteColor }}
              >
                Switch Sites
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/public/MatchEncounterPage.tsx && git commit -m "feat: rewrite MatchEncounterPage with API confirm"
```

---

## Task 14: Rewrite Remaining Public Pages

**Files:**
- Modify: `src/public/NoMatchPage.tsx`
- Modify: `src/public/NewTurtleSubmissionPage.tsx`
- Modify: `src/public/ThankYouPage.tsx`
- Modify: `src/public/AboutPage.tsx`

- [ ] **Step 1: Rewrite NoMatchPage**

Write `src/public/NoMatchPage.tsx`:

```typescript
import { useLocation, useNavigate } from 'react-router-dom';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import { useSite } from '../shared/context/SiteContext';

interface NoMatchState {
  submissionId: string;
}

export default function NoMatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site, siteName } = useSite();
  const state = location.state as NoMatchState | undefined;

  if (!site) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SiteBand site={site} onWelcome={() => navigate('/')} />
      <div className="flex-1 px-4 pt-14 pb-8 flex flex-col items-center justify-center text-center">
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          No Match Found
        </h2>
        <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
          This turtle doesn't appear to be in our {siteName} database yet.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() =>
              navigate('/results/new-turtle', {
                state: { submissionId: state?.submissionId },
              })
            }
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ backgroundColor: 'var(--color-btn-primary-bg)' }}
          >
            Submit as New Turtle
          </button>
          <button
            onClick={() => navigate('/instructions')}
            className="w-full py-3 rounded-xl font-semibold border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Retake Photos
          </button>
        </div>
      </div>
      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite NewTurtleSubmissionPage**

Write `src/public/NewTurtleSubmissionPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import EncounterForm, { defaultEncounterFormData } from '../shared/components/EncounterForm';
import type { EncounterFormData } from '../shared/components/EncounterForm';
import { useSite } from '../shared/context/SiteContext';
import { submitNewTurtle } from '../shared/lib/api';
import type { SubmittedPhotos } from '../shared/types';

interface NewTurtleState {
  submissionId: string;
  photos?: SubmittedPhotos;
}

function PhotoThumbnail({ file, label }: { file: File | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="flex flex-col items-center">
      <img src={url} alt={label} className="w-full aspect-square object-cover rounded-lg" />
      <span className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}

export default function NewTurtleSubmissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { site, siteColor } = useSite();
  const state = location.state as NewTurtleState | undefined;

  const [encounterData, setEncounterData] = useState<EncounterFormData>(defaultEncounterFormData());
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!state?.submissionId || !site) throw new Error('Missing state');
      return submitNewTurtle(
        state.submissionId,
        encounterData.nickname,
        encounterData,
        site,
      );
    },
    onSuccess: () => navigate('/thank-you'),
  });

  if (!site || !state) {
    navigate('/');
    return null;
  }

  const photos = state.photos;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SiteBand site={site} onWelcome={() => setShowLeaveConfirm(true)} />
      <div className="flex-1 px-4 pt-14 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← Back
        </button>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Submit New Turtle
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          This turtle will be added to the database.
        </p>

        {photos && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <PhotoThumbnail file={photos.top} label="Top" />
            <PhotoThumbnail file={photos.left} label="Left" />
            <PhotoThumbnail file={photos.right} label="Right" />
          </div>
        )}

        <EncounterForm includeNickname value={encounterData} onChange={setEncounterData} />

        {mutation.isError && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
          >
            Error: {mutation.error?.message ?? 'Submission failed'}. Please try again.
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full mt-6 rounded-xl py-3 font-semibold text-white"
          style={{ backgroundColor: siteColor }}
        >
          {mutation.isPending ? 'Submitting...' : 'Submit New Turtle'}
        </button>
      </div>
      <Footer onAbout={() => navigate('/about')} />

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100] px-4"
          style={{ backgroundColor: 'var(--color-overlay)' }}
        >
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2">Switch sites?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Your form data will be lost.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-2 rounded-lg border">Cancel</button>
              <button onClick={() => navigate('/')} className="flex-1 py-2 rounded-lg text-white" style={{ backgroundColor: siteColor }}>Switch Sites</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite ThankYouPage**

Write `src/public/ThankYouPage.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import SiteBand from '../shared/components/SiteBand';
import Footer from '../shared/components/Footer';
import { useSite } from '../shared/context/SiteContext';

export default function ThankYouPage() {
  const navigate = useNavigate();
  const { site, siteColor } = useSite();

  if (!site) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SiteBand site={site} onWelcome={() => navigate('/')} />
      <div className="flex-1 px-4 pt-14 pb-8 flex flex-col items-center justify-center text-center">
        <h2
          className="text-2xl font-bold mb-4"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Thank You!
        </h2>
        <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Your submission helps researchers track and protect box turtle populations.{' '}
          <button onClick={() => navigate('/about')} className="underline">Learn more here</button>.
        </p>
        <button
          onClick={() => navigate('/instructions')}
          className="px-8 py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: siteColor }}
        >
          Identify Another Turtle
        </button>
      </div>
      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
```

- [ ] **Step 4: Rewrite AboutPage**

Write `src/public/AboutPage.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col px-4 py-8" style={{ backgroundColor: 'var(--color-bg)' }}>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm self-start"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        ← Back
      </button>
      <h2
        className="text-xl font-bold mb-4"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}
      >
        About
      </h2>
      <div className="flex flex-col gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <p>
          Box Turtle ID is a citizen science tool that helps researchers track Eastern Box Turtle
          populations at field sites. By uploading photos of turtles you encounter, you contribute
          to long-term population monitoring studies.
        </p>
        <p>
          The app uses computer vision (SIFT algorithm) to match turtle shell patterns against a
          database of known individuals. Each turtle's carapace has a unique pattern, similar to a
          human fingerprint.
        </p>
        <p>
          Your photos and observation data are stored securely and used only for research purposes.
          Email addresses provided for notifications are not shared with third parties.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/public/NoMatchPage.tsx src/public/NewTurtleSubmissionPage.tsx src/public/ThankYouPage.tsx src/public/AboutPage.tsx && git commit -m "feat: rewrite remaining public pages for React Router + API"
```

---

## Task 15: Create Admin Pages

**Files:**
- Create: `src/admin/Dashboard.tsx`
- Create: `src/admin/Compare.tsx`
- Create: `src/admin/Search.tsx`
- Create: `src/admin/TurtleProfile.tsx`
- Create: `src/admin/Settings.tsx`
- Create: `src/admin/Sync.tsx`

- [ ] **Step 1: Write Dashboard**

Write `src/admin/Dashboard.tsx`:

```typescript
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTurtles } from '../shared/lib/api';

export default function Dashboard() {
  const { data: turtles, isLoading } = useQuery({
    queryKey: ['turtles'],
    queryFn: fetchTurtles,
  });

  const patuxentCount = turtles?.filter((t) => t.site === 'patuxent').length ?? 0;
  const wallkillCount = turtles?.filter((t) => t.site === 'wallkill').length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold">{turtles?.length ?? 0}</div>
            <div className="text-sm text-gray-500">Total Turtles</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold" style={{ color: '#3a7d44' }}>{patuxentCount}</div>
            <div className="text-sm text-gray-500">Patuxent</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold" style={{ color: '#c8622a' }}>{wallkillCount}</div>
            <div className="text-sm text-gray-500">Wallkill</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/compare" className="bg-white rounded-lg p-4 border hover:bg-gray-50 text-center">
          Compare Images
        </Link>
        <Link to="/admin/search" className="bg-white rounded-lg p-4 border hover:bg-gray-50 text-center">
          Search Database
        </Link>
        <Link to="/admin/settings" className="bg-white rounded-lg p-4 border hover:bg-gray-50 text-center">
          SIFT Settings
        </Link>
        <Link to="/admin/sync" className="bg-white rounded-lg p-4 border hover:bg-gray-50 text-center">
          Airtable Sync
        </Link>
      </div>

      {turtles && turtles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Turtles</h2>
          <div className="flex flex-col gap-2">
            {turtles.map((t) => (
              <Link
                key={t.id}
                to={`/admin/turtles/${t.id}`}
                className="bg-white rounded-lg p-3 border hover:bg-gray-50 flex justify-between items-center"
              >
                <span className="font-medium">{t.name || t.external_id}</span>
                <span className="text-sm text-gray-500">{t.site}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write Compare**

Write `src/admin/Compare.tsx`:

```typescript
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { compareTwoImages, imageUrl } from '../shared/lib/api';
import type { CompareResponse } from '../shared/types';

export default function Compare() {
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!image1 || !image2) throw new Error('Both images required');
      return compareTwoImages(image1, image2);
    },
  });

  const result: CompareResponse | undefined = mutation.data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-gray-500 mb-4 inline-block">← Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6">Compare Two Images</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[{ file: image1, set: setImage1, ref: ref1, label: 'Image 1' },
          { file: image2, set: setImage2, ref: ref2, label: 'Image 2' }].map(({ file, set, ref, label }) => (
          <div key={label}>
            <button
              onClick={() => ref.current?.click()}
              className="w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden"
            >
              {file ? (
                <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400">{label}</span>
              )}
            </button>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) set(e.target.files[0]); }} />
          </div>
        ))}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!image1 || !image2 || mutation.isPending}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
      >
        {mutation.isPending ? 'Comparing...' : 'Compare'}
      </button>

      {result && (
        <div className="mt-6 bg-white rounded-lg border p-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div><div className="text-2xl font-bold">{result.score.toFixed(1)}</div><div className="text-sm text-gray-500">Score</div></div>
            <div><div className="text-2xl font-bold">{result.is_match ? 'Yes' : 'No'}</div><div className="text-sm text-gray-500">Match</div></div>
            <div><div className="text-2xl font-bold">{result.match_count}</div><div className="text-sm text-gray-500">Keypoints</div></div>
          </div>
          {result.visualization_path && (
            <img src={imageUrl(result.visualization_path)} alt="Visualization" className="w-full rounded-lg" />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write Search**

Write `src/admin/Search.tsx`:

```typescript
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchByImage, imageUrl } from '../shared/lib/api';
import type { SearchResponse } from '../shared/types';

export default function Search() {
  const [image, setImage] = useState<File | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!image) throw new Error('Image required');
      return searchByImage(image);
    },
  });

  const result: SearchResponse | undefined = mutation.data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-gray-500 mb-4 inline-block">← Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6">Search Database</h1>

      <button
        onClick={() => ref.current?.click()}
        className="w-full aspect-[4/3] border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden mb-4"
      >
        {image ? (
          <img src={URL.createObjectURL(image)} alt="Query" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400">Upload image to search</span>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setImage(e.target.files[0]); }} />

      <button
        onClick={() => mutation.mutate()}
        disabled={!image || mutation.isPending}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 mb-6"
      >
        {mutation.isPending ? 'Searching...' : 'Search'}
      </button>

      {result && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Compared against {result.total_compared} captures</p>
          {result.results.length === 0 ? (
            <p>No matches found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {result.results.map((r) => (
                <Link
                  key={r.capture_id}
                  to={`/admin/turtles/${r.turtle_id}`}
                  className="bg-white rounded-lg border p-3 flex items-center gap-3 hover:bg-gray-50"
                >
                  {r.thumbnail_path && (
                    <img src={imageUrl(r.thumbnail_path)} alt="" className="w-12 h-12 rounded object-cover" />
                  )}
                  <div>
                    <div className="font-medium">Turtle #{r.turtle_id}</div>
                    <div className="text-sm text-gray-500">Score: {r.score.toFixed(1)} — {r.is_match ? 'Match' : 'No match'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write TurtleProfile**

Write `src/admin/TurtleProfile.tsx`:

```typescript
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTurtle, fetchEncounters, imageUrl } from '../shared/lib/api';

export default function TurtleProfile() {
  const { id } = useParams<{ id: string }>();
  const turtleId = Number(id);

  const { data: turtle, isLoading } = useQuery({
    queryKey: ['turtle', turtleId],
    queryFn: () => fetchTurtle(turtleId),
    enabled: !isNaN(turtleId),
  });

  const { data: encounters } = useQuery({
    queryKey: ['encounters', turtleId],
    queryFn: () => fetchEncounters(turtleId),
    enabled: !isNaN(turtleId),
  });

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!turtle) return <div className="p-8 text-red-600">Turtle not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-gray-500 mb-4 inline-block">← Dashboard</Link>
      <h1 className="text-2xl font-bold mb-2">{turtle.name || turtle.external_id}</h1>
      <p className="text-sm text-gray-500 mb-6">ID: {turtle.external_id} · Site: {turtle.site ?? 'Unknown'}</p>

      {/* Photos */}
      {turtle.captures && turtle.captures.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {turtle.captures.map((c) => (
            <div key={c.id}>
              <img src={imageUrl(c.image_path)} alt={c.image_type} className="w-full aspect-square object-cover rounded-lg" />
              <span className="text-xs text-gray-400">{c.image_type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Gender:</span> {turtle.gender ?? '—'}</div>
          <div><span className="text-gray-500">First seen:</span> {turtle.first_seen}</div>
          <div><span className="text-gray-500">Species:</span> {turtle.species ?? '—'}</div>
          <div><span className="text-gray-500">Pattern:</span> {turtle.pattern ?? '—'}</div>
        </div>
        {turtle.notes && <p className="mt-3 text-sm text-gray-600">{turtle.notes}</p>}
      </div>

      {/* Encounters */}
      <h2 className="text-lg font-semibold mb-3">Encounters ({encounters?.length ?? 0})</h2>
      {encounters && encounters.length > 0 ? (
        <div className="flex flex-col gap-2">
          {encounters.map((e) => (
            <div key={e.id} className="bg-white rounded-lg border p-3 text-sm">
              <div className="font-medium">{e.encounter_date ?? 'Date unknown'}</div>
              <div className="text-gray-500">
                {[e.plot_name, e.health_status, e.behavior].filter(Boolean).join(' · ') || 'No details'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No encounters recorded.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write Settings**

Write `src/admin/Settings.tsx`:

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchSettings, updateSettings } from '../shared/lib/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const [form, setForm] = useState<{ distance_coefficient: string; acceptance_threshold: string; resized_width: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('No form data');
      return updateSettings({
        distance_coefficient: parseFloat(form.distance_coefficient),
        acceptance_threshold: parseFloat(form.acceptance_threshold),
        resized_width: parseInt(form.resized_width),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  // Initialize form from data
  if (data && !form) {
    setForm({
      distance_coefficient: String(data.distance_coefficient),
      acceptance_threshold: String(data.acceptance_threshold),
      resized_width: String(data.resized_width),
    });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-gray-500 mb-4 inline-block">← Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6">SIFT Settings</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : form ? (
        <div className="flex flex-col gap-4">
          {[
            { key: 'distance_coefficient' as const, label: 'Distance Coefficient', step: '0.01' },
            { key: 'acceptance_threshold' as const, label: 'Acceptance Threshold', step: '0.1' },
            { key: 'resized_width' as const, label: 'Resized Width (px)', step: '1' },
          ].map(({ key, label, step }) => (
            <div key={key}>
              <label className="text-sm text-gray-600 mb-1 block">{label}</label>
              <input
                type="number"
                step={step}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          ))}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {mutation.isSuccess && <p className="text-green-600 text-sm">Settings saved.</p>}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Write Sync**

Write `src/admin/Sync.tsx`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { triggerSync } from '../shared/lib/api';
import type { SyncResponse } from '../shared/types';

export default function Sync() {
  const mutation = useMutation({ mutationFn: triggerSync });
  const result: SyncResponse | undefined = mutation.data;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-gray-500 mb-4 inline-block">← Dashboard</Link>
      <h1 className="text-2xl font-bold mb-6">Airtable Sync</h1>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 mb-6"
      >
        {mutation.isPending ? 'Syncing...' : 'Trigger Full Sync'}
      </button>

      {mutation.isError && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
          Error: {mutation.error?.message ?? 'Sync failed'}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg border p-4">
          <div className="font-semibold mb-2">Status: {result.status}</div>
          {result.message && <p className="text-sm text-gray-500 mb-2">{result.message}</p>}
          {result.result && (
            <div className="text-sm">
              <div>Turtles — Created: {result.result.turtles.created}, Updated: {result.result.turtles.updated}</div>
              <div>Encounters — Created: {result.result.encounters.created}, Updated: {result.result.encounters.updated}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/admin/ && git commit -m "feat: add admin dashboard pages"
```

---

## Task 16: Rewrite App.tsx with React Router

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Write `src/App.tsx`:

```typescript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import WelcomePage from './public/WelcomePage';
import InstructionPage from './public/InstructionPage';
import PossibleMatchPage from './public/PossibleMatchPage';
import MatchProfilePage from './public/MatchProfilePage';
import MatchEncounterPage from './public/MatchEncounterPage';
import NoMatchPage from './public/NoMatchPage';
import NewTurtleSubmissionPage from './public/NewTurtleSubmissionPage';
import ThankYouPage from './public/ThankYouPage';
import AboutPage from './public/AboutPage';

// Lazy-load admin routes
const AdminDashboard = lazy(() => import('./admin/Dashboard'));
const AdminCompare = lazy(() => import('./admin/Compare'));
const AdminSearch = lazy(() => import('./admin/Search'));
const AdminTurtleProfile = lazy(() => import('./admin/TurtleProfile'));
const AdminSettings = lazy(() => import('./admin/Settings'));
const AdminSync = lazy(() => import('./admin/Sync'));

function AdminFallback() {
  return <div className="p-8 text-gray-500">Loading...</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/instructions" element={<InstructionPage />} />
      <Route path="/results" element={<PossibleMatchPage />} />
      <Route path="/results/no-match" element={<NoMatchPage />} />
      <Route path="/results/new-turtle" element={<NewTurtleSubmissionPage />} />
      <Route path="/results/:turtleId" element={<MatchProfilePage />} />
      <Route path="/encounter" element={<MatchEncounterPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Admin routes (lazy-loaded) */}
      <Route
        path="/admin"
        element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>}
      />
      <Route
        path="/admin/compare"
        element={<Suspense fallback={<AdminFallback />}><AdminCompare /></Suspense>}
      />
      <Route
        path="/admin/search"
        element={<Suspense fallback={<AdminFallback />}><AdminSearch /></Suspense>}
      />
      <Route
        path="/admin/turtles/:id"
        element={<Suspense fallback={<AdminFallback />}><AdminTurtleProfile /></Suspense>}
      />
      <Route
        path="/admin/settings"
        element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>}
      />
      <Route
        path="/admin/sync"
        element={<Suspense fallback={<AdminFallback />}><AdminSync /></Suspense>}
      />
    </Routes>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx && git commit -m "feat: rewrite App.tsx with React Router + lazy admin routes"
```

---

## Task 17: Rewrite main.tsx with Providers

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Rewrite main.tsx**

Write `src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SiteProvider } from './shared/context/SiteContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SiteProvider>
          <App />
        </SiteProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 2: Commit**

```bash
git add src/main.tsx && git commit -m "feat: add BrowserRouter + QueryClient + SiteProvider to main.tsx"
```

---

## Task 18: Update Tailwind Config + Cleanup

**Files:**
- Modify: `tailwind.config.js`
- Delete: `src/services/airtable.ts`
- Delete: `src/components/DevRoutingModal.tsx`

- [ ] **Step 1: Update Tailwind content paths**

The existing `tailwind.config.js` has `content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']` which already covers the new directory structure. No change needed.

- [ ] **Step 2: Delete old files**

```bash
rm src/services/airtable.ts
rm src/components/DevRoutingModal.tsx
```

- [ ] **Step 3: Delete old page and component directories (now moved)**

```bash
rm -rf src/pages/
rm -rf src/components/
rm -rf src/services/
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: remove old pages/, components/, services/ directories"
```

---

## Task 19: Build + Verify

- [ ] **Step 1: Check TypeScript compilation**

```bash
bun run build 2>&1
```

Expected: Build succeeds. If there are import errors, fix them — likely missing asset imports or type issues.

- [ ] **Step 2: Start dev server and verify public flow**

```bash
bun run dev
```

Open `http://localhost:5173` in browser. Verify:
- Welcome page loads with site selection
- Clicking a site navigates to `/instructions`
- URL changes work (browser back/forward)
- Admin at `/admin` loads (lazy)

- [ ] **Step 3: Start backend and test full flow**

In a separate terminal:
```bash
cd backend && source .venv/bin/activate && uvicorn app.main:app --port 8000 --reload
```

Then test:
- Upload a photo on InstructionPage → should POST to backend, navigate to results
- If no turtles in DB, should go to no-match page
- Admin dashboard at `/admin` should show turtle count

- [ ] **Step 4: Fix any build or runtime errors found**

Address any TypeScript errors, missing imports, or runtime issues.

- [ ] **Step 5: Commit fixes**

```bash
git add -A && git commit -m "fix: resolve build and runtime issues from restructure"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Replace airtable.ts with API client — Task 4
- [x] submitPhotos → POST /api/submissions/identify — Task 4, Task 10
- [x] confirmMatch → POST /api/submissions/{id}/confirm — Task 4, Task 13
- [x] submitNewTurtle → POST /api/submissions/{id}/new-turtle — Task 4, Task 14
- [x] Remove DevRoutingModal — Task 18
- [x] Remove DEMO_CANDIDATES — Task 16 (App.tsx rewrite)
- [x] React Router with URL paths — Tasks 9-16
- [x] TanStack Query — Tasks 10-15
- [x] SiteContext — Task 5
- [x] Bun migration — Task 1
- [x] Directory reorganization (public/admin/shared) — Tasks 7, 8, 15
- [x] Admin dashboard pages — Task 15
- [x] Lazy-loaded admin routes — Task 16
- [x] VITE_API_URL env var — Task 4
- [x] ConfidenceBadge with real scores — Task 6
- [x] SIFT visualization on MatchProfilePage — Task 12

**Placeholder scan:** No TBD/TODO found.

**Type consistency:** `SubmissionCandidate`, `IdentifyResponse`, `EncounterFormData`, `ConfirmResponse`, `NewTurtleResponse` — all consistent between shared types, API client, and page components. `EncounterFormData` in shared types matches the API client's snake_case conversion in `confirmMatch` and `submitNewTurtle`.
