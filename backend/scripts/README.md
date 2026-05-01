# Backend scripts

## `sync_airtable.py`

Pull from / push to Airtable. Idempotent.

### Usage

```bash
cd backend

# Pull everything from Airtable (full re-pull)
.venv/bin/python -m scripts.sync_airtable pull

# Only pull records modified since last successful sync
.venv/bin/python -m scripts.sync_airtable pull --incremental

# Pull metadata only, no image attachments
.venv/bin/python -m scripts.sync_airtable pull --no-images

# Pull images but skip SIFT (fast download phase only)
.venv/bin/python -m scripts.sync_airtable pull --no-sift

# Selective table subset
.venv/bin/python -m scripts.sync_airtable pull --tables turtles,encounters

# Run SIFT on captures that don't have keypoints yet (no network)
.venv/bin/python -m scripts.sync_airtable extract-sift
.venv/bin/python -m scripts.sync_airtable extract-sift --limit 50

# Push new local turtles + encounters (and their photos) up to Airtable
.venv/bin/python -m scripts.sync_airtable push
.venv/bin/python -m scripts.sync_airtable push --dry-run

# Pull then push
.venv/bin/python -m scripts.sync_airtable sync
```

### Two-phase image import

For large image sets, run the download and SIFT extraction as separate phases
so they can be interrupted/resumed independently:

```bash
# Phase 1 — download all attachments, no SIFT (fast, network-bound)
.venv/bin/python -m scripts.sync_airtable pull --tables attachments --no-sift

# Phase 2 — extract SIFT features locally (CPU-bound, no Airtable hits)
.venv/bin/python -m scripts.sync_airtable extract-sift
```

### How edits flow back

- Edits made in Airtable are pulled by `pull` (overwrites the mapped local
  fields for matched records). Run on a cron or by hand.
- New rows created in the app push to Airtable on `push`. Once a row has an
  `airtable_record_id` it will not be re-pushed.
- New image captures attached to an encounter created in the app are uploaded
  to Airtable when that encounter is pushed.
- Local-only fields (SIFT keypoints, image_path, captures.id, app submissions,
  match_results) are never overwritten by a pull.

### Cron example (every 15 min)

```cron
*/15 * * * * cd /path/to/box-turtle-id/backend && .venv/bin/python -m scripts.sync_airtable sync --incremental >> /var/log/turtle-sync.log 2>&1
```

## `recreate_db.py`

Drops and recreates all tables. **Dev only — destroys local data.**

```bash
cd backend && .venv/bin/python -m scripts.recreate_db --yes
```
