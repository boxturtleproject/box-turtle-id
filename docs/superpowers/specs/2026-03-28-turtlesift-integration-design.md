# TurtleSift + Box-Turtle-ID Integration Design

**Date:** 2026-03-28
**Status:** Approved

## Overview

Combine the box-turtle-id citizen science frontend with turtlesift's SIFT-based matching engine into a single full-stack application. The merged app serves two audiences: public users (citizen scientists reporting turtle sightings) and researchers (admin dashboard for data management and matching tools). Deployed as a single Railway service.

## Tech Stack

- **Backend:** FastAPI (Python 3.11+), SQLAlchemy, PostgreSQL, OpenCV (SIFT), Pillow, UV
- **Frontend:** Bun, Vite, React 19, TypeScript, Tailwind CSS, React Router, TanStack Query
- **Deployment:** Railway (single service), FastAPI serves built frontend as static files
- **Data:** PostgreSQL (primary), Airtable (two-way on-demand sync)

## Repository Structure

```
box-turtle-id/
├── backend/                    # FastAPI (Python 3.11+)
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, static serving
│   │   ├── config.py           # Pydantic settings
│   │   ├── database.py         # SQLAlchemy + Postgres
│   │   ├── models/
│   │   │   ├── turtle.py       # Turtle, Capture (with SIFT data)
│   │   │   ├── encounter.py    # Encounter records
│   │   │   └── match.py        # Cached match results
│   │   ├── services/
│   │   │   ├── sift.py         # SIFT feature extraction + matching
│   │   │   ├── image.py        # Image loading, resize, EXIF, thumbnails
│   │   │   ├── cropper.py      # YOLO + threshold-based cropping
│   │   │   └── airtable.py     # Two-way Airtable sync (on-demand)
│   │   ├── api/
│   │   │   ├── compare.py      # POST /compare, POST /search
│   │   │   ├── turtles.py      # Turtle/capture/encounter CRUD
│   │   │   ├── settings.py     # SIFT parameter tuning
│   │   │   ├── submissions.py  # Public photo submission endpoint
│   │   │   └── sync.py         # Airtable sync triggers
│   │   └── schemas/            # Pydantic request/response models
│   ├── yolo/                   # YOLO model weights
│   ├── data/                   # Image/thumbnail storage
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Bun + Vite + React 19 + TypeScript
│   ├── src/
│   │   ├── App.tsx             # React Router: / = public, /admin = research
│   │   ├── public/             # Citizen science pages
│   │   │   ├── WelcomePage.tsx
│   │   │   ├── InstructionPage.tsx
│   │   │   ├── PossibleMatchPage.tsx
│   │   │   ├── MatchProfilePage.tsx
│   │   │   ├── MatchEncounterPage.tsx
│   │   │   ├── NoMatchPage.tsx
│   │   │   ├── NewTurtleSubmissionPage.tsx
│   │   │   ├── ThankYouPage.tsx
│   │   │   └── AboutPage.tsx
│   │   ├── admin/              # Research dashboard pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Compare.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── TurtleProfile.tsx
│   │   │   └── Settings.tsx
│   │   ├── shared/             # Shared between public + admin
│   │   │   ├── components/     # SiteBand, Footer, photo displays
│   │   │   ├── lib/            # API client, utils
│   │   │   └── types/          # Shared TypeScript interfaces
│   │   └── assets/             # Static images (maps, illustrations)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── bun.lock
│   └── package.json
├── railway.toml                # Single service config
└── nixpacks.toml               # Build config
```

## Backend: Matching Integration

### Public Submission Endpoint: `POST /api/submissions/identify`

**Input:** multipart/form-data
- `top`: File (required) — carapace top photo
- `left`: File (optional)
- `right`: File (optional)
- `other[]`: File[] (optional)
- `site`: string (`"patuxent"` | `"wallkill"`)

**Processing:**
1. Load top image via ImageService
2. Preprocess (optional YOLO crop, resize to 250px)
3. Extract SIFT features
4. Query all Captures in Postgres that have cached SIFT descriptors (filtered by site if captures have site metadata)
5. Compare query features against each DB capture via FLANN + Lowe's ratio test
6. Generate match visualization for top candidates
7. Save uploaded images to `data/submissions/{submission_id}/` — kept for 24 hours if unconfirmed, moved to `data/images/` permanently on confirmation

**Output:**
```json
{
  "candidates": [
    {
      "turtle_id": 5,
      "turtle_nickname": "T106",
      "score": 92.1,
      "confidence": "high",
      "visualization_url": "/api/visualizations/viz_uuid.jpg",
      "thumbnail_url": "/api/thumbnails/turtle_5_thumb.jpg"
    }
  ],
  "total_compared": 127,
  "processing_time_ms": 2341,
  "submission_id": "uuid"
}
```

**Confidence mapping** (SIFT score to UI badge):
- **high**: score >= 75
- **medium**: score 40-75
- **low**: score 4-40
- Below threshold (4.0): not returned

### Confirmation Endpoint: `POST /api/submissions/{submission_id}/confirm`

**Input:** `{ turtle_id: number, encounter_data: EncounterFormData }`

**Processing:**
1. Create Encounter record in Postgres
2. Link uploaded photos as new Captures on the confirmed turtle
3. Extract and cache SIFT features for the new captures
4. Trigger Airtable sync (write encounter + turtle update)

**Output:** `{ success: true, encounter_id: number }`

### New Turtle Endpoint: `POST /api/submissions/{submission_id}/new-turtle`

**Input:** `{ nickname: string, encounter_data: EncounterFormData, site: string }`

