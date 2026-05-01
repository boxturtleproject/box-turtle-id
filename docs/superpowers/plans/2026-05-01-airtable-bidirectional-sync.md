# Airtable Bidirectional Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the thin existing Airtable sync stub with a real bidirectional sync that imports the full Wallkill Airtable base (turtles, encounters, surveys, plots, image attachments + SIFT features) and pushes app-created records back to Airtable. Re-runnable as a CLI script and HTTP endpoint.

**Architecture:** Single `AirtableSync` service class with one `pull_*`/`push_*` method per Airtable table. CLI wrapper at `backend/scripts/sync_airtable.py`; existing `/sync/airtable` HTTP endpoint reuses the same class. Pulls are idempotent (keyed on `airtable_record_id`); pushes only act on local rows that lack one. Image attachments downloaded once (keyed on Airtable attachment ID), SIFT features extracted during import.

**Tech Stack:** Python 3.11+, FastAPI/SQLAlchemy 2.0, requests, OpenCV (SIFT), Pillow, PostgreSQL.

**Out of scope:** Webhook-based real-time sync; pushing edits to fields on existing Airtable records (only new-record creation pushes); pulling Reports/Resources/Nests/Shell Patterns tables; deletion sync (added later via `--prune` flag if needed).

---

## Conventions

- Wallkill is the only site — every imported turtle gets `site='wallkill'` hardcoded.
- Multi-select fields stored as comma-joined strings (`", "` separator).
- `last_synced_at` is set on every row touched.
- Incremental pull uses Airtable's `LAST_MODIFIED_TIME()` formula filter, with the per-table cursor stored in the `settings` table under keys `airtable_sync.<table>.cursor`.
- All Airtable network calls go through one helper that handles pagination, 429 retries, and dry-run.

---

## File Structure

**Created:**
- `backend/scripts/__init__.py` (empty marker)
- `backend/scripts/sync_airtable.py` — CLI entrypoint
- `backend/app/models/survey.py` — Survey, Plot models
- `backend/app/services/airtable_client.py` — low-level HTTP wrapper (paginate, retry, attachment upload)
- `backend/app/services/sync_state.py` — read/write per-table sync cursor in `settings`
- `backend/scripts/README.md` — how to run sync

**Modified:**
- `backend/app/models/turtle.py` — add columns to Turtle and Capture
- `backend/app/models/encounter.py` — add survey_fk, plot_fk columns
- `backend/app/models/__init__.py` — export Survey, Plot
- `backend/app/services/airtable.py` — full rewrite (replace stub)
- `backend/app/api/sync.py` — add per-table endpoints, dry-run flag
- `backend/app/config.py` — add `airtable_*` table-name defaults (`Turtles`, `Encounters`, `Surveys`, `Plots`)
- `backend/.env` — add table names if not already there

**One-time migration:**
- `backend/scripts/recreate_db.py` — drop & recreate tables (dev DB has only 17 submissions + 3 test turtles, all disposable)

---

## Task 1: Extend the data model

**Files:**
- Modify: `backend/app/models/turtle.py`
- Modify: `backend/app/models/encounter.py`
- Create: `backend/app/models/survey.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Add new columns to `Turtle`**

In `backend/app/models/turtle.py`, inside class `Turtle`, after `carapace_flare`:

```python
    nickname: Mapped[Optional[str]] = mapped_column(default=None)
    health_status: Mapped[Optional[str]] = mapped_column(default=None)
    residence_status: Mapped[Optional[str]] = mapped_column(default=None)
    identifying_marks: Mapped[Optional[str]] = mapped_column(Text, default=None)
    eye_color: Mapped[Optional[str]] = mapped_column(default=None)
    plastron_depression: Mapped[Optional[str]] = mapped_column(default=None)
    plots_text: Mapped[Optional[str]] = mapped_column(default=None)
```

- [ ] **Step 2: Add columns to `Capture`**

In the same file, inside class `Capture`, after `keypoint_count`:

```python
    airtable_attachment_id: Mapped[Optional[str]] = mapped_column(default=None, unique=True, index=True)
    airtable_field_name: Mapped[Optional[str]] = mapped_column(default=None)  # 'Carapace Top', 'Plastron', etc.
    source: Mapped[str] = mapped_column(default="app")  # 'app' | 'airtable'
```

- [ ] **Step 3: Add columns to `Encounter`**

In `backend/app/models/encounter.py`, inside class `Encounter`, after `notes`:

```python
    survey_fk: Mapped[Optional[int]] = mapped_column(
        ForeignKey("surveys.id", ondelete="SET NULL"), default=None
    )
    plot_fk: Mapped[Optional[int]] = mapped_column(
        ForeignKey("plots.id", ondelete="SET NULL"), default=None
    )
```

(Keep the existing `survey_id` and `plot_name` string columns — they remain as denormalized handles.)

- [ ] **Step 4: Create `Survey` and `Plot` models**

Create `backend/app/models/survey.py`:

```python
from datetime import datetime
from typing import Optional

