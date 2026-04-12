# Frontend Restructure — Wire to FastAPI Backend

**Date:** 2026-04-12
**Status:** Approved

## Overview

Rewire the box-turtle-id frontend to talk to the FastAPI backend (Postgres-backed) instead of Airtable directly. Airtable becomes a background sync target managed by the backend. Also: migrate from npm to Bun, add React Router for URL-based navigation, add TanStack Query for data fetching, reorganize directory structure, and add a minimal admin dashboard.

## Tech Stack Changes

- **Package manager:** npm → Bun
- **Routing:** Manual page state in App.tsx → React Router
- **Data fetching:** Manual useEffect/useState → TanStack Query
- **Backend communication:** Direct Airtable API calls → FastAPI API client

## Directory Structure

```
src/
├── public/                    # Citizen science pages
│   ├── WelcomePage.tsx
│   ├── InstructionPage.tsx
│   ├── PossibleMatchPage.tsx
│   ├── MatchProfilePage.tsx
│   ├── MatchEncounterPage.tsx
│   ├── NoMatchPage.tsx
│   ├── NewTurtleSubmissionPage.tsx
│   ├── ThankYouPage.tsx
│   └── AboutPage.tsx
├── admin/                     # Research dashboard (lazy-loaded)
│   ├── Dashboard.tsx
│   ├── Compare.tsx
│   ├── Search.tsx
│   ├── TurtleProfile.tsx
│   ├── Settings.tsx
│   └── Sync.tsx
├── shared/
│   ├── components/            # SiteBand, Footer, EncounterForm, ConfidenceBadge
│   ├── lib/
│   │   └── api.ts             # Typed fetch wrapper for all backend endpoints
│   └── types/
│       └── index.ts           # Shared TypeScript interfaces
├── assets/                    # Static images (maps, turtle reference photos)
├── App.tsx                    # React Router setup, SiteContext provider
├── main.tsx                   # Entry point with QueryClientProvider
└── index.css                  # Global styles, CSS custom properties
```

## API Client (`shared/lib/api.ts`)

Typed fetch wrapper. Base URL from `VITE_API_URL` env var (empty string in production = same origin).

### Public Endpoints

```typescript
// Photo submission + SIFT matching
submitPhotos(site: string, files: { top: File, left?: File, right?: File }): Promise<IdentifyResponse>
// → POST /api/submissions/identify (multipart/form-data)

// Confirm match with existing turtle
confirmMatch(submissionId: string, turtleId: number, encounterData: EncounterFormData): Promise<ConfirmResponse>
// → POST /api/submissions/{submissionId}/confirm

// Submit as new turtle
submitNewTurtle(submissionId: string, nickname: string, encounterData: EncounterFormData, site: string): Promise<NewTurtleResponse>
// → POST /api/submissions/{submissionId}/new-turtle
```

### Read Endpoints (used by match pages + admin)

```typescript
// Fetch single turtle by ID
fetchTurtle(turtleId: number): Promise<TurtleResponse>
// → GET /api/turtles/{turtleId}

// Fetch encounters for a turtle
fetchEncounters(turtleId: number): Promise<EncounterRecord[]>
// → GET /api/turtles/{turtleId}/encounters

// List all turtles (admin)
fetchTurtles(): Promise<TurtleResponse[]>
// → GET /api/turtles
```

### Admin Endpoints

```typescript
// Two-image comparison
compareTwoImages(image1: File, image2: File): Promise<CompareResponse>
// → POST /api/compare

// Database search by image
searchByImage(image: File): Promise<SearchResponse>
// → POST /api/search

// SIFT settings
fetchSettings(): Promise<SiftSettingsResponse>
updateSettings(settings: SiftSettingsUpdate): Promise<SiftSettingsResponse>
// → GET/PUT /api/settings

// Airtable sync
triggerSync(): Promise<SyncResponse>
// → POST /api/sync/airtable
```

## TypeScript Types (`shared/types/index.ts`)

```typescript
interface IdentifyResponse {
  candidates: SubmissionCandidate[]
  total_compared: number
  processing_time_ms: number
  submission_id: string
}

interface SubmissionCandidate {
  turtle_id: number
  turtle_nickname: string | null
  score: number
  confidence: 'high' | 'medium' | 'low'
  visualization_url: string | null
  thumbnail_url: string | null
}

interface ConfirmResponse {
  success: boolean
  encounter_id: number
}

interface NewTurtleResponse {
  success: boolean
  turtle_id: number
}

interface EncounterFormData {
  date: string
  location: string
  setting: string[]
  conditions: string[]
  behaviors: string[]
  health: string
  observation_notes: string
  nickname: string
  notify_me: boolean
  email: string
}

type Site = 'patuxent' | 'wallkill'
```

## Routing (React Router)

### Public Routes