**Processing:**
1. Create new Turtle record in Postgres
2. Create Captures from uploaded photos, link to new turtle
3. Extract and cache SIFT features
4. Create Encounter record
5. Trigger Airtable sync (create turtle + encounter)

**Output:** `{ success: true, turtle_id: number }`

### Existing TurtleSift Endpoints (Admin)

All existing endpoints from turtlesift remain available for the admin dashboard:
- `POST /api/compare` — two-image comparison
- `POST /api/search` — database search
- `GET/POST/PATCH/DELETE /api/turtles` — CRUD
- `GET/PUT /api/settings` — SIFT parameter tuning

## Airtable Two-Way Sync

### Design

On-demand sync triggered by app actions, not continuous polling. Last-write-wins conflict resolution based on timestamps.

Each synced record stores `last_synced_at` and `airtable_record_id` in Postgres.

### Postgres to Airtable (write events)

Triggered by:
1. New turtle created (public submission or admin)
2. New encounter recorded
3. Turtle metadata updated (admin)
4. New capture added

Sync calls are fire-and-forget async. Failed syncs are queued for retry.

### Airtable to Postgres (read events)

Triggered by:
1. Admin triggers manual sync (button in admin dashboard)
2. Optional bootstrap sync on app startup/deploy

### Field Mapping

| Postgres | Airtable Field | Direction |
|----------|---------------|-----------|
| Turtle.external_id | `{Turtle ID}` | bidirectional |
| Turtle.name | `{Name}` (nickname) | bidirectional |
| Turtle.gender | `{Gender}` | bidirectional |
| Turtle.first_seen | `{Date First Identified}` | bidirectional |
| Capture.image_path | `{Carapace Top/Left/Right}` | Postgres to Airtable (as attachment URLs) |
| Encounter.date | `{Date}` | bidirectional |
| Encounter linked turtles | `{Turtle ID}` (linked records) | bidirectional |

### Service Layer

```python
class AirtableSyncService:
    async def push_turtle(turtle_id: int)
    async def push_encounter(encounter_id: int)
    async def pull_all_turtles()
    async def pull_all_encounters()
    async def full_sync()
```

### Sync Endpoint

`POST /api/sync/airtable` — Admin-only, triggers full bidirectional sync, returns summary of created/updated/conflicts.

## Frontend Architecture

### Routing (React Router)

**Public routes:**
```
/                       → WelcomePage (site selection)
/instructions           → InstructionPage (photo upload)
/results                → PossibleMatchPage (ranked candidates with scores)
/results/:turtleId      → MatchProfilePage (side-by-side with visualization)
/results/no-match       → NoMatchPage
/results/new-turtle     → NewTurtleSubmissionPage
/encounter              → MatchEncounterPage (record observation)
/thank-you              → ThankYouPage
/about                  → AboutPage
```

**Admin routes (lazy-loaded):**
```
/admin                  → Dashboard (stats, quick actions)
/admin/compare          → Compare (two-image comparison tool)
/admin/search           → Search (database search)
/admin/turtles/:id      → TurtleProfile (full detail + encounter timeline)
/admin/settings         → Settings (SIFT parameter tuning)
/admin/sync             → Airtable sync trigger + status
```

### State Management

- **Public flow:** React Router + URL params carry submission context. `submission_id` from the identify endpoint threads through the flow. Selected site stored in a context provider.
- **Admin:** TanStack Query for server state (turtle lists, search results, settings).

### Shared Components (`shared/`)

- `SiteBand` — fixed top bar with site name/color
- `Footer` — app footer
- `TurtlePhotos` — displays carapace images in a grid
- `MatchVisualization` — shows SIFT keypoint visualization image
- `ConfidenceBadge` — high/medium/low badge driven by real scores
- API client in `shared/lib/api.ts` — typed fetch wrapper for all endpoints

### Enhanced Match Experience

- `PossibleMatchPage` shows candidates with real SIFT scores and confidence badges
- `MatchProfilePage` shows side-by-side: user's uploaded photo + database photo, with SIFT keypoint visualization below
- Score displayed as a percentage with confidence label (not raw SIFT details)

### Code Splitting

- `/admin/*` routes lazy-loaded — public users never download the admin bundle
- Public pages remain lightweight

## Deployment (Railway)

### Single Service

FastAPI serves both the API and built frontend static files.

**Build process:**
1. Install Python dependencies (UV)
2. Install Bun + frontend dependencies
3. `bun run build` → outputs to `frontend/dist/`
4. FastAPI mounts `frontend/dist/` as static files
5. Catch-all route serves `index.html` for client-side routing

### Railway Config

```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/health"
```

### Environment Variables

```
# Database (Railway Postgres plugin)
DATABASE_URL=postgresql://...

# Airtable sync
AIRTABLE_TOKEN=...
AIRTABLE_BASE_ID=...
AIRTABLE_TURTLES_TABLE=...
AIRTABLE_ENCOUNTERS_TABLE=...

# SIFT defaults (optional, has sensible defaults)
SIFT_DISTANCE_COEFFICIENT=0.67
SIFT_ACCEPTANCE_THRESHOLD=4.0
SIFT_RESIZED_WIDTH=250

# App
ENVIRONMENT=production
```

### File Storage

Uploaded images and thumbnails stored on Railway's filesystem under `data/`. Images also synced to Airtable as attachments for backup. For long-term persistence across deploys, Railway volumes or S3-compatible storage can be added later.

### YOLO Model

Bundled in repo under `backend/yolo/`. Loaded once at FastAPI startup.
