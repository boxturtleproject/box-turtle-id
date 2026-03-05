# Dev Hub Design

**Date:** 2026-03-05

## Overview

A lightweight Node.js hub server (`scripts/dev-hub.mjs`) that discovers all git worktrees, lets the developer start individual Vite dev servers on demand, and shows merge status to make cleanup obvious. Started with `npm run hub` from the main repo root.

## Architecture

- **Hub server:** Plain Node.js HTTP server, no npm dependencies, runs on port 5100
- **Hub page:** Self-contained HTML served at `http://localhost:5100`, auto-opens in the browser on startup
- **Vite dev servers:** Spawned as child processes by the hub server, one per worktree, on demand
- **Port assignment:** Main repo → 5173, worktrees in `git worktree list` order → 5174, 5175, …

## Worktree Discovery

On startup (and on each `/api/status` poll), the hub runs `git worktree list --porcelain` in the main repo root and parses the output into a list of `{ id, path, branch, commit }` entries. Ports are assigned by stable index order so the same worktree always gets the same port within a session.

## Hub Page

Each worktree is shown as a card with:

- **Branch name** and short commit hash
- **Merge status badge:** `merged` (muted) or `unmerged` (highlighted) — computed via `git merge-base --is-ancestor <branch> main`
- **Server status badge:** `idle` / `starting…` / `ready` / `error`
- **Start button** — visible when server is idle or errored; POSTs to `/api/start/:id`
- **Open button** — visible when server is ready; opens `http://localhost:<port>` in a new tab
- **Remove button** — visible only when merge status is `merged`; POSTs to `/api/remove/:id` which runs `git worktree remove --force` and refreshes the list

The page polls `GET /api/status` every 1.5 seconds and updates badges in place without a full page reload.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serves the hub HTML page |
| `GET` | `/api/status` | Returns JSON array of worktree state |
| `POST` | `/api/start/:id` | Spawns `vite dev --port <N>` for that worktree (idempotent) |
| `POST` | `/api/remove/:id` | Runs `git worktree remove --force <path>`, only allowed if branch is merged |

## State per Worktree

```js
{
  id: string,          // stable index as string
  path: string,        // absolute path to worktree
  branch: string,      // e.g. "claude/wonderful-dhawan" or "main"
  commit: string,      // short hash
  port: number,        // assigned port
  merged: boolean,     // is branch fully merged into main?
  serverState: 'idle' | 'starting' | 'ready' | 'error',
  process: ChildProcess | null,
}
```

## Lifecycle

- Hub process owns all child Vite processes; `SIGINT` on the hub kills all children
- Worktree removal is blocked at the API level if `merged === false`
- Adding a new worktree externally is picked up on the next status poll

## Out of Scope

- Stopping individual servers (the hub process exits cleanly and kills all children)
- Merging branches (still done manually via git)
- Authentication or access control