from sqlalchemy import Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Plot(Base):
    __tablename__ = "plots"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    airtable_record_id: Mapped[Optional[str]] = mapped_column(
        default=None, unique=True, index=True
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[Optional[str]] = mapped_column(default=None, index=True)
    airtable_record_id: Mapped[Optional[str]] = mapped_column(
        default=None, unique=True, index=True
    )
    survey_datetime: Mapped[Optional[datetime]] = mapped_column(default=None)
    temperature: Mapped[Optional[float]] = mapped_column(default=None)
    surveyors: Mapped[Optional[str]] = mapped_column(default=None)  # comma-joined
    conditions: Mapped[Optional[str]] = mapped_column(default=None)  # comma-joined
    turtle_day: Mapped[Optional[str]] = mapped_column(default=None)
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(insert_default=func.now(), onupdate=func.now())
```

- [ ] **Step 5: Export new models**

In `backend/app/models/__init__.py`, add:

```python
from app.models.survey import Plot, Survey
```

(Match existing import style in that file.)

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/
git commit -m "feat(backend): add Survey/Plot models and extend Turtle/Encounter/Capture for Airtable sync"
```

---

## Task 2: Recreate dev DB with new schema

**Files:**
- Create: `backend/scripts/recreate_db.py`

The existing dev DB has 17 submissions + small test data. SQLAlchemy's `create_all` won't add columns to existing tables, and we have no Alembic. For dev we drop & recreate.

- [ ] **Step 1: Write the recreate script**

Create `backend/scripts/recreate_db.py`:

```python
"""Drop & recreate all tables. Dev only — destroys data."""
import sys

from app.database import Base, engine, create_tables
# Import all models so they register with Base.metadata
from app.models import (  # noqa: F401
    Turtle, Capture, MatchResult, Encounter, Survey, Plot,
    Submission, Job, Setting,
)


def main():
    if "--yes" not in sys.argv:
        print("This will DROP all tables. Pass --yes to confirm.")
        sys.exit(1)
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating tables...")
    create_tables()
    print("Done.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

```bash
cd backend && .venv/bin/python -m scripts.recreate_db --yes
```

Expected: `Dropping all tables... Creating tables... Done.` and then in psql:

```bash
.venv/bin/python -c "from sqlalchemy import inspect; from app.database import engine; print(sorted(inspect(engine).get_table_names()))"
```

Expected: list includes `surveys`, `plots`, plus all original tables.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/recreate_db.py
git commit -m "chore(backend): add recreate_db script for dev schema resets"
```

---

## Task 3: Configure Airtable settings

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/.env` (manual — record actual values)

- [ ] **Step 1: Add Surveys/Plots table-name settings**

In `backend/app/config.py`, replace the four Airtable lines with:

```python
    # Airtable sync
    airtable_token: Optional[str] = None
    airtable_base_id: Optional[str] = None
    airtable_turtles_table: str = "Turtles"
    airtable_encounters_table: str = "Encounters"
    airtable_surveys_table: str = "Surveys"
    airtable_plots_table: str = "Plots"
```

- [ ] **Step 2: Verify env loads**

```bash
cd backend && .venv/bin/python -c "from app.config import settings; print(settings.airtable_base_id, settings.airtable_surveys_table)"
```

Expected: `appd4ajEdEAQ7bF4C Surveys`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py
git commit -m "feat(backend): add Airtable table-name settings (defaults match the Wallkill base)"
```

---

## Task 4: Low-level Airtable HTTP client

**Files:**
- Create: `backend/app/services/airtable_client.py`

One helper handles pagination, rate-limit retry, dry-run logging, and attachment upload. Other services use it.

- [ ] **Step 1: Write the client**

Create `backend/app/services/airtable_client.py`:

```python
"""Thin HTTP wrapper around the Airtable REST API."""
import logging
import time
from typing import Iterator, Optional

import requests

from app.config import settings

logger = logging.getLogger(__name__)

API_ROOT = "https://api.airtable.com/v0"
CONTENT_ROOT = "https://content.airtable.com/v0"


class AirtableClient:
    def __init__(self, token: Optional[str] = None, base_id: Optional[str] = None,
                 dry_run: bool = False):
        self.token = token or settings.airtable_token
        self.base_id = base_id or settings.airtable_base_id
        self.dry_run = dry_run
        if not self.token or not self.base_id:
            raise RuntimeError("AIRTABLE_TOKEN and AIRTABLE_BASE_ID must be set")

    @property
    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def _table_url(self, table: str) -> str:
        return f"{API_ROOT}/{self.base_id}/{table}"

    def _request(self, method: str, url: str, **kw) -> requests.Response:
        for attempt in range(5):
            resp = requests.request(method, url, headers=self._headers, timeout=30, **kw)
            if resp.status_code == 429:
                wait = 2 ** attempt
                logger.warning(f"429 from Airtable, sleeping {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        raise RuntimeError("Airtable rate-limited after 5 retries")

    def iter_records(self, table: str, modified_since: Optional[str] = None,
                     fields: Optional[list[str]] = None) -> Iterator[dict]:
        params: dict = {"pageSize": 100}
        if modified_since:
            params["filterByFormula"] = f"IS_AFTER(LAST_MODIFIED_TIME(), '{modified_since}')"
        if fields:
            for f in fields:
                params.setdefault("fields[]", []).append(f)
        offset: Optional[str] = None
        while True:
            if offset:
                params["offset"] = offset
            resp = self._request("GET", self._table_url(table), params=params)
            data = resp.json()
            for rec in data.get("records", []):
                yield rec
            offset = data.get("offset")
            if not offset:
                break

    def create_record(self, table: str, fields: dict) -> Optional[dict]:
        if self.dry_run:
            logger.info(f"[dry-run] CREATE {table} fields={list(fields.keys())}")
            return None
        resp = self._request("POST", self._table_url(table), json={"fields": fields})
        return resp.json()

    def upload_attachment(self, record_id: str, field_name: str,
                          filename: str, content_type: str, file_bytes: bytes) -> Optional[dict]:
        """Upload a file attachment using the v0 content endpoint."""
        if self.dry_run:
            logger.info(f"[dry-run] UPLOAD {filename} -> {record_id}.{field_name}")
            return None
        import base64
        url = f"{CONTENT_ROOT}/{self.base_id}/{record_id}/{field_name}/uploadAttachment"
        body = {
            "contentType": content_type,
            "filename": filename,
            "file": base64.b64encode(file_bytes).decode(),
        }
        resp = self._request("POST", url, json=body)
        return resp.json()
```

- [ ] **Step 2: Smoke test the client**

```bash
cd backend && .venv/bin/python -c "
from app.services.airtable_client import AirtableClient
c = AirtableClient()
n = sum(1 for _ in c.iter_records('Plots'))
print(f'plots fetched: {n}')
"
```

Expected: a small number (the Plots table is small).

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/airtable_client.py
git commit -m "feat(backend): low-level Airtable HTTP client with pagination + retry"
```

---

## Task 5: Sync state cursor (for incremental pulls)

**Files:**
- Create: `backend/app/services/sync_state.py`

- [ ] **Step 1: Write the helper**

Create `backend/app/services/sync_state.py`:

```python
"""Per-table sync cursor stored in the `settings` table."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Setting

CURSOR_KEY = "airtable_sync.{table}.cursor"


def get_cursor(db: Session, table: str) -> Optional[str]:
    row = db.query(Setting).filter(Setting.key == CURSOR_KEY.format(table=table)).first()
    return row.value if row else None


def set_cursor(db: Session, table: str, iso_ts: Optional[str] = None) -> None:
    iso_ts = iso_ts or datetime.now(timezone.utc).isoformat()
    key = CURSOR_KEY.format(table=table)
    row = db.query(Setting).filter(Setting.key == key).first()
    if row:
        row.value = iso_ts
    else:
        db.add(Setting(key=key, value=iso_ts))
    db.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/sync_state.py
git commit -m "feat(backend): per-table sync cursor for incremental Airtable pulls"
```

---

## Task 6: Rewrite the sync service — Plots and Surveys (no FK dependencies)

**Files:**
- Modify: `backend/app/services/airtable.py` (replace entire file)

This task replaces the stub with a class that has explicit per-table methods. Plots and Surveys have no FK dependencies, so they go first.

- [ ] **Step 1: Write the new service skeleton + Plots + Surveys**

Replace `backend/app/services/airtable.py` entirely with:

```python
"""Bidirectional Airtable sync service."""
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Encounter, Plot, Survey, Turtle
from app.services.airtable_client import AirtableClient
from app.services.sync_state import get_cursor, set_cursor

logger = logging.getLogger(__name__)


def _join_multi(val) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) or None
    return str(val)


def _parse_date(val) -> Optional[datetime]:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


class AirtableSync:
    def __init__(self, db: Session, dry_run: bool = False):
        self.db = db
        self.client = AirtableClient(dry_run=dry_run)
        self.dry_run = dry_run
        from app.config import settings
        self.tables = {
            "plots": settings.airtable_plots_table,
            "turtles": settings.airtable_turtles_table,
            "surveys": settings.airtable_surveys_table,
            "encounters": settings.airtable_encounters_table,
        }

    # ---------- Plots ----------

    def pull_plots(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "plots") if incremental else None
        created = updated = 0
        for rec in self.client.iter_records(self.tables["plots"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]
            existing = self.db.query(Plot).filter(Plot.airtable_record_id == rid).first()
            if existing:
                existing.name = f.get("Plot Location", existing.name)
                existing.notes = f.get("Notes")
                existing.last_synced_at = datetime.now()
                updated += 1
            else:
                if not f.get("Plot Location"):
                    continue
                self.db.add(Plot(
                    name=f["Plot Location"], notes=f.get("Notes"),
                    airtable_record_id=rid, last_synced_at=datetime.now(),
                ))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "plots")
        return {"created": created, "updated": updated}

    # ---------- Surveys ----------

    def pull_surveys(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "surveys") if incremental else None
        created = updated = 0
        for rec in self.client.iter_records(self.tables["surveys"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]
            existing = self.db.query(Survey).filter(Survey.airtable_record_id == rid).first()
            data = dict(
                external_id=f.get("Survey ID"),
                survey_datetime=_parse_date(f.get("Survey Date & Time")),
                temperature=f.get("Temperature"),
                surveyors=_join_multi(f.get("Surveyor")),
                conditions=_join_multi(f.get("Conditions")),
                turtle_day=f.get("Turtle Day"),
                notes=f.get("Notes"),
                last_synced_at=datetime.now(),
            )
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                self.db.add(Survey(airtable_record_id=rid, **data))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "surveys")
        return {"created": created, "updated": updated}

    # ---------- (More to come in next tasks) ----------
```

- [ ] **Step 2: Smoke test plots + surveys pull**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal
from app.services.airtable import AirtableSync
db = SessionLocal()
print('plots:', AirtableSync(db).pull_plots())
print('surveys:', AirtableSync(db).pull_surveys())
"
```

Expected: nonzero `created` for both, `updated: 0` on first run.

- [ ] **Step 3: Verify in DB**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal; from app.models import Plot, Survey
db = SessionLocal()
print(f'plots in db: {db.query(Plot).count()}')
print(f'surveys in db: {db.query(Survey).count()}')
print('first 3 surveys:')
for s in db.query(Survey).limit(3): print(f'  {s.external_id} | {s.survey_datetime} | {s.surveyors}')
"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/airtable.py
git commit -m "feat(backend): rewrite Airtable sync service; pull Plots and Surveys"
```

---

## Task 7: Pull Turtles

**Files:**
- Modify: `backend/app/services/airtable.py`

- [ ] **Step 1: Add `pull_turtles` method**

Append to `class AirtableSync`:

```python
    # ---------- Turtles ----------

    def pull_turtles(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "turtles") if incremental else None
        created = updated = 0
        for rec in self.client.iter_records(self.tables["turtles"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]
            first_seen = _parse_date(f.get("Date First Identified"))
            data = dict(
                external_id=f.get("Turtle ID") or f"AT-{rid[:8]}",
                name=f.get("Nickname"),
                nickname=f.get("Nickname"),
                site="wallkill",
                first_seen=first_seen.date() if first_seen else datetime.now().date(),
                notes=f.get("Notes"),
                species=f.get("Species"),
                gender=f.get("Gender"),
                pattern=_join_multi(f.get("Pattern")),
                carapace_flare=_join_multi(f.get("Carapace Flare")),
                health_status=f.get("Health Status"),
                residence_status=f.get("Residence Status"),
                identifying_marks=_join_multi(f.get("Identifying Marks")),
                eye_color=_join_multi(f.get("Eye Color")),
                plastron_depression=_join_multi(f.get("Plastron Depression")),
                plots_text=f.get("Plots"),
                last_synced_at=datetime.now(),
            )
            existing = self.db.query(Turtle).filter(Turtle.airtable_record_id == rid).first()
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                self.db.add(Turtle(airtable_record_id=rid, **data))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "turtles")
        return {"created": created, "updated": updated}
```

- [ ] **Step 2: Smoke test**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal
from app.services.airtable import AirtableSync
from app.models import Turtle
db = SessionLocal()
print('turtles:', AirtableSync(db).pull_turtles())
print(f'turtles in db: {db.query(Turtle).count()}')
sample = db.query(Turtle).limit(2).all()
for t in sample: print(f'  {t.external_id} {t.nickname} site={t.site} pattern={t.pattern}')
"
```

Expected: turtles imported with `site='wallkill'` and multi-selects joined.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/airtable.py
git commit -m "feat(backend): pull Turtles from Airtable with full field mapping"
```

---

## Task 8: Pull Encounters (resolves FKs to Turtles, Plots, Surveys)

**Files:**
- Modify: `backend/app/services/airtable.py`

- [ ] **Step 1: Add lookup helpers + `pull_encounters`**

Append to `AirtableSync`:

```python
    def _turtle_id_for(self, airtable_rid: str) -> Optional[int]:
        t = self.db.query(Turtle).filter(Turtle.airtable_record_id == airtable_rid).first()
        return t.id if t else None

    def _survey_fk_for(self, airtable_rid: str) -> Optional[int]:
        s = self.db.query(Survey).filter(Survey.airtable_record_id == airtable_rid).first()
        return s.id if s else None

    def _plot_fk_for(self, airtable_rid: str) -> Optional[int]:
        p = self.db.query(Plot).filter(Plot.airtable_record_id == airtable_rid).first()
        return p.id if p else None

    # ---------- Encounters ----------

    def pull_encounters(self, incremental: bool = False) -> dict:
        cursor = get_cursor(self.db, "encounters") if incremental else None
        created = updated = skipped = 0
        for rec in self.client.iter_records(self.tables["encounters"], modified_since=cursor):
            rid = rec["id"]
            f = rec["fields"]

            turtle_links = f.get("Turtle ID") or []
            turtle_id = self._turtle_id_for(turtle_links[0]) if turtle_links else None
            if turtle_id is None:
                skipped += 1
                continue

            plot_links = f.get("Plot") or []
            plot_fk = self._plot_fk_for(plot_links[0]) if plot_links else None
            survey_links = f.get("Survey ID") or []
            survey_fk = self._survey_fk_for(survey_links[0]) if survey_links else None

            plot_lookup = f.get("Plot Location (from Plots)") or []
            survey_lookup = f.get("Survey ID (from Survey ID)") or []
            data = dict(
                turtle_id=turtle_id,
                external_id=f.get("Encounter ID"),
                encounter_date=_parse_date(f.get("Date")),
                plot_name=plot_lookup[0] if plot_lookup else None,
                plot_fk=plot_fk,
                survey_id=survey_lookup[0] if survey_lookup else None,
                survey_fk=survey_fk,
                identified=f.get("Identified"),
                health_status=_join_multi(f.get("Health Status")),
                behavior=_join_multi(f.get("Behavior")),
                notes=f.get("Notes"),
                last_synced_at=datetime.now(),
            )
            existing = self.db.query(Encounter).filter(Encounter.airtable_record_id == rid).first()
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                self.db.add(Encounter(airtable_record_id=rid, **data))
                created += 1
        self.db.commit()
        if not self.dry_run:
            set_cursor(self.db, "encounters")
        return {"created": created, "updated": updated, "skipped_no_turtle": skipped}
```

- [ ] **Step 2: Smoke test**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal; from app.services.airtable import AirtableSync; from app.models import Encounter
db = SessionLocal()
print('encounters:', AirtableSync(db).pull_encounters())
print(f'encounters in db: {db.query(Encounter).count()}')
e = db.query(Encounter).first()
if e: print(f'sample: {e.external_id} | turtle_id={e.turtle_id} | plot={e.plot_name} | survey={e.survey_id}')
"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/airtable.py
git commit -m "feat(backend): pull Encounters and resolve turtle/plot/survey FKs"
```

---

## Task 9: Image attachments — download + SIFT extraction

**Files:**
- Modify: `backend/app/services/airtable.py`
- Create directory: `backend/data/captures/turtles/`, `backend/data/captures/encounters/`

For every attachment on Turtles + Encounters: download once (idempotent on `airtable_attachment_id`), write to disk, run SIFT, create Capture row.

- [ ] **Step 1: Add image-import method**

Add these imports at the top of `airtable.py`:

```python
import re
from pathlib import Path

import cv2
import numpy as np
import requests as _requests

from app.config import settings
from app.models import Capture
from app.services.sift import SiftService
```

Then append to `AirtableSync`:

```python
    ATTACHMENT_FIELDS_TURTLE = [
        "Carapace Top", "Carapace Left", "Carapace Right",
        "Plastron", "Front", "Rear",
    ]
    ATTACHMENT_FIELDS_ENCOUNTER = [
        "Carapace Top", "Carapace Left", "Carapace Right",
        "Plastron", "Front", "Back", "Site View",
    ]
    IPHONE_NAME_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})\s+(\d{2})\.(\d{2})\.(\d{2})")

    def _parse_filename_datetime(self, filename: str) -> Optional[datetime]:
        m = self.IPHONE_NAME_RE.search(filename or "")
        if not m:
            return None
        try:
            y, mo, d, h, mi, s = (int(x) for x in m.groups())
            return datetime(y, mo, d, h, mi, s)
        except ValueError:
            return None

    def _import_attachment(
        self, attachment: dict, image_type: str, *,
        turtle_id: Optional[int] = None, encounter_id: Optional[int] = None,
        sift: Optional[SiftService] = None,
    ) -> Optional[Capture]:
        att_id = attachment["id"]
        if self.db.query(Capture).filter(Capture.airtable_attachment_id == att_id).first():
            return None  # already imported

        filename = attachment.get("filename", f"{att_id}.jpg")
        url = attachment["url"]
        try:
            content = _requests.get(url, timeout=60).content
        except _requests.RequestException as e:
            logger.error(f"download failed for {att_id}: {e}")
            return None

        subdir = "turtles" if turtle_id else "encounters"
        owner_id = turtle_id or encounter_id
        out_dir = settings.data_dir / "captures" / subdir / str(owner_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{att_id}_{filename}"
        out_path.write_bytes(content)

        # SIFT extraction
        kp_blob = desc_blob = None
        kp_count = 0
        if sift:
            arr = np.frombuffer(content, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                feat = sift.extract_features(img)
                if feat:
                    kp_blob, desc_blob = feat.serialize()
                    kp_count = feat.keypoint_count

        captured_dt = self._parse_filename_datetime(filename)
        cap = Capture(
            turtle_id=turtle_id,
            encounter_id=encounter_id,
            image_type=image_type.lower().replace(" ", "_"),
            image_path=str(out_path),
            original_filename=filename,
            captured_date=captured_dt.date() if captured_dt else None,
            exif_datetime=captured_dt,
            keypoints_data=kp_blob,
            descriptors_data=desc_blob,
            keypoint_count=kp_count,
            airtable_attachment_id=att_id,
            airtable_field_name=image_type,
            source="airtable",
            last_synced_at=datetime.now(),
        )
        self.db.add(cap)
        return cap

    def pull_attachments(self, with_sift: bool = True) -> dict:
        sift = SiftService() if with_sift else None
        new_turtle_caps = new_enc_caps = 0

        # Turtle attachments
        for t in self.db.query(Turtle).filter(Turtle.airtable_record_id.isnot(None)).all():
            for rec in self.client.iter_records(
                self.tables["turtles"],
                fields=self.ATTACHMENT_FIELDS_TURTLE,
            ):
                if rec["id"] != t.airtable_record_id:
                    continue
                f = rec["fields"]
                for field in self.ATTACHMENT_FIELDS_TURTLE:
                    for att in f.get(field, []) or []:
                        if not att.get("type", "").startswith("image/"):
                            continue
                        cap = self._import_attachment(att, field, turtle_id=t.id, sift=sift)
                        if cap is not None:
                            new_turtle_caps += 1
                break
            self.db.commit()

        # Encounter attachments — same shape
        for e in self.db.query(Encounter).filter(Encounter.airtable_record_id.isnot(None)).all():
            for rec in self.client.iter_records(
                self.tables["encounters"],
                fields=self.ATTACHMENT_FIELDS_ENCOUNTER,
            ):
                if rec["id"] != e.airtable_record_id:
                    continue
                f = rec["fields"]
                for field in self.ATTACHMENT_FIELDS_ENCOUNTER:
                    for att in f.get(field, []) or []:
                        if not att.get("type", "").startswith("image/"):
                            continue
                        cap = self._import_attachment(
                            att, field, turtle_id=e.turtle_id, encounter_id=e.id, sift=sift,
                        )
                        if cap is not None:
                            new_enc_caps += 1
                break
            self.db.commit()
        return {"turtle_captures": new_turtle_caps, "encounter_captures": new_enc_caps}
```

> **Performance note:** the inner loop above re-iterates the table per row, which is O(N²). For first-pass correctness this is fine (small base). Step 2 of this task replaces it with a one-pass index.

- [ ] **Step 2: Replace O(N²) loop with one-pass per table**

In `pull_attachments`, replace both `for t in ...` and `for e in ...` blocks with this single-pass form (apply the same shape twice — once per table, with appropriate field list and owner lookup):

```python
        # Build {airtable_record_id -> Turtle} index
        t_idx = {t.airtable_record_id: t for t in self.db.query(Turtle)
                 .filter(Turtle.airtable_record_id.isnot(None)).all()}
        for rec in self.client.iter_records(
            self.tables["turtles"], fields=self.ATTACHMENT_FIELDS_TURTLE,
        ):
            t = t_idx.get(rec["id"])
            if not t:
                continue
            for field in self.ATTACHMENT_FIELDS_TURTLE:
                for att in rec["fields"].get(field, []) or []:
                    if not att.get("type", "").startswith("image/"):
                        continue
                    cap = self._import_attachment(att, field, turtle_id=t.id, sift=sift)
                    if cap is not None:
                        new_turtle_caps += 1
            self.db.commit()

        e_idx = {e.airtable_record_id: e for e in self.db.query(Encounter)
                 .filter(Encounter.airtable_record_id.isnot(None)).all()}
        for rec in self.client.iter_records(
            self.tables["encounters"], fields=self.ATTACHMENT_FIELDS_ENCOUNTER,
        ):
            e = e_idx.get(rec["id"])
            if not e:
                continue
            for field in self.ATTACHMENT_FIELDS_ENCOUNTER:
                for att in rec["fields"].get(field, []) or []:
                    if not att.get("type", "").startswith("image/"):
                        continue
                    cap = self._import_attachment(
                        att, field, turtle_id=e.turtle_id, encounter_id=e.id, sift=sift,
                    )
                    if cap is not None:
                        new_enc_caps += 1
            self.db.commit()
```

- [ ] **Step 3: Smoke test on a tiny subset (no SIFT)**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal; from app.services.airtable import AirtableSync; from app.models import Capture
db = SessionLocal()
result = AirtableSync(db).pull_attachments(with_sift=False)
print(result)
print(f'captures in db: {db.query(Capture).count()}')
"
```

Expected: nonzero `turtle_captures` and `encounter_captures`; `data/captures/...` populated.

- [ ] **Step 4: Full run with SIFT (slow — 10–30 min depending on count)**

```bash
cd backend && time .venv/bin/python -c "
from app.database import SessionLocal; from app.services.airtable import AirtableSync
db = SessionLocal()
print(AirtableSync(db).pull_attachments(with_sift=True))
"
```

Expected: counts match the no-SIFT run; `Capture.keypoint_count > 0` for most rows.

- [ ] **Step 5: Verify SIFT was extracted**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal; from app.models import Capture
db = SessionLocal()
total = db.query(Capture).count()
with_kp = db.query(Capture).filter(Capture.keypoint_count > 0).count()
print(f'{with_kp}/{total} captures have SIFT keypoints')
"
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/airtable.py
git commit -m "feat(backend): pull image attachments from Airtable + extract SIFT features"
```

---

## Task 10: `pull_all` orchestrator + push methods

**Files:**
- Modify: `backend/app/services/airtable.py`

- [ ] **Step 1: Add `pull_all` and the push methods**

Append to `AirtableSync`:

```python
    def pull_all(self, incremental: bool = False, with_images: bool = True,
                 with_sift: bool = True) -> dict:
        """Full ordered pull: plots → surveys → turtles → encounters → attachments."""
        out = {}
        out["plots"] = self.pull_plots(incremental=incremental)
        out["surveys"] = self.pull_surveys(incremental=incremental)
        out["turtles"] = self.pull_turtles(incremental=incremental)
        out["encounters"] = self.pull_encounters(incremental=incremental)
        if with_images:
            out["attachments"] = self.pull_attachments(with_sift=with_sift)
        return out

    # ---------- Push (local → Airtable) ----------

    def push_new_turtles(self) -> dict:
        pushed = 0
        for t in self.db.query(Turtle).filter(Turtle.airtable_record_id.is_(None)).all():
            fields = {"Turtle ID": t.external_id}
            if t.nickname or t.name:
                fields["Nickname"] = t.nickname or t.name
            if t.gender:
                fields["Gender"] = t.gender
            if t.first_seen:
                fields["Date First Identified"] = t.first_seen.isoformat()
            if t.notes:
                fields["Notes"] = t.notes
            if t.species:
                fields["Species"] = t.species
            created = self.client.create_record(self.tables["turtles"], fields)
            if created:
                t.airtable_record_id = created["id"]
                t.last_synced_at = datetime.now()
                pushed += 1
                self.db.commit()
        return {"pushed": pushed}

    def push_new_encounters(self) -> dict:
        pushed = 0
        for e in self.db.query(Encounter).filter(Encounter.airtable_record_id.is_(None)).all():
            turtle = self.db.query(Turtle).filter(Turtle.id == e.turtle_id).first()
            if not turtle or not turtle.airtable_record_id:
                continue  # turtle hasn't been pushed yet — skip this round
            fields = {"Turtle ID": [turtle.airtable_record_id]}
            if e.encounter_date:
                fields["Date"] = e.encounter_date.isoformat()
            if e.identified:
                fields["Identified"] = e.identified
            if e.health_status:
                fields["Health Status"] = [s.strip() for s in e.health_status.split(",") if s.strip()]
            if e.behavior:
                fields["Behavior"] = [s.strip() for s in e.behavior.split(",") if s.strip()]
            if e.notes:
                fields["Notes"] = e.notes
            created = self.client.create_record(self.tables["encounters"], fields)
            if created:
                e.airtable_record_id = created["id"]
                e.last_synced_at = datetime.now()
                pushed += 1
                self.db.commit()
                # After encounter exists, push its captures as attachments
                self._push_captures_for_encounter(e)
        return {"pushed": pushed}

    def _push_captures_for_encounter(self, encounter: Encounter) -> int:
        if not encounter.airtable_record_id:
            return 0
        n = 0
        caps = (self.db.query(Capture)
                .filter(Capture.encounter_id == encounter.id)
                .filter(Capture.airtable_attachment_id.is_(None))
                .filter(Capture.source == "app")
                .all())
        for cap in caps:
            field_name = (cap.airtable_field_name
                          or cap.image_type.replace("_", " ").title())
            try:
                file_bytes = Path(cap.image_path).read_bytes()
            except OSError:
                continue
            uploaded = self.client.upload_attachment(
                encounter.airtable_record_id, field_name,
                cap.original_filename, "image/jpeg", file_bytes,
            )
            if uploaded:
                # Airtable returns the new attachment list under the field; pick the new id
                attachments = uploaded.get("fields", {}).get(field_name, [])
                if attachments:
                    cap.airtable_attachment_id = attachments[-1].get("id")
                    cap.last_synced_at = datetime.now()
                    self.db.commit()
                    n += 1
        return n

    def push_all(self) -> dict:
        return {
            "turtles": self.push_new_turtles(),
            "encounters": self.push_new_encounters(),
        }

    def sync(self, incremental: bool = False, with_images: bool = True,
             with_sift: bool = True) -> dict:
        return {
            "pull": self.pull_all(incremental=incremental, with_images=with_images,
                                  with_sift=with_sift),
            "push": self.push_all(),
        }
```

- [ ] **Step 2: Smoke test `pull_all` (no images, since attachments already imported)**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal; from app.services.airtable import AirtableSync
db = SessionLocal()
print(AirtableSync(db).pull_all(incremental=True, with_images=False))
"
```

Expected: small `created/updated` counts (only changed records).

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/airtable.py
git commit -m "feat(backend): orchestrate pull_all and push new turtles/encounters/captures"
```

---

## Task 11: CLI script

**Files:**
- Create: `backend/scripts/__init__.py` (empty)
- Create: `backend/scripts/sync_airtable.py`
- Create: `backend/scripts/README.md`

- [ ] **Step 1: Empty marker**

```bash
touch backend/scripts/__init__.py
```

- [ ] **Step 2: CLI script**

Create `backend/scripts/sync_airtable.py`:

```python
"""CLI wrapper around AirtableSync."""
import argparse
import json
import logging
import sys

from app.database import SessionLocal
from app.services.airtable import AirtableSync


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync local DB with Airtable.")
    parser.add_argument("action", choices=["pull", "push", "sync"])
    parser.add_argument("--tables", help="comma-separated subset of: plots,surveys,turtles,encounters,attachments")
    parser.add_argument("--incremental", action="store_true",
                        help="only fetch records modified since last cursor")
    parser.add_argument("--no-images", action="store_true",
                        help="skip image attachment download")
    parser.add_argument("--no-sift", action="store_true",
                        help="download images but skip SIFT extraction")
    parser.add_argument("--dry-run", action="store_true",
                        help="log writes instead of performing them (push only)")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    db = SessionLocal()
    sync = AirtableSync(db, dry_run=args.dry_run)

    tables = set((args.tables or "plots,surveys,turtles,encounters,attachments").split(","))
    result: dict = {}

    if args.action in ("pull", "sync"):
        if "plots" in tables:      result["plots"] = sync.pull_plots(incremental=args.incremental)
        if "surveys" in tables:    result["surveys"] = sync.pull_surveys(incremental=args.incremental)
        if "turtles" in tables:    result["turtles"] = sync.pull_turtles(incremental=args.incremental)
        if "encounters" in tables: result["encounters"] = sync.pull_encounters(incremental=args.incremental)
        if "attachments" in tables and not args.no_images:
            result["attachments"] = sync.pull_attachments(with_sift=not args.no_sift)

    if args.action in ("push", "sync"):
        result["push"] = sync.push_all()

    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: README**

Create `backend/scripts/README.md`:

```markdown
# Sync scripts

## `sync_airtable.py`

Pull from / push to Airtable. Idempotent.

### Usage

```bash
cd backend
.venv/bin/python -m scripts.sync_airtable pull               # full pull
.venv/bin/python -m scripts.sync_airtable pull --incremental # only modified rows
.venv/bin/python -m scripts.sync_airtable pull --no-images   # metadata only
.venv/bin/python -m scripts.sync_airtable push               # push new local turtles + encounters
.venv/bin/python -m scripts.sync_airtable sync               # pull then push
.venv/bin/python -m scripts.sync_airtable pull --tables turtles,encounters
```

### How edits flow back

- Edits made in Airtable are pulled by `pull` (overwrites local fields for matched
  records). Run on a cron or by hand.
- New rows created in the app push to Airtable on `push`. Once a row has an
  `airtable_record_id` it will not be re-pushed.
- New image captures attached to an encounter created in the app are uploaded
  to Airtable when that encounter is pushed.

### Cron example (every 15 min)

```cron
*/15 * * * * cd /path/to/box-turtle-id/backend && .venv/bin/python -m scripts.sync_airtable sync --incremental >> /var/log/turtle-sync.log 2>&1
```
```

- [ ] **Step 4: Verify CLI runs**

```bash
cd backend && .venv/bin/python -m scripts.sync_airtable pull --tables plots --incremental
```

Expected: prints a small JSON result.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/
git commit -m "feat(backend): CLI script for Airtable sync (pull/push/sync)"
```

---

## Task 12: Update HTTP endpoint to expose options

**Files:**
- Modify: `backend/app/api/sync.py`

- [ ] **Step 1: Replace endpoint**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.airtable import AirtableSync

router = APIRouter()


@router.post("/sync/airtable/pull")
async def pull(
    incremental: bool = Query(False),
    include_images: bool = Query(True),
    with_sift: bool = Query(True),
    db: Session = Depends(get_db),
):
    return AirtableSync(db).pull_all(
        incremental=incremental, with_images=include_images, with_sift=with_sift
    )


@router.post("/sync/airtable/push")
async def push(db: Session = Depends(get_db)):
    return AirtableSync(db).push_all()


@router.post("/sync/airtable")
async def full_sync(
    incremental: bool = Query(False),
    include_images: bool = Query(True),
    with_sift: bool = Query(True),
    db: Session = Depends(get_db),
):
    return AirtableSync(db).sync(
        incremental=incremental, with_images=include_images, with_sift=with_sift
    )
```

- [ ] **Step 2: Restart backend and hit the endpoint**

The backend is running in the background with reload. Hit:

```bash
curl -s -X POST 'http://127.0.0.1:8000/sync/airtable/pull?incremental=true&include_images=false' | python3 -m json.tool
```

Expected: small JSON response.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/sync.py
git commit -m "feat(backend): expose sync pull/push/full options on HTTP endpoint"
```

---

## Task 13: End-to-end verification

- [ ] **Step 1: Print final counts**

```bash
cd backend && .venv/bin/python -c "
from app.database import SessionLocal
from app.models import Turtle, Encounter, Survey, Plot, Capture
db = SessionLocal()
for M in (Plot, Survey, Turtle, Encounter, Capture):
    print(f'{M.__name__}: {db.query(M).count()}')
print('Captures with SIFT:', db.query(Capture).filter(Capture.keypoint_count > 0).count())
print('Captures linked to Turtles:', db.query(Capture).filter(Capture.turtle_id.isnot(None)).count())
print('Captures linked to Encounters:', db.query(Capture).filter(Capture.encounter_id.isnot(None)).count())
"
```

- [ ] **Step 2: Re-run pull and confirm idempotency**

```bash
cd backend && .venv/bin/python -m scripts.sync_airtable pull --no-images
```

Expected: `created: 0` everywhere; `updated` counts equal to total records (because we still touch `last_synced_at`).

- [ ] **Step 3: Confirm a sample Capture round-trip**

```bash
cd backend && .venv/bin/python -c "
from pathlib import Path
from app.database import SessionLocal; from app.models import Capture
c = SessionLocal().query(Capture).filter(Capture.airtable_attachment_id.isnot(None)).first()
print(f'image: {c.image_path} exists={Path(c.image_path).exists()} size={Path(c.image_path).stat().st_size if Path(c.image_path).exists() else 0}')
print(f'sift_keypoints: {c.keypoint_count}, type={c.image_type}, source={c.source}')
"
```

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: Airtable bidirectional sync — initial import complete"
```

---

## Self-review notes

- All Airtable field names referenced in code match the schema dump (Turtles: 24 fields, Encounters: 22, Surveys: 12, Plots: 6).
- Multi-select join uses comma-space; reverse split in push uses `, ` strip — round-trips cleanly.
- FK resolution order respected: Plots → Surveys → Turtles → Encounters → Attachments.
- `airtable_attachment_id` is the dedup key for captures; `airtable_record_id` is the dedup key for the four entity tables.
- Existing `submissions`, `jobs`, `match_results` tables untouched.
- Push only creates; never modifies existing Airtable records (matches user's stated workflow: app creates, Airtable edits).
- Type consistency: `pull_plots`, `pull_surveys`, `pull_turtles`, `pull_encounters`, `pull_attachments`, `pull_all`, `push_new_turtles`, `push_new_encounters`, `push_all`, `sync` — all named consistently and called consistently from CLI and HTTP layer.
- One known limitation: full `pull_attachments` re-iterates the table even if cursor is set; refining to cursor-aware attachment sync deferred (small base, OK for now).