```
/                       → WelcomePage (site selection)
/instructions           → InstructionPage (photo upload)
/results                → PossibleMatchPage (ranked candidates)
/results/:turtleId      → MatchProfilePage (side-by-side with visualization)
/results/no-match       → NoMatchPage
/results/new-turtle     → NewTurtleSubmissionPage
/encounter              → MatchEncounterPage
/thank-you              → ThankYouPage
/about                  → AboutPage
```

### Admin Routes (lazy-loaded)

```
/admin                  → Dashboard
/admin/compare          → Compare
/admin/search           → Search
/admin/turtles/:id      → TurtleProfile
/admin/settings         → Settings
/admin/sync             → Sync
```

## State Management

- **SiteContext** — React context provider wrapping the app. Stores selected site. Set on WelcomePage, consumed by SiteBand and any component needing site color theming.
- **Submission flow state** — `submissionId` and `candidates` passed via React Router `useNavigate` state from InstructionPage to PossibleMatchPage. `submissionId` threads through to confirm/new-turtle pages.
- **Admin** — TanStack Query manages all server state. No local state management needed.

## Public Flow Changes

### InstructionPage
- On "Identify My Turtle": calls `submitPhotos(site, files)` via `useMutation`
- Shows loading spinner during SIFT processing
- On success: navigates to `/results` with `{ submissionId, candidates }` in router state
- On error: shows error message, user can retry

### PossibleMatchPage
- Reads `candidates` from router state (no fetch needed, data came from identify response)
- Each CandidateCard shows: thumbnail from `candidate.thumbnail_url`, nickname, score as percentage, confidence badge (color-coded)
- "Select" navigates to `/results/:turtleId` with `{ submissionId, candidate }` in state

### MatchProfilePage
- Fetches full turtle data via `useQuery(['turtle', turtleId], () => fetchTurtle(turtleId))`
- Shows side-by-side: user's uploaded photo (from submission) + database photo
- Shows SIFT visualization image from `candidate.visualization_url`
- "This Is My Turtle" → navigates to `/encounter` with `{ submissionId, turtleId }`
- "Not My Turtle" → navigates back to `/results`

### MatchEncounterPage
- Reads `submissionId` and `turtleId` from router state
- EncounterForm collects observation data
- On submit: calls `confirmMatch(submissionId, turtleId, formData)` via `useMutation`
- On success: navigates to `/thank-you`

### NewTurtleSubmissionPage
- Reads `submissionId` from router state
- EncounterForm with `includeNickname=true`
- On submit: calls `submitNewTurtle(submissionId, nickname, formData, site)` via `useMutation`
- On success: navigates to `/thank-you`

### Removed
- `DevRoutingModal` — deleted entirely
- `src/services/airtable.ts` — deleted entirely
- `DEMO_CANDIDATES` in App.tsx — deleted
- `DEV_MOCK_TURTLE` in MatchProfilePage — deleted

## Admin Dashboard

All pages are minimal — functional but not polished. No auth.

### Dashboard (`/admin`)
- Fetches turtle list via `useQuery`. Shows total count, site breakdown.
- Recent encounters list.
- Quick action buttons: Compare, Search, Sync.

### Compare (`/admin/compare`)
- Two file upload zones. Upload both, POST to `/api/compare`.
- Shows: match score, is_match boolean, SIFT visualization image.

### Search (`/admin/search`)
- Single file upload. POST to `/api/search`.
- Shows ranked results with scores and thumbnails.

### TurtleProfile (`/admin/turtles/:id`)
- Fetches turtle + captures + encounters.
- Shows all photos, metadata, encounter timeline.
- Edit form for turtle metadata (name, gender, notes).

### Settings (`/admin/settings`)
- Fetches current SIFT settings. Form to update distance_coefficient, acceptance_threshold, resized_width.

### Sync (`/admin/sync`)
- Button to trigger `POST /api/sync/airtable`.
- Shows sync result (created/updated counts).

## Tooling Changes

### Bun Migration
- Delete `package-lock.json`
- Run `bun install` to generate `bun.lock`
- Update any npm scripts if needed (Bun runs package.json scripts natively)
- Add `bun.lock` to git

### New Dependencies
- `react-router-dom` (^7)
- `@tanstack/react-query` (^5)

### Vite Config
- No proxy needed — API client uses `VITE_API_URL` env var
- Add `.env.development` with `VITE_API_URL=http://localhost:8000`

### Environment Files
- `.env.development`: `VITE_API_URL=http://localhost:8000`
- `.env.production`: `VITE_API_URL=` (empty, same origin)
- Remove old `VITE_AIRTABLE_*` env vars

## Site Theming

Unchanged. SiteBand and site-based color theming continue to work via SiteContext. Colors remain: Patuxent green `#3a7d44`, Wallkill orange `#c8622a`.
